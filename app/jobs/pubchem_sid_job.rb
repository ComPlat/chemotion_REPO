# Job to update publication SID by using DOI
class PubchemSidJob < ActiveJob::Base
    queue_as :pubchem_sid

    # NB: PC has request restriction policy and timeout , hence the sleep_time params
    # see http://pubchemdocs.ncbi.nlm.nih.gov/programmatic-access$_RequestVolumeLimitations
    def perform(sleep_time: 10)
      Publication.where(element_type: 'Sample')
      .where("taggable_data->>'sid' isnull and taggable_data->>'doi' IS NOT NULL and state = 'completed'")
      .order("id asc").each do |pub|
        sid_info = Chemotion::PubchemService.sid_from_doi(pub.taggable_data["doi"])
        pub.update!(taggable_data: pub.taggable_data.merge(sid: sid_info)) unless sid_info.nil?
        sleep sleep_time
      end
    end
  end
