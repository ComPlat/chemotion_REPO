class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [
    :home, :about, :directive, :root_page
  ]
  before_action :fetch_affiliations, only: [:affiliations, :update_affiliations]
  before_action :build_affiliation, only: [:affiliations, :update_affiliations]

  def home; end

  def about; end

  def docx; end

  def welcome;
    flash.clear
  end

  def mydb; end

  def editor; end

  def sfn_cb
    code = params[:code]
    sf_verifer = request.env.dig('action_dispatch.request.unsigned_session_cookie', 'omniauth.pkce.verifier')
    begin
      provider_authorize = Chemotion::ScifinderNService.provider_authorize(code, sf_verifer)
      sfc = ScifinderNCredential.find_by(created_by: current_user.id)
      ScifinderNCredential.create!(provider_authorize.merge(created_by: current_user.id)) if sfc.blank?
      sfc.update!(provider_authorize) unless sfc.blank?
      redirect_to root_path
    rescue StandardError => e
      redirect_to '/500.html'
    end
  end

  def root_page
    render layout: 'root_layout'
  end

  def directive; end

  def settings; end

  def tokens
    @origin = params[:origin]
    aks = AuthenticationKey.where(user_id: current_user, role: "gate in")
    @fqdns = aks.pluck :fqdn
  end

  def update_user
    @user = current_user
    @user.counters['reactions'] = params[:reactions_count].to_i
    @user.reaction_name_prefix = params[:reaction_name_prefix]
    if @user.save
      flash['success'] = 'User settings is successfully saved!'
      redirect_to main_app.root_url
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
      render 'user'
    end
  end

  def profiles
    current_user.has_profile
    @profile = current_user.profile
  end

  def update_profiles
    @profile = current_user.profile
    @profile.assign_attributes(profile_params)

    if @profile.save
      flash['success'] = 'Profile is successfully saved!'
      redirect_to root_path
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
      render 'profile'
    end
  end

  def affiliations
  end

  def create_affiliation
    @affiliation = Affiliation.find_or_create_by(sliced_affiliation_params)
    current_user.user_affiliations.build(
      from: affiliation_params[:from_month], affiliation_id: @affiliation.id
    )
    if current_user.save!
      flash['success'] = 'New affiliation added!'
      redirect_to pages_affiliations_path
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
      render 'affiliations'
    end
    # redirect_to pages_affiliations_path
  end

  def update_affiliations
    affiliations_params[:affiliations].presence&.each do |affiliation|
      u_affiliation = @affiliations.find_by(id: affiliation[:id])
      next unless u_affiliation

      if affiliation.delete(:_destroy).blank?
        unless u_affiliation.update(affiliation)
          messages = u_affiliation.errors.messages[:to]
          flash.now['danger'] = messages && messages[0]
          return render 'affiliations'
        end
      else
        u_affiliation.destroy!
      end
    end
    redirect_to pages_affiliations_path
  end

  def update_orcid
    @profile = current_user.profile
    orcid = params['data_orcid']
    result = Chemotion::OrcidService.record_person(orcid)

    if result.nil?
      flash.now['danger'] = 'ORCID does not exist! Please check.'
      return render 'settings'
    elsif result&.person&.given_names&.casecmp(current_user.first_name)&.zero? &&
          result&.person&.family_name&.casecmp(current_user.last_name)&.zero?
      data = @profile.data || {}
      data['ORCID'] = orcid
      if @profile.update(data: data)
        flash['success'] = 'ORCID is successfully saved!'
        redirect_to root_path
      else
        flash.now['danger'] = 'Not saved! Please check input fields.'
        return render 'settings'
      end
    else
      flash.now['danger'] = 'Name could not be matched to the name of this ORCID ' + orcid + ' (family_name: ' + result.person.family_name + ', given_name: ' + result.person.given_names + '). Please check.'
      return render 'settings'
    end
  end

  private

  def build_affiliation
    @new_aff = current_user.affiliations.build
    # TODO: process this in FE
    # @new_aff.organization = Swot::school_name(current_user.email)
  end

  def fetch_affiliations
    @affiliations = current_user.user_affiliations.includes(:affiliation).order(
      to: :desc, from: :desc, created_at: :desc
    )
  end

  def affiliation_params
    params.require(:affiliation).permit(
      :id, :_destroy,
      :country, :organization, :department,
      :from, :to, :from_month, :to_month
    )
  end

  def sliced_affiliation_params
     affiliation_params.slice(:country, :organization, :department)
  end

  def affiliations_params
    params.permit(
      :utf8, :_method, :authenticity_token, :commit,
      affiliations: [
        :id, :_destroy,
        # :country, :organization, :department,
        :from, :to, :from_month, :to_month
      ]
    )
  end

  def profile_params
    params.require(:profile).permit(:show_external_name, :show_sample_name, :show_sample_short_label, :curation, :data_orcid)
  end
end
