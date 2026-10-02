# frozen_string_literal: true

require 'zip'
require 'nokogiri'
require 'stringio'

module Reporter
  module Docx
    # Walks the generated document.xml, finds plain-text runs containing
    # http(s) URLs, and rewrites them as real <w:hyperlink> elements with a
    # matching relationship entry in word/_rels/document.xml.rels. Text that
    # is already inside an existing <w:hyperlink> ancestor is left alone.
    class HyperlinkPostprocessor
      DOC_XML  = 'word/document.xml'.freeze
      RELS_XML = 'word/_rels/document.xml.rels'.freeze
      HYPERLINK_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink'.freeze
      URL_RE = %r{https?://[^\s<>"'\)\]\[]+?(?=[\s<>"'\)\]\[]|[.,;:!?]+(?:\s|$)|$)}.freeze
      W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'.freeze

      def self.process(raw)
        new(raw).process
      end

      def initialize(raw)
        @raw = raw
      end

      def process
        entries = read_entries
        return @raw unless entries.key?(DOC_XML) && entries.key?(RELS_XML)

        doc  = Nokogiri::XML(entries[DOC_XML])
        rels = Nokogiri::XML(entries[RELS_XML])

        new_rels = []
        changed = linkify_document(doc, rels, new_rels)
        return @raw unless changed

        append_relationships(rels, new_rels)
        entries[DOC_XML]  = doc.to_xml(save_with: Nokogiri::XML::Node::SaveOptions::AS_XML)
        entries[RELS_XML] = rels.to_xml(save_with: Nokogiri::XML::Node::SaveOptions::AS_XML)

        write_entries(entries)
      rescue StandardError => e
        Rails.logger.warn("HyperlinkPostprocessor failed: #{e.class} #{e.message}") if defined?(Rails)
        @raw
      end

      private

      def read_entries
        entries = {}
        Zip::File.open_buffer(StringIO.new(@raw)) do |zip|
          zip.entries.each do |entry|
            entries[entry.name] = entry.get_input_stream.read
          end
        end
        entries
      end

      def write_entries(entries)
        out = Zip::OutputStream.write_buffer(StringIO.new.set_encoding(Encoding::ASCII_8BIT)) do |zos|
          entries.each do |name, contents|
            zos.put_next_entry(name)
            zos.write(contents)
          end
        end
        out.string
      end

      def linkify_document(doc, rels, new_rels)
        existing_targets = collect_existing_hyperlink_targets(rels)
        next_rid_num = next_relationship_number(rels)
        changed = false

        doc.xpath('//w:t', w: W_NS).each do |t_node|
          next if ancestor_hyperlink?(t_node)
          next unless URL_RE.match?(t_node.content)

          run = t_node.parent
          next unless run && run.name == 'r' && run.namespace && run.namespace.href == W_NS

          replacement_nodes = build_replacement(run, t_node, existing_targets, new_rels) do
            rid = "rIdHL#{next_rid_num}"
            next_rid_num += 1
            rid
          end
          next if replacement_nodes.blank?

          replacement_nodes.each { |n| run.add_previous_sibling(n) }
          run.remove
          changed = true
        end

        changed
      end

      # Splits the run text at each URL match and emits a sequence of nodes:
      # <w:r> chunks for the non-URL parts (preserving the original rPr) and
      # <w:hyperlink> wrappers for each URL.
      def build_replacement(run, t_node, existing_targets, new_rels)
        text = t_node.content
        r_pr = run.at_xpath('./w:rPr', w: W_NS)
        pieces = split_text_by_urls(text)
        return [] if pieces.length == 1 && pieces.first[0] == :text

        pieces.flat_map do |kind, value|
          if kind == :text
            value.empty? ? [] : [build_text_run(run, value, r_pr)]
          else
            rid = existing_targets[value] || new_rels.find { |r| r[:target] == value }&.dig(:rid)
            unless rid
              rid = yield
              new_rels << { rid: rid, target: value }
            end
            [build_hyperlink(run, value, rid, r_pr)]
          end
        end
      end

      def split_text_by_urls(text)
        pieces = []
        cursor = 0
        text.to_enum(:scan, URL_RE).each do
          match = Regexp.last_match
          pieces << [:text, text[cursor...match.begin(0)]]
          pieces << [:url,  match[0]]
          cursor = match.end(0)
        end
        pieces << [:text, text[cursor..] || '']
        pieces
      end

      def build_text_run(template_run, text, r_pr)
        doc = template_run.document
        r = Nokogiri::XML::Node.new('w:r', doc)
        r.add_child(r_pr.dup) if r_pr
        t = Nokogiri::XML::Node.new('w:t', doc)
        t['xml:space'] = 'preserve'
        t.content = text
        r.add_child(t)
        r
      end

      def build_hyperlink(template_run, url, rid, r_pr)
        doc = template_run.document
        hyperlink = Nokogiri::XML::Node.new('w:hyperlink', doc)
        hyperlink['r:id'] = rid
        hyperlink['w:history'] = '1'

        r = Nokogiri::XML::Node.new('w:r', doc)
        new_r_pr = r_pr ? r_pr.dup : Nokogiri::XML::Node.new('w:rPr', doc)
        ensure_hyperlink_formatting(new_r_pr, doc)
        r.add_child(new_r_pr)

        t = Nokogiri::XML::Node.new('w:t', doc)
        t['xml:space'] = 'preserve'
        t.content = url
        r.add_child(t)

        hyperlink.add_child(r)
        hyperlink
      end

      def ensure_hyperlink_formatting(r_pr, doc)
        unless r_pr.at_xpath('./w:color', w: W_NS)
          color = Nokogiri::XML::Node.new('w:color', doc)
          color['w:val'] = '0563C1'
          r_pr.add_child(color)
        end
        return if r_pr.at_xpath('./w:u', w: W_NS)

        u = Nokogiri::XML::Node.new('w:u', doc)
        u['w:val'] = 'single'
        r_pr.add_child(u)
      end

      def ancestor_hyperlink?(node)
        n = node.parent
        while n&.respond_to?(:name) && !n.is_a?(Nokogiri::XML::Document)
          return true if n.name == 'hyperlink' && n.namespace && n.namespace.href == W_NS

          n = n.parent
        end
        false
      end

      def collect_existing_hyperlink_targets(rels)
        rels.xpath('//xmlns:Relationship').each_with_object({}) do |rel, acc|
          next unless rel['Type'] == HYPERLINK_REL_TYPE

          acc[rel['Target']] = rel['Id'] if rel['Target']
        end
      end

      def next_relationship_number(rels)
        max = rels.xpath('//xmlns:Relationship').map do |rel|
          id = rel['Id'] || ''
          id[/\d+/].to_i
        end.max || 0
        max + 1
      end

      def append_relationships(rels, new_rels)
        root = rels.root
        ns = root.namespace
        new_rels.each do |entry|
          node = Nokogiri::XML::Node.new('Relationship', rels)
          node.namespace = ns if ns
          node['Id']         = entry[:rid]
          node['Type']       = HYPERLINK_REL_TYPE
          node['Target']     = entry[:target]
          node['TargetMode'] = 'External'
          root.add_child(node)
        end
      end
    end
  end
end
