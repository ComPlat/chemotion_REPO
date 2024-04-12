# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  reset_password_token   :string
#  reset_password_sent_at :datetime
#  remember_created_at    :datetime
#  sign_in_count          :integer          default(0), not null
#  current_sign_in_at     :datetime
#  last_sign_in_at        :datetime
#  current_sign_in_ip     :inet
#  last_sign_in_ip        :inet
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  name                   :string
#  first_name             :string           not null
#  last_name              :string           not null
#  deleted_at             :datetime
#  counters               :hstore           not null
#  name_abbreviation      :string(12)
#  type                   :string           default("Person")
#  reaction_name_prefix   :string(3)        default("R")
#  layout                 :hstore           not null
#  confirmation_token     :string
#  confirmed_at           :datetime
#  confirmation_sent_at   :datetime
#  unconfirmed_email      :string
#  selected_device_id     :integer
#  failed_attempts        :integer          default(0), not null
#  unlock_token           :string
#  locked_at              :datetime
#  account_active         :boolean
#  matrix                 :integer          default(0)
#  providers              :jsonb
#
# Indexes
#
#  index_users_on_confirmation_token    (confirmation_token) UNIQUE
#  index_users_on_deleted_at            (deleted_at)
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_name_abbreviation     (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#  index_users_on_unlock_token          (unlock_token) UNIQUE
#

class User < ApplicationRecord
  attr_writer :login, :orcid
  attr_accessor :provider, :uid
  acts_as_paranoid
  # Include default devise modules. Others available are: :timeoutable
  devise :database_authenticatable, :registerable, :confirmable,
         :recoverable, :rememberable, :trackable, :validatable, :lockable, :omniauthable, authentication_keys: [:login]
  has_one :profile, dependent: :destroy
  has_one :container, as: :containable

  has_many :collections
  has_many :samples, -> { unscope(:order).distinct }, through: :collections
  has_many :reactions, through: :collections
  has_many :wellplates, through: :collections
  has_many :screens, through: :collections
  has_many :research_plans, through: :collections

  has_many :samples_created, foreign_key: :created_by, class_name: 'Sample'

  has_many :sync_out_collections_users, foreign_key: :shared_by_id, class_name: 'SyncCollectionsUser'
  has_many :sync_in_collections_users,  foreign_key: :user_id, class_name: 'SyncCollectionsUser'
  has_many :sharing_collections, through: :sync_out_collections_users, source: :collection
  has_many :shared_collections,  through: :sync_in_collections_users, source: :collection
  has_many :users_devices, dependent: :destroy, foreign_key: :user_id
  has_many :devices, through: :users_devices
  # belongs_to :selected_device, class_name: 'Device'

  has_many :reports_users
  has_many :reports, through: :reports_users

  has_many :user_affiliations, dependent: :destroy
  has_many :affiliations, through: :user_affiliations

  has_many :computed_props

  has_many :text_templates, dependent: :destroy
  has_one :sample_text_template, dependent: :destroy
  has_one :reaction_text_template, dependent: :destroy
  has_one :reaction_description_text_template, dependent: :destroy
  has_one :screen_text_template, dependent: :destroy
  has_one :wellplate_text_template, dependent: :destroy
  has_one :research_plan_text_template, dependent: :destroy
  has_many :element_text_templates, dependent: :destroy

  accepts_nested_attributes_for :affiliations

  validates_presence_of :first_name, :last_name, allow_blank: false

  validates :name_abbreviation, uniqueness: { message: 'is already in use.' }
  validate :name_abbreviation_reserved_list, on: :create
  validate :name_abbreviation_length, on: :create
  validate :name_abbreviation_format, on: :create
  # validate :academic_email
  validate :orcid_checker, on: :create
# validate :academic_email
  validate :mail_checker

  # NB: only Persons and Admins can get a confirmation email and confirm their email.
  before_create :skip_confirmation_notification!, unless: proc { |user| %w[Person Admin].include?(user.type) }
  # NB: option to skip devise confirmable for Admins and Persons
  before_create :skip_confirmation!, if: proc { |user| %w[Person Admin].include?(user.type) && self.class.allow_unconfirmed_access_for.nil? }
  before_create :set_account_active, if: proc { |user| %w[Person Anonymous].include?(user.type) }

  after_create :create_chemotion_public_collection
  after_create :create_all_collection, :has_profile
  after_create :new_user_text_template
  after_create :update_matrix
  after_create :send_welcome_email, if: proc { |user| %w[Person].include?(user.type) }
  before_destroy :delete_data

  scope :by_name, ->(query) {
    where("LOWER(first_name) ILIKE ? OR LOWER(last_name) ILIKE ? OR LOWER(first_name || ' ' || last_name) ILIKE ?",
          "#{sanitize_sql_like(query.downcase)}%", "#{sanitize_sql_like(query.downcase)}%", "#{sanitize_sql_like(query.downcase)}%")
  }

  def login
    @login || self.name_abbreviation || self.email
  end

  def self.find_first_by_auth_conditions(warden_conditions)
    conditions = warden_conditions.dup
    if (login = conditions.delete(:login))
      where(conditions).where(["name_abbreviation = :value OR lower(email) = lower(:value)", { value: login }]).first
    else
      where(conditions).first
    end
  end

  def active_for_authentication?
    super && account_active
  end

  def name_abbr_config
    @name_abbr_config ||= Rails.configuration.respond_to?(:user_props) ? (Rails.configuration.user_props&.name_abbr || {}) : {}
  end

  def name_abbreviation_reserved_list
    return unless (name_abbr_config[:reserved_list] || []).include?(name_abbreviation)

    errors.add(:name_abbreviation, 'is reserved, please change')
  end

  def name_abbreviation_format
    format_abbr_default = /\A[a-zA-Z][a-zA-Z0-9\-_]*[a-zA-Z0-9]\Z/
    format_err_msg_default = "can be alphanumeric, middle '_' and '-' are allowed, but leading digit, or trailing '-' and '_' are not."

    format_abbr = name_abbr_config[:format_abbr].presence || format_abbr_default.presence
    format_err_msg = name_abbr_config[:format_abbr_err_msg].presence || format_err_msg_default.presence

    return if name_abbreviation&.match?(format_abbr)

    errors.add(:name_abbreviation, format_err_msg)
  end

  def name_abbreviation_length
    na = name_abbreviation
    case type
    when 'Group'
      min_val = name_abbr_config[:length_group]&.first || 2
      max_val = name_abbr_config[:length_group]&.last || 5
    when 'Device'
      min_val = name_abbr_config[:length_device]&.first || 2
      max_val = name_abbr_config[:length_device]&.last || 5
    when 'Anonymous'
      min_val = name_abbr_config[:length_anonymous]&.first || 2
      max_val = name_abbr_config[:length_anonymous]&.last || 5
    when 'Collaborator'
      min_val = name_abbr_config[:length_device]&.first || 2
      max_val = name_abbr_config[:length_device]&.last || 5
    else
      min_val = name_abbr_config[:length_default]&.first || 2
      max_val = name_abbr_config[:length_default]&.last || 3
    end

    na.blank? || !na.length.between?(min_val, max_val) &&
      errors.add(:name_abbreviation, "has to be #{min_val} to #{max_val} characters long")
  end

  def orcid_checker
    return if orcid.nil?

    result = Chemotion::OrcidService.record_person(orcid)
    oc_given_names = result&.person&.given_names&.strip
    oc_family_name = result&.person&.family_name&.strip

    if result.nil?
      errors.add(:orcid, ' does not exist! Please check.')
    elsif oc_given_names&.casecmp(first_name) != 0 || oc_family_name&.casecmp(last_name) != 0
      errors.add(:orcid, " #{orcid} belongs to #{oc_given_names} #{oc_family_name} (first name: #{oc_given_names}, last_name: #{oc_family_name})! Please check.")
    end
  end

  def academic_email
    Swot::is_academic?(email) || errors.add(
      :email, 'not from an academic organization'
    )
  end

  def mail_checker
    MailChecker.valid?(email) || errors.add(
      :email, 'from throwable email providers not accepted'
    )
  end

  def orcid
    providers&.fetch('orcid', nil)
    # profile&.data&.fetch('ORCID', nil)
  end

  def owns_collections?(collections)
    collections.pluck(:user_id).uniq == [id]
  end

  def owns_unshared_collections?(collections)
    owns_collections?(collections) && collections.pluck(:is_shared).none?
  end

  def name
    "#{first_name} #{last_name}"
  end

  def initials
    name_abbreviation
  end

  def restore_counters_data
    samples_number = self.samples_created.pluck(:short_label).map do |l|
      l.split('-').map(&:to_i)
    end.flatten.max || 0

    reactions_number = self.reactions.pluck(:name).map do |l|
      l.split('#').last.to_i
    end.max || 0

    self.counters = {
      samples: samples_number,
      reactions: reactions_number,
      wellplates: self.wellplates.count + self.wellplates.deleted.count
    }

    self.save!
  end

  def increment_counter(key)
    return if self.counters[key].nil?

    self.counters[key] = self.counters[key].succ
    self.save!
  end

  def has_profile
    self.create_profile if !self.profile
    if self.type == 'Person'
      profile = self.profile
      data = profile.data || {}
      file = Rails.root.join('db', 'chmo.default.profile.json')
      result = JSON.parse(File.read(file, encoding: 'bom|utf-8')) if File.exist?(file)
      unless result.nil? || result['ols_terms'].nil?
        data['chmo'] = result['ols_terms']
        data['is_templates_moderator'] = false
        data['molecule_editor'] = false
        data['converter_admin'] = false
        data.merge!(layout: {
          'sample' => 1,
          'reaction' => 2,
          'wellplate' => 3,
          'screen' => 4,
          'research_plan' => 5
        }) if (data['layout'].nil?)
        self.profile.update_columns(data: data)
      end
    end
  end

  has_many :users_groups, dependent: :destroy, foreign_key: :user_id
  has_many :groups, through: :users_groups

  def group_ids
    groups.pluck(:id)
  end

  def group_collections
    Collection.where('user_id = ? AND is_locked = ?', group_ids, false)
  end

  def all_collections
    Collection.where('user_id IN (?) ', [id] + group_ids)
  end

  def all_sync_in_collections_users
    SyncCollectionsUser.where('user_id IN (?) ', [id] + group_ids)
  end

  def self.is_public
    self.find_by(email: ENV['SYS_EMAIL'])
  end

  # TODO: mv to initializers
  def self.reviewer_ids
    (ENV['REVIEWERS'] || '').split(',').map(&:to_i)
  end

  def is_reviewer
    (ENV['REVIEWERS'] || "").split(",").include?(self.id.to_s)
  end

  def is_article_editor
    (ENV['NEWSROOM_EDITOR'] || "").split(",").include?(self.id.to_s)
  end

  def is_howto_editor
    (ENV['HOWTO_EDITOR'] || "").split(",").include?(self.id.to_s)
  end

  def pending_collection
    su_id = User.chemotion_user.id
    Collection.joins(
      "INNER JOIN sync_collections_users ON " +
      "sync_collections_users.collection_id = collections.id")
      .where("sync_collections_users.shared_by_id = #{su_id}")
      .where("sync_collections_users.user_id = #{self.id}")
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

  def self.chemotion_user
    find_by(email: ENV['SYS_EMAIL'])
  end

  def current_affiliations
    Affiliation.joins(
      'INNER JOIN user_affiliations ua ON ua.affiliation_id = affiliations.id'
    ).where(
      '(ua.user_id = ?) and (ua.deleted_at ISNULL) and (ua.to ISNULL or ua.to > ?)',
      id, Time.now
    ).order('ua.from DESC')
  end

  def is_templates_moderator
    profile&.data&.fetch('is_templates_moderator', false)
  end

  def molecule_editor
    profile&.data&.fetch('molecule_editor', false)
  end

  def converter_admin
    profile&.data&.fetch('converter_admin', false)
  end

  def matrix_check_by_name(name)
    mx = Matrice.find_by(name: name)
    return false if mx.nil?

    matrix_check(mx.id)
  end

  def matrix_check(id)
    pins = matrix.to_s(2)
    return false if pins.nil? || id > pins.length

    (pins && pins.reverse[id]) == '1'
  end

  def update_matrix
    check_sql = ApplicationRecord.send(:sanitize_sql_array, ["SELECT to_regproc('generate_users_matrix') IS NOT null as rs"])
    result = ApplicationRecord.connection.exec_query(check_sql)

    if result.presence&.first&.fetch('rs', false)
      sql = ApplicationRecord.send(:sanitize_sql_array, ['select generate_users_matrix(array[?])', id])
      ApplicationRecord.connection.exec_query(sql)
    end
  rescue StandardError => e
    log_error 'Error on update_matrix'
  end

  def remove_from_matrices
    Matrice.where('include_ids @> ARRAY[?]', [id]).each { |ma| ma.update_columns(include_ids: ma.include_ids -= [id]) }
    Matrice.where('exclude_ids @> ARRAY[?]', [id]).each { |ma| ma.update_columns(exclude_ids: ma.exclude_ids -= [id]) }
  end

  def self.gen_matrix(user_ids = nil)
    check_sql = ApplicationRecord.send(:sanitize_sql_array, ["SELECT to_regproc('generate_users_matrix') IS NOT null as rs"])
    result = ApplicationRecord.connection.exec_query(check_sql)
    if result.presence&.first&.fetch('rs', false)
      sql = if user_ids.present?
              ApplicationRecord.send(:sanitize_sql_array, ['select generate_users_matrix(array[?])', user_ids])
            else
              'select generate_users_matrix(null)'
            end
      ApplicationRecord.connection.exec_query(sql)
    end
  rescue StandardError => e
    log_error 'Error on update_matrix'
  end

  def create_text_template
    API::TEXT_TEMPLATE.each do |type|
      klass = type.to_s.constantize
      template = klass.new
      template.user_id = id
      template.data = klass.default_templates
      template.save!
    end
  end

  def self.from_omniauth(provider, uid, email, first_name, last_name)
    user = find_by(email: email)
    if user.present?
      providers = user.providers || {}
      providers[provider] = uid
      user.providers = providers
      user.save!
    else
      user = User.new(
        email: email,
        first_name: first_name,
        last_name: last_name,
        password: Devise.friendly_token[0, 20],
      )
    end
    user
  end

  def link_omniauth(provider, uid)
    providers = {} if providers.nil?
    providers[provider] = uid
    save!
  end

  def password_required?
    super && provider.blank?
  end

  private

  # These user collections are locked, i.e., the user is not allowed to:
  # - rename it
  # - move it around in collection tree
  # - add subcollections
  # - delete it

  def create_all_collection
    return if self.type == 'Anonymous'
    Collection.create(user: self, label: 'All', is_locked: true, position: 0)
  end

  def new_user_text_template
    create_text_template
  end

  def create_chemotion_public_collection
    return unless self.type == 'Person'
    chemotion_user = User.chemotion_user
    # Collection.create(user: self, label: 'chemotion.net', is_locked: true, position: 1)
    Collection.find_or_create_by(user: self, label: 'ELN Gate', is_locked: true, position: 1)
    Collection.find_or_create_by(user: self, label: 'My Data', is_locked: true, position: 2)

    sys_published_by = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Published by')
    sys_pending_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Pending Publication from')
    sys_versions_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'New Versions from')
    sys_reviewing_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Reviewing Publication from')
    sys_ready_publish_from = Collection.find_or_create_by(user_id: chemotion_user.id, label: 'Embargoed Publications from')

    sys_reviewing_collection = self.reviewing_collection || Collection.create(user: chemotion_user, label: 'Reviewing', ancestry: "#{sys_reviewing_from.id}")
    sys_pending_collection = self.pending_collection || Collection.create(user: chemotion_user, label: 'Pending Publications', ancestry: "#{sys_pending_from.id}")
    sys_versions_collection = self.versions_collection || Collection.create(user: chemotion_user, label: 'New Versions', ancestry: "#{sys_versions_from.id}")
    sys_published_collection = self.published_collection || Collection.create(user: chemotion_user, label: 'Published Elements', ancestry: "#{sys_published_by.id}")
    sys_publication_embargo_collection = self.publication_embargo_collection || Collection.create(user: chemotion_user, label: 'Embargoed Publications', ancestry: "#{sys_ready_publish_from.id}")

    root_label = "with %s" %chemotion_user.name_abbreviation
    root_collection_attributes = {
      label: root_label,
      user: self,
      shared_by_id: chemotion_user.id,
      is_locked: true,
      is_shared: true
    }
    rc = Collection.find_or_create_by(root_collection_attributes)

    SyncCollectionsUser.find_or_create_by(user: self, shared_by_id: chemotion_user.id, collection_id: Collection.public_collection_id, permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    SyncCollectionsUser.find_or_create_by(user: self, shared_by_id: chemotion_user.id, collection_id: Collection.scheme_only_reactions_collection.id, permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    SyncCollectionsUser.find_or_create_by(user: self, shared_by_id: chemotion_user.id, collection_id: sys_published_collection.id, permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    SyncCollectionsUser.find_or_create_by(user: self, shared_by_id: chemotion_user.id, collection_id: sys_pending_collection.id, permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    SyncCollectionsUser.find_or_create_by(user: self, shared_by_id: chemotion_user.id, collection_id: sys_versions_collection.id, permission_level: 3, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    SyncCollectionsUser.find_or_create_by(user: self, shared_by_id: chemotion_user.id, collection_id: sys_reviewing_collection.id, permission_level: 3, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
    SyncCollectionsUser.find_or_create_by(user: self, shared_by_id: chemotion_user.id, collection_id: sys_publication_embargo_collection.id, permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)
  end

  def set_account_active
    self.account_active = ENV['DEVISE_NEW_ACCOUNT_INACTIVE'].presence != 'true'
  end

  def send_welcome_email
    file_path =  Rails.public_path.join('welcome-message.md')
    if File.exist?(file_path)
      SendWelcomeEmailJob.perform_later(id)
    else
      #do nothing
    end
  end

  def delete_data
    # TODO: logic to check if user can be really destroy or which data can be deleted
    count = samples.count
    # + self.reactions.count
    # + self.wellplates.count
    # + self.screens.count
    # + self.research_plans.count
    update_columns(email: "#{id}_#{name_abbreviation}@deleted")
    update_columns(name_abbreviation: nil) if count.zero?
    update_columns(providers: nil)
  end
end

class Person < User
  has_many :users_groups, dependent: :destroy, foreign_key: :user_id
  has_many :groups, through: :users_groups

  has_many :users_admins, dependent: :destroy, foreign_key: :admin_id
  has_many :administrated_accounts,  through: :users_admins, source: :user
end

class Device < User
  has_many :users_devices, dependent: :destroy
  has_many :users, class_name: 'User', through: :users_devices

  has_many :users_admins, dependent: :destroy, foreign_key: :user_id
  has_many :admins, through: :users_admins, source: :admin

  has_one :device_metadata, dependent: :destroy, foreign_key: :device_id

  scope :by_user_ids, ->(ids) { joins(:users_devices).merge(UsersDevice.by_user_ids(ids)) }
  scope :novnc, -> { joins(:profile).merge(Profile.novnc) }
end

class Group < User
  has_many :users_groups, dependent: :destroy
  has_many :users, class_name: 'User', through: :users_groups

  has_many :users_admins, dependent: :destroy, foreign_key: :user_id
  has_many :admins,  through: :users_admins, source: :admin # ,  foreign_key:    association_foreign_key: :admin_id
end
