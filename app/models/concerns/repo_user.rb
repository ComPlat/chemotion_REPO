# frozen_string_literal: true

module RepoUser
  extend ActiveSupport::Concern

  # Chemotion Repository: Anonymous users should not get an "All" collection.
  module Overrides
    def create_all_collection
      return if self.type == 'Anonymous'

      super
    end
  end

  included do
    prepend Overrides
    has_many :users_collaborators, foreign_key: :user_id
    has_many :collaborators, through: :users_collaborators, source: :user
    has_many :external_tokens, foreign_key: :created_by, dependent: :destroy
    validate :orcid_checker, on: :create
  end

  class_methods do
    def chemotion_user
      find_by(email: ENV['SYS_EMAIL'])
    end


    def is_public
      self.find_by(email: ENV['SYS_EMAIL'])
    end

    def embargo_viewer_ids
      (ENV['EMBARGO_VIEWER'] || '').split(',').map(&:to_i)
    end

    def reviewer_ids
      (ENV['REVIEWERS'] || '').split(',').map(&:to_i)
    end
  end

  def is_embargo_viewer
    (ENV['EMBARGO_VIEWER'] || '').split(",").include?(self.id.to_s)
  end


  def is_reviewer
    (ENV['REVIEWERS'] || '').split(",").include?(self.id.to_s)
  end

  def is_article_editor
    (ENV['NEWSROOM_EDITOR'] || '').split(",").include?(self.id.to_s)
  end

  def is_howto_editor
    (ENV['HOWTO_EDITOR'] || '').split(",").include?(self.id.to_s)
  end


  def group_leads
    User.joins("INNER JOIN users_collaborators ON users_collaborators.collaborator_id = users.id")
    .where(users_collaborators: { user_id: id, is_group_lead: true }).distinct
  end

  def orcid_checker
    return if orcid.nil?

    result = Chemotion::OrcidService.record_person(orcid)
    oc_given_names = result&.person&.given_names&.strip
    oc_family_name = result&.person&.family_name&.strip

    if result.nil?
      errors.add(:orcid, ' does not exist! Please check.')
    elsif oc_given_names&.casecmp(first_name.strip) != 0 || oc_family_name&.casecmp(last_name.strip) != 0
      errors.add(:orcid, " #{orcid} belongs to #{oc_given_names} #{oc_family_name} (first name: #{oc_given_names}, last_name: #{oc_family_name})! Please check.")
    end
  end

  def orcid
    providers&.fetch('orcid', nil) if respond_to?(:providers)
  end

  def pending_collection
    su_id = User.chemotion_user.id
    Collection.joins(
      "INNER JOIN sync_collections_users ON " +
      "sync_collections_users.collection_id = collections.id")
      .where("sync_collections_users.shared_by_id = #{su_id}")
      .where("sync_collections_users.user_id = #{self.id}")
      .where("sync_collections_users.permission_level = 0 and sync_collections_users.fake_ancestry is not null")
      .where("collections.label = 'Pending Publications'").first
  end

  def versions_collection
    su_id = User.chemotion_user.id
    Collection.joins(
      "INNER JOIN sync_collections_users ON " +
      "sync_collections_users.collection_id = collections.id")
      .where("sync_collections_users.shared_by_id = #{su_id}")
      .where("sync_collections_users.user_id = #{self.id}")
      .where("collections.label = 'New Versions'").first
  end

  def version_sync_collection
    su_id = User.chemotion_user.id
    SyncCollectionsUser.joins(
      "INNER JOIN collections ON " +
      "sync_collections_users.collection_id = collections.id")
      .where("sync_collections_users.shared_by_id = #{su_id}")
      .where("sync_collections_users.user_id = #{id}")
      .where("collections.label = 'New Versions'").first
  end

  def reviewing_collection
    su_id = User.chemotion_user.id
    Collection.joins(
      "INNER JOIN sync_collections_users ON " +
      "sync_collections_users.collection_id = collections.id")
      .where("sync_collections_users.shared_by_id = #{su_id}")
      .where("sync_collections_users.user_id = #{self.id}")
      .where("collections.label = 'Reviewing'").first
  end

  def sync_reviewing_collection
    su_id = User.chemotion_user.id
    SyncCollectionsUser.joins(
      "INNER JOIN collections ON " +
      "sync_collections_users.collection_id = collections.id")
      .where("sync_collections_users.shared_by_id = #{su_id}")
      .where("sync_collections_users.user_id = #{self.id}")
      .where("collections.label = 'Reviewing'").first
  end


  def sync_element_to_review_collection
    su_id = User.chemotion_user.id
    SyncCollectionsUser.joins(
      "INNER JOIN collections ON " +
      "sync_collections_users.collection_id = collections.id")
      .where("sync_collections_users.shared_by_id = #{su_id}")
      .where("sync_collections_users.user_id = #{self.id}")
      .where("collections.label = 'Element To Review'").first
  end

  def find_or_create_grouplead_collection
    chemotion_user = User.chemotion_user
    sys_review_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Group Lead Review from', is_locked: true, is_shared: false)
    sys_review_collection = Collection.find_or_create_by(user: chemotion_user, label: 'Group Lead Review', ancestry: "#{sys_review_from.id}", shared_by_id: id)

    col_attributes = {
      user: self,
      shared_by_id: chemotion_user.id,
      is_locked: true,
      is_shared: true
    }

    rc = Collection.find_by(col_attributes)
    unless rc.nil?
      SyncCollectionsUser.find_or_create_by(user: self, shared_by_id: chemotion_user.id, collection_id: sys_review_collection.id,
        permission_level: 3, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    end
    sys_review_collection
  end

  def published_collection
    su_id = User.chemotion_user.id
    Collection.joins("INNER JOIN sync_collections_users ON sync_collections_users.collection_id = collections.id")
              .where("sync_collections_users.shared_by_id = #{su_id}")
              .where("sync_collections_users.user_id = #{self.id}")
              .where("collections.label = 'Published Elements'").first
  end

  def sync_published_collection
    SyncCollectionsUser.joins("INNER JOIN collections on collections.id = sync_collections_users.collection_id")
              .where("sync_collections_users.user_id = #{self.id}")
              .where("collections.id = #{Collection.public_collection_id}").first

  end

  def publication_embargo_collection
    su_id = User.chemotion_user.id
    Collection.joins("INNER JOIN sync_collections_users ON sync_collections_users.collection_id = collections.id")
              .where("sync_collections_users.shared_by_id = #{su_id}")
              .where("sync_collections_users.user_id = #{self.id}")
              .where("collections.label = 'Embargoed Publications'").first
  end

  def all_collection
    Collection.where(user: self, label: 'All', is_locked: true, position: 0)&.first
  end

  def confirm(*args)
    was_confirmed = confirmed_at.present?
    super
    send_welcome_email if %w[Person].include?(self.type) && !was_confirmed
  end


end
