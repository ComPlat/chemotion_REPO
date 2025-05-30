class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception
  # before_action :store_user_location!, if: :storable_location?
  before_action :authenticate_user!
  protect_from_forgery with: :null_session, if: Proc.new { |c| c.request.format == 'application/json' }

  before_action :configure_permitted_parameters, if: :devise_controller?

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [
      :email, :first_name, :last_name, :name_abbreviation, :provider, :uid, :orcid,
      affiliations_attributes: [
        :country,
        :organization,
        :department
      ]
    ])
    devise_parameter_sanitizer.permit(:sign_in) do |u|
      u.permit(:login, :password, :remember_me)
    end

    devise_parameter_sanitizer.permit(:account_update, keys: [
      :email
    ])
  end

  # def storable_location?
    # request.get? && is_navigational_format? && !devise_controller? && !request.xhr?
  # end

  # def store_user_location!
    # store_location_for(:user, )
  # end
end
