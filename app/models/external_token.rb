# == Schema Information
#
# Table name: external_tokens
#
#  id                       :bigint           not null, primary key
#  provider                 :string           not null
#  encrypted_access_token   :string           not null
#  encrypted_refresh_token  :string
#  expires_at               :datetime
#  created_by               :integer          not null
#  provider_config          :jsonb            default({})
#  created_at               :datetime         not null
#  updated_at               :datetime         not null
#
# Indexes
#
#  idx_external_tokens_user_provider  (created_by,provider) UNIQUE
#

require 'digest'

class ExternalToken < ApplicationRecord
  SUPPORTED_PROVIDERS = %w[nmrxiv].freeze

  belongs_to :user, foreign_key: :created_by

  validates :provider, presence: true, inclusion: { in: SUPPORTED_PROVIDERS }
  validates :encrypted_access_token, presence: true
  validates :created_by, presence: true, uniqueness: { scope: :provider }

  # Custom encryption methods using Rails' message encryptor
  def access_token
    return nil if encrypted_access_token.blank?

    begin
      encryptor.decrypt_and_verify(encrypted_access_token)
    rescue ActiveSupport::MessageEncryptor::InvalidMessage
      nil
    end
  end

  def access_token=(value)
    self.encrypted_access_token = value.present? ? encryptor.encrypt_and_sign(value) : nil
  end

  def refresh_token
    return nil if encrypted_refresh_token.blank?

    begin
      encryptor.decrypt_and_verify(encrypted_refresh_token)
    rescue ActiveSupport::MessageEncryptor::InvalidMessage
      nil
    end
  end

  def refresh_token=(value)
    self.encrypted_refresh_token = value.present? ? encryptor.encrypt_and_sign(value) : nil
  end

  scope :for_provider, ->(provider) { where(provider: provider) }
  scope :for_user, ->(user_id) { where(created_by: user_id) }

  def self.find_or_initialize_for_user_and_provider(user_id, provider)
    where(created_by: user_id, provider: provider).first_or_initialize
  end

  def valid_token?
    return false if access_token.blank?
    return true if expires_at.blank?

    DateTime.now < expires_at
  end

  def refresh_if_needed!
    return access_token if valid_token?

    if refresh_token.present?
      case provider
      when 'nmrxiv'
        refresh_nmrxiv_token!
      else
        raise "Unsupported provider: #{provider}"
      end
    else
      raise 'Token expired and no refresh token available'
    end
  end

  private

  def encryptor
    @encryptor ||= ActiveSupport::MessageEncryptor.new(
      generate_32_byte_key, # Ensure key is always 32 bytes
      cipher: 'aes-256-gcm'
    )
  end

  def generate_32_byte_key
    # Use SHA256 digest to ensure we always get exactly 32 bytes
    Digest::SHA256.digest(Rails.application.secret_key_base || 'fallback_secret_key')
  end

  def refresh_nmrxiv_token!
    service = Chemotion::NmrxivService.new
    result = service.refresh_token(refresh_token)

    if result[:success]
      update!(
        access_token: result[:access_token],
        refresh_token: result[:refresh_token] || refresh_token,
        expires_at: result[:expires_at]
      )
      access_token
    else
      raise "Failed to refresh NMRXiv token: #{result[:error]}"
    end
  end
end
