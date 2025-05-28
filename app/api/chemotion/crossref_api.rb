# frozen_string_literal: true

module Chemotion
  class CrossrefAPI < Grape::API
    include Grape::Kaminari

    helpers do
      def can_access_element?(element, action)
        action = action.to_s
        return false if current_user.blank? && action != 'read'

        case action
        when 'read'
          can_read_access?(element)
        when 'update'
          can_update_access?(element)
        else
          false
        end
      end

      def can_read_access?(element)
        return true if element.publication&.state == 'completed'
        return false if current_user.blank?

        permission_granted?(element, 'read')
      end

      def can_update_access?(element)
        permission_granted?(element, 'update')
      end

      def element_permission_granted?(element, action)
        ElementPolicy.new(current_user, element).public_send(:"#{action}?")
      end

      def publication_permission_granted?(element)
        element.publication&.published_by == current_user.id || User.reviewer_ids.include?(current_user.id)
      end

      def permission_granted?(element, action)
        case element
        when Sample, Reaction
          element_permission_granted?(element, action) || publication_permission_granted?(element)
        when Collection
          publication_permission_granted?(element)
        else
          false
        end
      end

      def can_update_element?(element)
        can_access_element?(element, :update)
      end

      def can_read_element?(element)
        can_access_element?(element, :read)
      end
    end

    namespace :public do
      desc 'Get all funding records for an element'
      params do
        requires :element_type, type: String, values: %w[Sample Reaction Collection], desc: 'Type of element'
        requires :element_id, type: Integer, desc: 'ID of the element'
        optional :aggregate, type: Boolean, default: false, desc: 'Whether to aggregate funding records'
      end
      get :get_funder do
        # Verify that the element exists and user has access
        element_class = params[:element_type].constantize
        element = element_class.find(params[:element_id])

        error!('Unauthorized', 401) unless element.present? && can_read_element?(element)

        # Get all funding records for this element
        fundings = element.fundings&.order(:created_at) || []

        # Apply aggregation if requested
        if params[:aggregate]
          embargo = Repo::FetchHandler.publication_collection_by_element(element.class.name, element.id) if element.publication.present?
          embargo_fundings = embargo.fundings&.order(:created_at) if embargo.present?
          fundings = embargo_fundings + fundings if embargo_fundings.present?
        end

        present fundings, with: Entities::FundingEntity
      end
    end

    namespace :crossref do
      desc 'Store funder information as individual funding record'
      params do
        requires :element_type, type: String, values: %w[Sample Reaction Collection], desc: 'Type of element'
        requires :element_id, type: Integer, desc: 'ID of the element to tag'
        requires :funder_data, type: Hash, desc: 'Funder data' do
          requires :fundingType, type: String, desc: 'Funding type'
          requires :name, type: String, desc: 'Funder name'
          optional :uri, type: String, desc: 'Funder URI/identifier'
          optional :awardUri, type: String, desc: 'Award/Project URI'
          optional :awardTitle, type: String, desc: 'Award/Project title'
          optional :awardNumber, type: String, desc: 'Award/Project number'
        end
      end
      post :add_funder do
        # Verify that the element exists and user has access
        element_class = params[:element_type].constantize
        element = element_class.find(params[:element_id])

        # Check if user has permission to modify this element
        error!('Unauthorized', 401) unless element.present? && can_update_element?(element)

        # Prepare funding metadata for individual record
        funding_metadata = {
          funderName: params[:funder_data][:name],
          funderIdentifier: params[:funder_data][:uri],
          funderIdentifierType: params[:funder_data][:fundingType],
          awardNumber: params[:funder_data][:awardNumber] || '',
          awardTitle: params[:funder_data][:awardTitle] || '',
          awardUri: params[:funder_data][:awardUri] || '',
        }

        # Create a new individual funding record
        funding = Funding.create!(
          element_type: params[:element_type],
          element_id: params[:element_id],
          metadata: funding_metadata,
          created_by: current_user.id,
        )

        present funding, with: Entities::FundingEntity
      end

      desc 'Remove individual funding record'
      params do
        requires :funding_id, type: Integer, desc: 'ID of the funding record to remove'
      end
      delete :remove_funder do
        # Find the funding record by ID
        funding = Funding.find_by(id: params[:funding_id])
        error!('Not found', 404) if funding.blank?

        # Check permissions
        element = funding.fundable
        error!('Unauthorized', 401) unless element.present? && can_update_element?(element)

        # Set the deleter before soft deletion
        funding.update!(deleted_by: current_user.id)

        # Soft delete the funding record
        funding.destroy!

        { success: true, message: 'Funding record removed successfully' }
      end
    end
  end
end
