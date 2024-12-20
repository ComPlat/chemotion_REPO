# frozen_string_literal: true

module Entities
  class CollectionEntity < ApplicationEntity
    USER_COLS = ['Embargoed Publications from', 'Pending Publication from', 'Group Lead Review from', 'Published by', 'Reviewing Publication from'].freeze

    expose(
      :descendant_ids,
           :id,
      :is_locked,
      :is_remote,
      :is_shared,
      :is_synchronized,
      :label,
      :permission_level,
      :reaction_detail_level,
      :sample_detail_level,
      :screen_detail_level,
      :shared_by_id,
      :wellplate_detail_level,
      :tabs_segment,
      :inventory_id,
    )

    expose :children, using: 'Entities::CollectionEntity'
    expose :shared_to, using: 'Entities::UserSimpleEntity'
    expose :shared_users, using: 'Entities::UserSimpleEntity'
    expose :sync_collections_users, using: 'Entities::SyncCollectionsUserEntity'

    private

    def sync_collections_users
      object.sync_collections_users.includes(:user, :sharer, :collection)
    end

    def children
      chemotion_user = User.chemotion_user
      if chemotion_user&.id == current_user&.id && USER_COLS.include?(object.label)
        return nil
      end

      object.children.ordered
    end

    def is_remote
      object.is_shared &&
        (object.shared_by_id != current_user&.id)
    end

    def descendant_ids
      object.descendant_ids
    end

    def shared_to
      return unless object.is_shared

      object.user || User.new
    end
  end
end
