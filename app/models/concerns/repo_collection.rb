# frozen_string_literal: true

module RepoCollection
  extend ActiveSupport::Concern

  included do
    has_many :fundings, as: :fundable, foreign_key: :element_id, foreign_type: :element_type, dependent: :destroy
  end

  # Publishing adds `before_destroy :remove_from_previous_version`, which is only
  # implemented for publishable element models (Sample, Reaction, Container).
  # Collections are never part of a publication version chain, so the hook is a no-op here.
  def remove_from_previous_version
    true
  end

  class_methods do
    def public_collection
      coll = find_by(id: ENV['PUBLIC_COLL_ID'])
      return coll if coll
      return nil if User.chemotion_user.nil?

      find_by(user_id: User.chemotion_user.id, label: ENV['PUBLIC_COLL'])
    end

    def public_collection_id
      public_collection&.id
    end

    def scheme_only_reactions_collection
      coll = find_by(id: ENV['SCHEME_ONLY_REACTIONS_COLL_ID'])
      return coll if coll
      return nil if User.chemotion_user.nil?

      find_by(user_id: User.chemotion_user.id, label: ENV['SCHEME_ONLY_REACTIONS_COLL']) ||
        find_by(user_id: User.chemotion_user.id, label: 'Scheme-only reactions')
    end

    def scheme_only_reactions_collection_id
      ENV['SCHEME_ONLY_REACTIONS_COLL_ID']&.to_i
    end

    def embargo_accepted_collection
      return nil if User.chemotion_user.nil?

      find_by(
        user_id: User.chemotion_user.id,
        label: 'Embargo Accepted',
        is_synchronized: true,
      )
    end

    def element_to_review_collection
      return none if User.chemotion_user.nil?

      where(
        user_id: User.chemotion_user.id,
        label: 'Element To Review',
        is_synchronized: true,
      )
    end

    def reviewed_collection
      return none if User.chemotion_user.nil?

      where(
        user_id: User.chemotion_user.id,
        label: 'Reviewed',
        is_synchronized: true,
      )
    end

    def all_embargos(user_id)
      public_subquery = <<~SQL
        select c2.id from collections c2
        inner join collections pe on c2.ancestry LIKE '%/' || pe.id::text || '/%'
        where pe.label = 'Published Elements'
      SQL

      if user_id.nil?
        Collection.where("id in (#{public_subquery})")
      else
        Collection.where(
          ActiveRecord::Base.send(:sanitize_sql_array, [
            <<~SQL,
              id in (
                #{public_subquery}
                union
                select co.id from collections co
                inner join collections c on co.ancestry LIKE '%/' || c.id::text || '/%'
                inner join sync_collections_users scu on scu.collection_id = c.id
                where c.label = 'Embargoed Publications'
                  and scu.user_id = ?
              )
            SQL
            user_id.to_i,
          ])
        )
      end
    end
  end
end
