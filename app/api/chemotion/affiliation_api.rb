# frozen_string_literal: true

module Chemotion
  class AffiliationAPI < Grape::API
    helpers AffiliationHelpers
    namespace :public do
      namespace :affiliations do
        params do
          optional :domain, type: String, desc: 'email domain', regexp: /\A([a-z\d\-]+\.)+[a-z]{2,64}\z/i
        end

        desc 'Return all affiliation data (countries, organizations, departments, and groups) in a hierarchical structure'
        get 'all_data' do
          # Get all countries
          countries = ISO3166::Country.all_translated

          # Query for all distinct organizations, departments, and groups
          affiliations = Affiliation.select('DISTINCT organization, department, "group", country, ror_id')

          # Build hierarchical structure
          organizations = {}

          affiliations.each do |aff|
            org = aff.organization
            dept = aff.department
            group = aff.group

            # Skip empty values
            next if org.blank?

            # Initialize organization entry if not exists
            organizations[org] ||= {
              ror_id: aff.ror_id,
              country: aff.country,
              departments: {}
            }

            # Only add department if it exists
            if dept.present?
              # Initialize department entry if not exists
              organizations[org][:departments][dept] ||= {
                groups: []
              }

              # Only add group if it exists
              if group.present?
                organizations[org][:departments][dept][:groups] << group unless
                  organizations[org][:departments][dept][:groups].include?(group)
              end
            end
          end

          # Return result in the expected format
          {
            countries: countries,
            organizations: organizations
          }
        end

        # Keep groups endpoint for backward compatibility
        desc 'Return all current groups'
        get 'groups' do
          Affiliation.pluck('DISTINCT "group"')
        end
      end
    end

    # user_affiliations resource
    namespace :affiliations do
      before do
        @affiliations = current_user.user_affiliations.includes(:affiliation)
      end
      desc 'get user affiliations'
      get  do
        @affiliations.order(to: :desc, from: :desc, created_at: :desc)
                     .as_json(methods: %i[country organization department group ror_id])
      end

      desc 'create user affiliation'
      params do
        requires :organization, type: String, desc: 'organization', allow_blank: false
        optional :country, type: String, desc: 'country'
        optional :department, type: String, desc: 'department'
        optional :group, type: String, desc: 'working group'
        optional :from, type: String, desc: 'from'
        optional :to, type: String, desc: 'to'
      end
      post do
        attributes = declared(params, include_missing: false).compact_blank
        from = attributes.delete(:from)
        from = from.present? ? Date.strptime(from, '%Y-%m') : nil
        to = attributes.delete(:to)
        to = to.present? ? Date.strptime(to, '%Y-%m').end_of_month : nil

        # Look up ROR data for the organization
        organization_name = attributes[:organization]
        country = attributes[:country]
        ror_result = lookup_ror_data(organization_name, country)

        if ror_result && ror_result[:ror_id].present?
          # Update attributes with ROR data
          attributes[:ror_id] = ror_result[:ror_id]
          attributes[:original_organization] ||= organization_name
          attributes[:organization] = ror_result[:name] || organization_name
          if ror_result[:country].present?
            attributes[:country] = ror_result[:country]
          end
        end

        ua_attributes = {
          user_id: current_user.id,
          affiliation: Affiliation.find_or_create_by(attributes),
          from: from,
          to: to,
        }.compact_blank

        UserAffiliation.create(ua_attributes)
        status 201
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end

      desc 'update user affiliation'
      params do
        requires :id, type: Integer, desc: 'user_affiliation id'
        requires :organization, type: String, desc: 'organization', allow_blank: false
        optional :country, type: String, desc: 'country'
        optional :department, type: String, desc: 'department'
        optional :group, type: String, desc: 'working group'
        optional :from, type: String, desc: 'from'
        optional :to, type: String, desc: 'to'
      end
      route_param :id do
        put do
          attributes = declared(params, include_missing: false).compact_blank

          # Look up ROR data for the organization
          organization_name = attributes[:organization]
          country = attributes[:country]
          ror_result = lookup_ror_data(organization_name, country)

          # Prepare affiliation attributes
          affiliation_attributes = attributes.except(:from, :to, :id)

          if ror_result && ror_result[:ror_id].present?
            # Update attributes with ROR data
            affiliation_attributes[:ror_id] = ror_result[:ror_id]
            affiliation_attributes[:original_organization] ||= organization_name
            affiliation_attributes[:organization] = ror_result[:name] || organization_name
            if ror_result[:country].present?
              affiliation_attributes[:country] = ror_result[:country]
            end
          end

          affiliation = Affiliation.find_or_create_by(affiliation_attributes)

          ua_attributes = {
            affiliation_id: affiliation.id,
            to: attributes[:to].present? ? Date.strptime(attributes[:to], '%Y-%m').end_of_month : nil,
            from: attributes[:from].present? ? Date.strptime(attributes[:from], '%Y-%m') : nil,
          }.compact_blank

          @affiliations.find(params[:id]).update(ua_attributes)
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      desc 'delete user affiliation'
      delete ':id' do
        u_affiliation = @affiliations.find(params[:id])
        u_affiliation&.destroy!

        # Check if this affiliation is not used by any other users
        if UserAffiliation.where(affiliation_id: u_affiliation.affiliation_id).empty?
          Affiliation.find_by(id: u_affiliation.affiliation_id)&.destroy!
        end

        status 204
        return # Explicitly return to avoid status code being treated as a return value
      rescue ActiveRecord::RecordInvalid => e
        error!({ error: e.message }, 422)
      end
    end
  end
end
