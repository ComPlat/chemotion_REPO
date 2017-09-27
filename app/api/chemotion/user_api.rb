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
                         'name_abbreviation as abb',
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

      desc 'Log out current_user'
      delete 'sign_out' do
        status 204
      end
    end

    resource :collaborators do
      namespace :list do
        desc 'fetch collaborators of current user'
        get do
          ids = UsersCollaborator.where(user_id: current_user.id).pluck(:collaborator_id)
          data = User.where(id: ids)
          present data, with: Entities::CollaboratorEntity, root: 'authors'
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

          data = Person.where.not(confirmed_at: nil).where(sql_str)
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
        message = error.record.errors.messages.map { |attr, msg|
          "%s %s" % [attr, msg.first]
        }
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
          data = current_user.groups | current_user.administrated_accounts
                                              .where(type: 'Group').uniq
          present data, with: Entities::GroupEntity, root: 'currentGroups'
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
            { destroyed_id: params[:id] } if group.destroy!
          else
            new_users =
              (params[:add_users] || []).map(&:to_i) - group.users.pluck(:id)
            rm_users = (params[:rm_users] || []).map(&:to_i)
            group.users << Person.where(id: new_users)
            group.save!
            group.users.delete(User.where(id: rm_users))
            group
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
