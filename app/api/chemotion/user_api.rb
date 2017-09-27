# frozen_string_literal: true

module Chemotion
  class UserAPI < Grape::API
    resource :users do
      desc 'Find top 3 matched user names'
      params do
        requires :name, type: String
      end
      get 'name' do
        if params[:name].present? && params[:name].gsub(/\s/, '').size > 3
          {
            users: User.where(type: %w[Person Group]).where.not(confirmed_at: nil)
                       .by_name(params[:name]).limit(3).joins(:affiliations)
                       .select(
                         'first_name', 'last_name', 'name', 'id', 'name_abbreviation',
                         'name_abbreviation as abb', 'type as user_type',
                         'jsonb_object_agg(affiliations.id, affiliations.department || chr(44)|| chr(32) || affiliations.organization || chr(44)|| chr(32) || affiliations.country) as aff'
                       ).group('first_name', 'last_name', 'name', 'id', 'name_abbreviation')
          }
        else
          { users: [] }
        end
      end

      desc 'Return current_user'
      get 'current' do
        present current_user, with: Entities::UserEntity, root: 'user'
      end

      desc 'list user labels'
      get 'list_labels' do
        labels = UserLabel.where('user_id = ? or access_level >= 1', current_user.id)
                          .order('access_level desc, position, title')
        present labels || [], with: Entities::UserLabelEntity, root: 'labels'
      end

      desc 'list structure editors'
      get 'list_editors' do
        editors = []
        %w[chemdrawEditor marvinjsEditor ketcher2Editor].each { |str| editors.push(str) if current_user.matrix_check_by_name(str) }
        present Matrice.where(name: editors).order('name'), with: Entities::MatriceEntity, root: 'matrices'
      end

      namespace :omniauth_providers do
        desc "get omniauth providers"
        get do
          { providers: Devise.omniauth_configs.keys, current_user: current_user }
        end
      end

      namespace :save_label do
        desc 'create or update user labels'
        params do
          optional :id, type: Integer
          optional :title, type: String
          optional :description, type: String
          optional :color, type: String
          optional :access_level, type: Integer
        end
        put do
          attr = {
            id: params[:id],
            user_id: current_user.id,
            access_level: params[:access_level] || 0,
            title: params[:title],
            description: params[:description],
            color: params[:color]
          }
          if params[:id].present?
            label = UserLabel.find(params[:id])
            label.update!(attr)
          else
            UserLabel.create!(attr)
          end
        end
      end

      namespace :update_counter do
        desc 'create or update user labels'
        params do
          optional :type, type: String
          optional :counter, type: Integer
        end
        put do
          counters = current_user.counters
          counters[params[:type]] = params[:counter]
          current_user.update(counters: counters)
        end
      end

      namespace :scifinder do
        desc 'scifinder-n credential'
        get do
          ScifinderNCredential.find_by(created_by: current_user.id) || {}
        end
      end

      desc 'Log out current_user'
      delete 'sign_out' do
        status 204
      end
    end

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
            aff = Affiliation.find_or_create_by(country: country, organization: org, department: dep)
            UserAffiliation.create(user_id: user.id, affiliation_id: aff.id, from: from, to: to)
          end
        end
      end

      namespace :list do
        desc 'fetch collaborators of current user'
        get do
          ids = UsersCollaborator.where(user_id: current_user.id).pluck(:collaborator_id)
          data = User.where(id: ids)
          present data, with: Entities::CollaboratorEntity, root: 'authors'
        end
      end

      namespace :orcid do
        desc 'fetch collaborators by orcid'
        params do
          requires :orcid, type: String
        end
        get do
          erro_msg = nil
          sql_str = ["id in (select user_id from profiles p where p.data->>'ORCID' = ?) ", params[:orcid]]
          collaborator = User.where(type: %w[Person Collaborator]).where(sql_str).order('type desc')&.first

          if collaborator.nil?
            result = Chemotion::OrcidService.record_person(params[:orcid])

            if result.nil?
              erro_msg = 'ORCID does not exist! Please check.'
            elsif result.person&.family_name.nil?
              erro_msg = 'Last name can not be blank!'
            else
              attributes = {}
              attributes[:first_name] = result&.person&.given_names
              attributes[:last_name] = result.person&.family_name
              attributes[:type] = 'Collaborator'
              attributes[:confirmed_at] = DateTime.now
              attributes[:name_abbreviation] = "c#{SecureRandom.random_number(9999)}"
              attributes[:password] = Devise.friendly_token.first(8)
              attributes[:email] = "#{current_user.name_abbreviation}.#{attributes[:name_abbreviation]}@chemotion.net"
              new_collaborator = User.create!(attributes)
              new_collaborator.profile.update!(data: { "ORCID": params[:orcid] })
              UsersCollaborator.create(user_id: current_user.id, collaborator_id: new_collaborator.id)
              emps = Chemotion::OrcidService.record_employments(params[:orcid])
              process_orcid_affiliation(new_collaborator, emps)
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
            ids = UsersCollaborator.where(user_id: current_user.id).pluck(:collaborator_id)
            data = User.where(id: ids)
            present data, with: Entities::CollaboratorEntity, root: 'authors'
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
        end
        get do
          sql_str = []
          if params[:name].present? && params[:first].present?
            sql_str = [" LOWER(last_name) like ? and LOWER(first_name) like ? ",'%'+params[:name].downcase+'%','%'+params[:first].downcase+'%']
          end
          if !params[:name].present? && params[:first].present?
            sql_str = [" LOWER(first_name) LIKE ? ",'%'+params[:first].downcase+'%']
          end
          if params[:name].present? && !params[:first].present?
            sql_str = [" LOWER(last_name) LIKE ? ",'%'+params[:name].downcase+'%']
          end

          extr_sql = "(type='Person' or (type='Collaborator' and id in (select user_id from profiles where cast(data->>'ORCID' as text) is not null)))"
          data = User.where.not(confirmed_at: nil).where(sql_str).where(extr_sql)
          present data, with: Entities::CollaboratorEntity, root: 'users'
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
          aff = [Affiliation.find_or_create_by(country: params[:country],
            organization: params[:organization], department: params[:department])]
          collaborator.affiliations << aff unless aff.nil?
          present collaborator, with: Entities::CollaboratorEntity, root: 'user'
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
        desc 'refresh affilication from orcid'
        params do
          requires :user_id, type: Integer
        end
        post do
          user = User.find_by(id: params[:user_id])
          if user.type != 'Collaborator' || user.orcid.nil?
            { error: true, message: 'Unable to refresh the affilication from this ORCID!' }
          else
            emps = Chemotion::OrcidService.record_employments(user.orcid)
            if emps.nil?
              { error: true, message: 'Unable to fetch the affilication from this ORCID!' }
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

      namespace :create do
        desc 'create and add user to my collabration'
        params do
          requires :lastName, type: String
          requires :firstName, type: String
          optional :email, type: String
          requires :department, type: String
          requires :organization, type: String
          requires :country, type: String
        end
        post do
          attributes = {} #declared(params, include_missing: false)
          attributes[:first_name] = params[:firstName]
          attributes[:last_name] = params[:lastName]
          attributes[:type] = 'Collaborator'
          attributes[:confirmed_at] = DateTime.now
          attributes[:name_abbreviation] = "c#{SecureRandom.random_number(9999)}"
          attributes[:password] = Devise.friendly_token.first(8)
          attributes[:email] = "#{current_user.name_abbreviation}.#{attributes[:name_abbreviation]}@chemotion.net"
          new_user = User.create!(attributes)
          new_user.profile.update!({data: {}})
          new_user.affiliations = [Affiliation.find_or_create_by(country: params[:country],
            organization: params[:organization], department: params[:department])]

          new_author = UsersCollaborator.create({ user_id: current_user.id, collaborator_id: new_user.id })
          present new_user, with: Entities::CollaboratorEntity, root: 'user'
        end
      end
    end

    resource :groups do
      rescue_from ActiveRecord::RecordInvalid do |error|
        message = error.record.errors.messages.map do |attr, msg|
          "%s %s" % [attr, msg.first]
        end
        error!(message.join(', '), 404)
      end

      namespace :create do
        desc 'create a group of persons'
        params do
          requires :group_param, type: Hash do
            requires :first_name, type: String
            requires :last_name, type: String
            optional :email, type: String, regexp: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
            requires :name_abbreviation, type: String
            optional :users, type: Array[Integer]
          end
        end

        after_validation do
          users = params[:group_param][:users] || []
          @group_params = declared(params, include_missing: false).symbolize_keys[:group_param]
          @group_params[:email] ||= "%i@eln.edu" % [Time.now.getutc.to_i]
          @group_params[:password] = Devise.friendly_token.first(8)
          @group_params[:password_confirmation] = @group_params[:password]
          @group_params[:users] = User.where(id: [current_user.id] + users)
          @group_params[:admins] = User.where(id: current_user.id)
        end

        post do
          new_group = Group.new(@group_params)
          present new_group, with: Entities::GroupEntity, root: 'group' if new_group.save!
        end
      end

      namespace :qrycurrent do
        desc 'fetch groups of current user'
        get do
          data = current_user.groups | current_user.administrated_accounts.where(type: 'Group').distinct
          present data, with: Entities::GroupEntity, root: 'currentGroups'
        end
      end

      namespace :queryCurrentDevices do
        desc 'fetch devices of current user'
        get do
          data = [current_user.devices + current_user.groups.map(&:devices)].flatten.uniq
          present data, with: Entities::DeviceEntity, root: 'currentDevices'
        end
      end

      namespace :deviceMetadata do
        desc 'Get deviceMetadata by device id'
        params do
          requires :device_id, type: Integer, desc: 'device id'
        end
        route_param :device_id do
          get do
            present DeviceMetadata.find_by(device_id: params[:device_id]), with: Entities::DeviceMetadataEntity, root: 'device_metadata'
          end
        end
      end

      namespace :upd do
        desc 'update a group of persons'
        params do
          requires :id, type: Integer
          optional :rm_users, type: Array
          optional :add_users, type: Array
          optional :destroy_group, type: Boolean, default: false
        end

        after_validation do
          if current_user.administrated_accounts.where(id: params[:id]).empty? &&
             !params[:rm_users].nil? && current_user.id != params[:rm_users][0]
            error!('401 Unauthorized', 401)
          end
        end

        put ':id' do
          group = Group.find(params[:id])
          if params[:destroy_group]
            User.find_by(id: params[:id])&.remove_from_matrices
            { destroyed_id: params[:id] } if group.destroy!
          else
            new_users =
              (params[:add_users] || []).map(&:to_i) - group.users.pluck(:id)
            rm_users = (params[:rm_users] || []).map(&:to_i)
            group.users << Person.where(id: new_users)
            group.save!
            group.users.delete(User.where(id: rm_users))
            User.gen_matrix(rm_users) if rm_users&.length&.positive?
            present group, with: Entities::GroupEntity, root: 'group'
          end
        end
      end
    end

    resource :devices do
      params do
        optional :id, type: String, regexp: /\d+/, default: '0'
        optional :status, type: String
      end

      get :novnc do
        if params[:id] != '0'
          devices = Device.by_user_ids(user_ids).novnc.where(id: params[:id]).includes(:profile)
        else
          devices = Device.by_user_ids(user_ids).novnc.includes(:profile)
        end
        present devices, with: Entities::DeviceNovncEntity, root: 'devices'
      end

      get 'current_connection' do
        path = Rails.root.join('tmp/novnc_devices', params[:id])
        cmd = "echo '#{current_user.id},#{params[:status] == 'true' ? 1 : 0}' >> #{path};LINES=$(tail -n 8 #{path});echo \"$LINES\" | tee #{path}"
        { result: Open3.popen3(cmd) { |i, o, e, t| o.read.split(/\s/) } }
      end
    end
  end
end
