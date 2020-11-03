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
end
