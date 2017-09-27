class ReactionGuestListSerializer < ActiveModel::Serializer
  attributes :id, :name, :reaction_svg_file, :tag
end
