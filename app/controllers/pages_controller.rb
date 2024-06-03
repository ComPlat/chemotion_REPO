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
    orcid = params[:data_orcid]
    flash.clear

    # Validate ORCID format first
    unless Chemotion::OrcidService.valid_format?(orcid)
      flash[:danger] = 'Invalid ORCID format. Please use the format: 0000-0000-0000-0000'
      return render 'settings'
    end
    
    # Fetch ORCID data from API
    orcid_data = Chemotion::OrcidService.record_person(orcid)
    
    if orcid_data.nil?
      flash[:danger] = 'Could not retrieve information for this ORCID iD. Please check the ID and try again.'
      return render 'settings'
    end
    
    # Check if names match
    if Chemotion::OrcidService.names_match?(current_user, orcid_data)
      # Update the user's providers hash with the ORCID
      providers = current_user.providers || {}
      providers['orcid'] = orcid
      
      if current_user.update(providers: providers)
        flash[:success] = 'ORCID iD successfully validated and saved!'
        return render 'settings'
      else
        flash[:danger] = 'Failed to save ORCID iD. Please try again.'
        return render 'settings'
      end
    else
      flash[:danger] = "Name mismatch! The ORCID record shows: #{orcid_data.person.given_names} #{orcid_data.person.family_name}. Your account has: #{current_user.first_name} #{current_user.last_name}."
      return render 'settings'
    end
  end


  private

  def profile_params
    params.require(:profile).permit(:show_external_name, :show_sample_name, :show_sample_short_label, :curation, :data_orcid)
  end
end
