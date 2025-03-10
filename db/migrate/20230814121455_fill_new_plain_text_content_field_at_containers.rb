# frozen_string_literal: true

class FillNewPlainTextContentFieldAtContainers < ActiveRecord::Migration[6.1]
  def up
    Container.where(container_type: 'analysis').where('extended_metadata::TEXT LIKE ?',
                                                      '%content%').find_each do |container|
      begin

        data = container.extended_metadata['content']
        ops = JSON.parse(data)['ops']
        ops.each do |op|
          if op['attributes']
            op['insert'] = op['insert'] + op['attributes'].map { |k, v| "#{k}:#{v}" }.join(' ')
            op.delete('attributes')
          end
        end
        data = { 'ops' => ops }.to_json
        content = Chemotion::QuillToPlainText.convert(data)

        # content = Chemotion::QuillToPlainText.convert(container.extended_metadata['content'])
        # force gc of node processes
        ObjectSpace.garbage_collect
        next if content.blank?

        container.update_columns(plain_text_content: content)
      rescue Exception => e
        ## byebug
      end

    end
  rescue Exception => e
    ## byebug
  end

  def down
    Container.where(container_type: 'analysis').where('extended_metadata::TEXT LIKE ?',
                                                      '%content%').find_each do |container|
      container.update_columns(plain_text_content: nil)
    end
  end
end
