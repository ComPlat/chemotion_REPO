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

  def join_xvial_sql(req_xvial = false, link = 'samples')
    xvial_count_sql = <<~SQL
      inner join element_tags e on e.taggable_type = 'Sample' and e.taggable_id = #{link}.id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
    SQL
    xvial_count_sql = '' unless req_xvial
    xvial_count_sql
  end

  def get_xvial_sql(req_xvial = false, link = 'samples')
    xvial_com_sql = <<~SQL
      inner join molecules m on m.id = samples.molecule_id
      inner join com_xvial(true) a on a.x_inchikey = m.inchikey
    SQL
    if req_xvial
      xvial_com_sql = <<~SQL
        inner join element_tags e on e.taggable_type = 'Sample' and e.taggable_id = #{link}.id
        inner join com_xvial(true) a on a.x_data ->> 'xid' = e.taggable_data -> 'xvial' ->> 'num'
      SQL
    end
    xvial_com_sql
  end

  def get_xdata(inchikey, sid, req_xvial = false)
    return [] unless req_xvial

    com_config = Rails.configuration.compound_opendata
    return [] unless com_config.present? && inchikey.present?

    # data = CompoundOpenData.where('x_inchikey = ?', inchikey).order(x_created_at: :desc).pluck :x_data

    xvial_com_sql = <<~SQL
      inner join element_tags e on e.taggable_type = 'Sample' and e.taggable_id = #{sid}
    SQL

    # data = CompoundOpenData.joins(xvial_com_sql).order(x_created_at: :desc).pluck :x_data
    data = CompoundOpenData.where("compound_open_data.x_data ->> 'xid' = e.taggable_data -> 'xvial' ->> 'num'").joins(xvial_com_sql).order(x_created_at: :desc).pluck :x_data

    x_data = data.map do |obj|
      { affiliation: obj['affiliation'], provided_by: obj['provided_by'], group: obj['group'] }
    end
    x_data
  end
end
