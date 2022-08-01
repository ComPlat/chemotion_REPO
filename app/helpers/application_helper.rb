module ApplicationHelper
  def plugin_list
    Bundler.load.current_dependencies.select{  |dep|  dep.groups.include?(:plugins)}.map(&:name)
  end

  def plugin_with_setting_view_list
    plugin_list.select do |plugin|
      !Dir[File.join(Gem.loaded_specs[plugin].full_gem_path,"app","views",plugin,"home","_account.*")].empty?
    end
  end

  def markdown(text)
    options = {
      filter_html: true,
      hard_wrap: true,
      link_attributes: { rel: 'nofollow', target: '_blank' },
      space_after_headers: true,
      fenced_code_blocks: true
    }

    extensions = {
      autolink: true,
      superscript: true,
      disable_indented_code_blocks: true
    }

    renderer = Redcarpet::Render::HTML.new(options)
    @markdown ||= Redcarpet::Markdown.new(renderer, extensions)
    @markdown.render(text).html_safe
  end

  def encode_json(json)
    cipher = OpenSSL::Cipher.new('rc4')
    cipher.encrypt
    key = cipher.random_key
    iv = cipher.random_iv
    encrypted = cipher.update(json.to_json) + cipher.final
    encoded = Base64.encode64(encrypted)
    [encoded, key.unpack("H*"), iv.unpack("H*")]
  end

  def decode_json(json, key, iv)
    data = Base64.decode64(json)
    cipher = OpenSSL::Cipher.new('rc4')
    cipher.decrypt
    cipher.key = key.pack("H*")
    cipher.iv = iv.pack("H*")
    data = cipher.update(data) + cipher.final
    JSON.parse(data)
  end
end
