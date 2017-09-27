class ReactionGuestListSerializer < ActiveModel::Serializer
  attributes :id, :name, :reaction_svg_file, :tag, :xvial_count

  def xvial_count
    xvial_count = <<~SQL
      inner join element_tags e on e.taggable_id = reactions_samples.sample_id and (e.taggable_data -> 'xvial' is not null and e.taggable_data -> 'xvial' ->> 'num' != '')
    SQL
    ReactionsSample.joins(xvial_count).where(type: 'ReactionsProductSample', reaction_id: id).length
  end
end
