class DefaultOlsProfile < ActiveRecord::Migration
  def change
    file = Rails.public_path.join('ontologies','chmo.default.profile.json')
    result = JSON.parse(File.read(file, encoding:  'bom|utf-8')) if File.exist?(file)
    unless result.nil? || result['ols_terms'].nil?
      Person.find_each do |u|
        profile = u.profile
        data = profile.data || {}
        next unless data['chmo'].nil?
        data['chmo'] = result['ols_terms']
        u.profile.update_columns(data: data)
      end
    end
  end
end
