# frozen_string_literal: true

# reaction list class for guest
class ReactionGuestListSerializer < ActiveModel::Serializer
  attributes :id, :name, :reaction_svg_file, :tag, :xvial_count, :xvial_com

  def xvial_count
    xvial_count = <<~SQL
      inner join element_tags e on e.taggable_id = reactions_samples.sample_id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
    SQL
    ReactionsSample.joins(xvial_count).where(type: 'ReactionsProductSample', reaction_id: id).length
  end

  def xvial_com
    com_config = Rails.configuration.compound_opendata
    return -1 unless com_config.present?

    return -2 unless com_config.allowed_uids.include?(scope&.current_user&.id)

    xvial_com = <<~SQL
      inner join samples s on reactions_samples.sample_id = s.id and s.deleted_at is null
      inner join molecules m on m.id = s.molecule_id
      inner join com_xvial(true) a on a.x_inchikey = m.inchikey
    SQL
    ReactionsSample.joins(xvial_com).where(type: 'ReactionsProductSample', reaction_id: id).length
  end
end
