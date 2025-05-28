# frozen_string_literal: true

module Chemotion
  class CollaborationAPI < Grape::API
    resource :collaborators do
      helpers do
        def format_date(obj)
          return nil if obj.nil? || obj['year'].nil?

          Date.new(obj['year']&.to_i, obj['month']&.to_i || 1, obj['day']&.to_i || 1)
        end

        def process_orcid_affiliation(user, emps)
          return if emps.nil?

          emps = [emps] unless emps.is_a?(Array)
          emps.each do |emp|
            next if emp.nil?

            org = emp['employment_summary']['organization']['name']
            c_code = emp['employment_summary']['organization']['address']['country']
            dep = emp['employment_summary']['department_name']
            country = ISO3166::Country.translations[c_code]
            from = format_date(emp['employment_summary']['start_date'])
            to = format_date(emp['employment_summary']['end_date'])
            aff = Affiliation.where(country: country, organization: org, department: dep).order(:id).first_or_create
            UserAffiliation.create(user_id: user.id, affiliation_id: aff.id, from: from, to: to)
          end
        end

        # Check if the current user is authorized to manage this collaborator
        def authorized_to_manage_collaborator?(collaboration)
          # User can manage their own collaborators
          return true if collaboration.user_id == current_user.id

          # Add additional authorization logic if needed
          # For example, group admins might be allowed to manage group collaborators

          false # Default to not authorized unless conditions above are met
        end
      end

      namespace :list do
        desc 'fetch collaborators of current user'
        get do
          ## collaborations = current_user.collaborators
          collaborations = UsersCollaborator.where(user_id: current_user.id)
          data = collaborations.map do |uc|
            user = uc.collaborator
            user.instance_variable_set('@is_group_lead', uc.is_group_lead || false) if user.present?
            user
          end
          present data, with: Entities::CollaboratorEntity, root: 'authors'
        end
      end

      namespace :update do
        desc 'update collaborator information (e.g., group lead status)'
        params do
          requires :id, type: Integer
          requires :is_group_lead, type: Boolean
        end
        post do
          # Update the status
          collaboration = UsersCollaborator.find_by(
            user_id: current_user.id,
            collaborator_id: params[:id]
          )

          if collaboration && authorized_to_manage_collaborator?(collaboration)
            collaboration.update(is_group_lead: params[:is_group_lead])
            user = collaboration.collaborator
            user.instance_variable_set('@is_group_lead', collaboration.is_group_lead)
            present user, with: Entities::CollaboratorEntity, root: 'user'
          elsif collaboration
            error!({ error: true, message: 'Unauthorized to manage this collaborator'}, 403)
          else
            error!({ error: true, message: 'Collaborator not found' }, 404)
          end
        end
      end

      namespace :orcid do
        desc 'fetch collaborators by orcid'
        params do
          requires :orcid, type: String
        end
        get do
          erro_msg = nil
          collaborator = User.where(type: %w[Person Collaborator]).where(["providers->>'orcid' = ?", params[:orcid]]).order('type desc').first

          if collaborator.nil?
            result = Chemotion::OrcidService.record_person(params[:orcid])
            ## byebug ### PAGGY
            if result.nil?
              erro_msg = 'ORCID iD does not exist! Please check.'
            elsif result.person&.family_name.nil?
              erro_msg = 'Last name can not be blank!'
            else
              attributes = {}
              attributes[:first_name] = result&.person&.given_names
              attributes[:last_name] = result.person&.family_name
              attributes[:type] = 'User'
              attributes[:confirmed_at] = DateTime.now
              attributes[:name_abbreviation] = "c#{SecureRandom.random_number(9999)}"
              attributes[:password] = Devise.friendly_token.first(8)
        #      attributes[:email] = "#{current_user.name_abbreviation}.#{attributes[:name_abbreviation]}@chemotion.net"
              attributes[:email] = result.person&.email

              if result.person&.email.present?
                collaborator = User.where(email: result.person&.email).first
              end
              if collaborator.nil?
                collaborator = User.new(attributes)
                emps = Chemotion::OrcidService.record_employments(params[:orcid])
                emps = [emps] unless emps.is_a?(Array)
                if emps.present? && emp = emps&.first
                  org = emp['employment_summary']['organization']['name']
                  c_code = emp['employment_summary']['organization']['address']['country']
                  dep = emp['employment_summary']['department_name']
                  country = ISO3166::Country.translations[c_code]
                  from = format_date(emp['employment_summary']['start_date'])
                  to = format_date(emp['employment_summary']['end_date'])
                  aff = Affiliation.new(country: country, organization: org, department: dep)
                  collaborator.affiliations = [aff]
                end
              end
            end
          elsif collaborator.id == current_user.id
            erro_msg = 'Can not add yourself as a collaborator'
          else
            has_col = UsersCollaborator.where(user_id: current_user.id, collaborator_id: collaborator.id)
            if has_col.empty?
              UsersCollaborator.create(user_id: current_user.id, collaborator_id: collaborator.id)
            else
              erro_msg = 'Collaborator is existed!'
            end
          end

          if erro_msg.nil?
            # ids = UsersCollaborator.where(user_id: current_user.id).pluck(:collaborator_id)
            # data = User.where(id: ids)
            # present data, with: Entities::CollaboratorEntity, root: 'authors'
            present collaborator, with: Entities::CollaboratorEntity, root: 'users'
          else
            { error: true, message: erro_msg }
          end
        end
      end

      namespace :user do
        desc 'fetch collaborators of current user'
        params do
          optional :name, type: String
          optional :first, type: String
          optional :email, type: String
        end
        get do
          scope = User.where.not(confirmed_at: nil).where(type: 'Person')
          scope = scope.where([" LOWER(first_name) LIKE ? ",'%'+params[:first].downcase+'%']) if params[:first].present?
          scope = scope.where([" LOWER(last_name) LIKE ? ",'%'+params[:name].downcase+'%']) if params[:name].present?
          scope = scope.where([" LOWER(email) LIKE ? ",'%'+params[:email].downcase+'%']) if params[:email].present?
          present scope.limit(5), with: Entities::CollaboratorEntity, root: 'users'
        end
      end

      namespace :add do
        desc 'add user to my collabration'
        params do
          requires :id, type: Integer
        end
        post do
          new_author = UsersCollaborator.create({ user_id: current_user.id, collaborator_id: params[:id] })
          user = User.find(params[:id])
          present user, with: Entities::CollaboratorEntity, root: 'user'
        end
      end

      namespace :add_aff do
        desc 'add user to my collabration'
        params do
          requires :id, type: Integer
          requires :department, type: String
          requires :organization, type: String
          requires :country, type: String
        end
        post do
          collaborator = User.find(params[:id])
          aff = [Affiliation.where(country: params[:country], organization: params[:organization], department: params[:department]).order(:id).first_or_create]
          collaborator.affiliations << aff unless aff.nil?
          present collaborator, with: Entities::CollaboratorEntity, root: 'user'
        end
      end

      namespace :find_add_aff do
        desc 'add user to my collabration'
        params do
          requires :department, type: String
          requires :organization, type: String
          requires :country, type: String
        end
        post do
          aff = Affiliation.where(country: params[:country], organization: params[:organization], department: params[:department]).order(:id).first_or_create
          { id: aff.id, aff_output: aff.output_full }
        end
      end

      namespace :delete do
        desc 'remove user from my collabration'
        params do
          requires :id, type: Integer
        end
        post do
          uc = UsersCollaborator.find_by(user_id: current_user.id, collaborator_id: params[:id])
          uc.delete
          #present user, with: Entities::CollaboratorEntity, root: 'user'
        end
      end

      namespace :delete_aff do
        desc 'remove affilication from my collabration'
        params do
          requires :user_id, type: Integer
          requires :aff_id, type: Integer
        end
        post do
          ua = UserAffiliation.find_by(user_id: params[:user_id], affiliation_id: params[:aff_id])
          ua.destroy!

          user = User.find(params[:user_id])
          present user, with: Entities::CollaboratorEntity, root: 'user'
        end
      end

      namespace :refresh_orcid_aff do
        desc 'refresh affilication from ORCID iD'
        params do
          requires :user_id, type: Integer
        end
        post do
          user = User.find_by(id: params[:user_id])
          if user.type != 'Collaborator' || user.orcid.nil?
            { error: true, message: 'Unable to refresh the affilication from this ORCID iD!' }
          else
            emps = Chemotion::OrcidService.record_employments(user.orcid)
            if emps.nil?
              { error: true, message: 'Unable to fetch the affilication from this ORCID iD!' }
            else
              uas = UserAffiliation.where(user_id: user.id)
              uas.each do |ua|
                next if ua.nil?

                ua.destroy!
              end
              process_orcid_affiliation(user, emps)
              ids = UsersCollaborator.where(user_id: current_user.id).pluck(:collaborator_id)
              data = User.where(id: ids)
              present data, with: Entities::CollaboratorEntity, root: 'authors'
            end
          end
        end
      end

      namespace :load_orcid do
        desc 'refresh affilication from ORCID iD'
        params do
          requires :ids, type: Array[Integer]
        end
        post do
          orcids = User.where(id: params[:ids]).map { |user| { id: user.id, orcid: user.orcid } }
          { orcids: orcids.reject { |oo| oo[:orcid].nil? } }
        end
      end

      namespace :create do
        get_name_abbr = Proc.new do |first_name, last_name, cnt|
          name_abbr = "#{first_name.first.capitalize}#{last_name.first.capitalize}#{cnt}"
          if User.find_by(name_abbreviation: name_abbr).nil?
            name_abbr
          else
            get_name_abbr.call(first_name, last_name, cnt+1)
          end
        end

        desc 'create and add user to my collabration'
        params do
          requires :lastName, type: String
          requires :firstName, type: String
          requires :email, type: String
          optional :orcid, type: String
          requires :department, type: String
          requires :organization, type: String
          requires :country, type: String
        end
        post do
          attributes = {} #declared(params, include_missing: false)
          attributes[:first_name] = params[:firstName]
          attributes[:last_name] = params[:lastName]
          attributes[:type] = 'Person'
          attributes[:confirmed_at] = DateTime.now
          attributes[:name_abbreviation] = get_name_abbr.call(params[:firstName], params[:lastName], 1)
          attributes[:password] = Devise.friendly_token.first(8)
          attributes[:email] = params[:email]
          attributes[:providers] = { orcid: params[:orcid] }
          new_user = User.create!(attributes)
          new_user.profile.update!({data: {}})
          new_user.affiliations = [Affiliation.where(country: params[:country],
            organization: params[:organization], department: params[:department]).order(:id).first_or_create]

          new_author = UsersCollaborator.create({ user_id: current_user.id, collaborator_id: new_user.id })
          present new_user, with: Entities::CollaboratorEntity, root: 'user'
        rescue StandardError => e
          { error: true, message: e.message }
        end
      end
    end
  end
end
