class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: %i[
    home about chemspectra chemspectra_editor directive root_page
  ]

  def home; end

  def about; end

  def chemspectra; end

  def chemspectra_editor; end

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
    @user.counters['reactions'] = params[:reactions_count].to_i if params[:reactions_count].present?
    @user.reaction_name_prefix = params[:reaction_name_prefix] if params[:reactions_count].present?
    if @user.save
      flash['success'] = 'User settings is successfully saved!'
      redirect_to main_app.root_url
    else
      flash.now['danger'] = 'Not saved! Please check input fields.'
      render 'user'
    end
  end

  def profiles
    @profile = current_user&.profile
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

  def update_orcid
    @profile = current_user.profile
    orcid = params['data_orcid']
    result = Chemotion::OrcidService.record_person(orcid)

    if result.nil?
      flash.now['danger'] = 'ORCID iD does not exist! Please check.'
      return render 'settings'
    elsif result&.person&.given_names&.casecmp(current_user.first_name)&.zero? &&
          result&.person&.family_name&.casecmp(current_user.last_name)&.zero?
      data = @profile.data || {}
      data['ORCID'] = orcid
      if @profile.update(data: data)
        flash['success'] = 'ORCID iD is successfully saved!'
        redirect_to root_path
      else
        flash.now['danger'] = 'Not saved! Please check input fields.'
        return render 'settings'
      end
    else
      flash.now['danger'] = 'Name could not be matched to the name of this ORCID iD ' + orcid + ' (family_name: ' + result&.person&.family_name + ', given_name: ' + result&.person&.given_names + '). Please check.'
      return render 'settings'
    end
  end


  private

  def profile_params
    params.require(:profile).permit(:show_external_name, :show_sample_name, :show_sample_short_label, :curation, :data_orcid)
  end
end
