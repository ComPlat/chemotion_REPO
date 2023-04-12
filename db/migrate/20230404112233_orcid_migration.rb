class OrcidMigration < ActiveRecord::Migration[5.2]
  def change
    User.all.find_each(batch_size: 50) do |user|
      profile = user.profile
      data = profile.data
      providers = user.providers || {}

      if data && data['ORCID'].present?
        providers['orcid'] = data['ORCID']
        user.providers = providers
        user.save!
      end
    end
  end
end