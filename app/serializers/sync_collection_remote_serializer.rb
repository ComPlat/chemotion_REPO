class SyncCollectionRemoteSerializer < ActiveModel::Serializer
  attributes :id, :label, :is_shared, :shared_by_id, :is_locked,
    :permission_level, :sample_detail_level, :reaction_detail_level,
    :wellplate_detail_level, :screen_detail_level, :shared_by, :shared_to
  attributes  :is_public

  has_many :children

  def children
    SyncCollectionsUser.where('user_id = ? AND fake_ancestry ~* ?',object.user_id, '^'+object.id.to_s+'(\/|\Z)')
  end

  def shared_by
    UserSimpleSerializer.new(sharer).serializable_hash.deep_symbolize_keys
  end

  def shared_to
    if object.is_shared && object.user.is_a?(Group)
      UserSimpleSerializer.new(object.user).serializable_hash.deep_symbolize_keys
    end
  end

  def is_public
    !sharer.email.blank? && sharer.email == ENV['SYS_EMAIL']
  end

  def sharer
    @sharer ||= User.find_by(id: object.shared_by_id) || User.new
  end
end
