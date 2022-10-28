# frozen_string_literal: true

# Compound data helper
module CompoundHelpers
  extend Grape::API::Helpers

  def build_xvial_com(inchikey, uid)
    xvial_com = { allowed: false, hasData: 0, data: [], hasSample: false }
    com_config = Rails.configuration.compound_opendata
    return xvial_com unless com_config.present? && inchikey.present? && uid.present?

    xvial_com = CompoundOpenData.where('x_inchikey = ?', inchikey).order(x_created_at: :desc)
    {
      allowed: com_config.allowed_uids.include?(uid),
      hasData: xvial_com.length.positive?,
      data: com_config.allowed_uids.include?(uid) ? xvial_com : [],
      hasSample: false
    }
  end

  def add_xvial_sql(req_xvial = false)
    xvial_count_sql = <<~SQL
      inner join element_tags e on e.taggable_type = 'Sample' and e.taggable_id = samples.id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
    SQL
    xvial_count_sql = '' unless req_xvial
    xvial_count_sql
  end
end
