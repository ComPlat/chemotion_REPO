require 'open-uri'
# require './helpers'

module Chemotion
  class ElementAPI < Grape::API
    include Grape::Kaminari

    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers LiteratureHelpers

    namespace :ui_state do
      desc 'Delete elements by UI state'
      params do
        optional :currentCollection, default: Hash.new, type: Hash do
          optional :id, type: Integer
          optional :is_sync_to_me, type: Boolean, default: false
        end
        optional :options, type: Hash do
          optional :deleteSubsamples, type: Boolean, default: false
        end
        optional :sample, type: Hash do
          use :ui_state_params
        end
        optional :reaction, type: Hash do
          use :ui_state_params
        end
        optional :wellplate, type: Hash do
          use :ui_state_params
        end
        optional :screen, type: Hash do
          use :ui_state_params
        end
        optional :research_plan, type: Hash do
          use :ui_state_params
        end
        optional :selecteds, desc: 'Elements currently opened in detail tabs', type: Array do
          optional :type, type: String
          optional :id, type: Integer
        end
      end

      after_validation do
        if params.fetch(:currentCollection, {}).fetch(:id, 0).zero?
          @collection = Collection.get_all_collection_for_user(current_user)
        else
          pl =  case request.request_method
          when 'POST' then -1
                when 'DELETE' then 2
                else 5
                end
          if params[:currentCollection][:is_sync_to_me]
            @s_collection = SyncCollectionsUser.where(
              'id = ? and user_id in (?) and permission_level > ?',
              params[:currentCollection][:id],
              user_ids,
              pl
            ).first
            @collection = Collection.find(@s_collection.collection_id)
          else
            @collection = Collection.where(
              'id = ? AND ((user_id in (?) AND (is_shared IS NOT TRUE OR permission_level > ?)) OR shared_by_id = ?)',
              params[:currentCollection][:id],
              user_ids,
              pl,
              current_user.id
            ).first
          end
        end
        error!('401 Unauthorized', 401) unless @collection
      end

      desc "delete element from ui state selection."
      delete do

        deleted = { 'sample' => [] }
        %w[sample reaction wellplate screen research_plan].each do |element|
          next unless params[element][:checkedAll] || params[element][:checkedIds].present?
          elements = @collection.send(element + 's').by_ui_state(params[element])

          elements.each do |el|
            pub = el.publication

            next if pub.nil?
            pub.update_state(Publication::STATE_DECLINED)
            pub.process_element(Publication::STATE_DECLINED)
            pub.inform_users(Publication::STATE_DECLINED, current_user.id)
          end
          deleted[element] = elements.destroy_all.map(&:id)
        end

        # explicit inner join on reactions_samples to get soft deleted reactions_samples entries
        sql_join = "inner join reactions_samples on reactions_samples.sample_id = samples.id"
        sql_join += " and reactions_samples.type in ('ReactionsSolventSample','ReactionsReactantSample')" unless params[:options][:deleteSubsamples]
        deleted['sample'] += Sample.joins(sql_join).joins(:collections)
          .where(collections: { id: @collection.id }, reactions_samples: { reaction_id: deleted['reaction'] })
          .destroy_all.map(&:id)
        klasses = ElementKlass.find_each do |klass|
          next unless params[klass.name].present? && (params[klass.name][:checkedAll] || params[klass.name][:checkedIds].present?)
          deleted[klass.name] = @collection.send('elements').by_ui_state(params[klass.name]).destroy_all.map(&:id)
        end

        { selecteds: params[:selecteds].select { |sel| !deleted.fetch(sel['type'], []).include?(sel['id']) } }
      end

      desc "return selected elements from the list. (only samples an reactions)"
      post do

        selected = { 'samples' => [], 'reactions' => [] }

        @collection_ids = [@collection.id] + Collection.joins(:sync_collections_users)
        .where('sync_collections_users.collection_id = collections.id and sync_collections_users.user_id = ?', current_user).references(:collections)&.pluck(:id)

        selected['samples'] = Sample.joins(:collections_samples).where('collections_samples.collection_id in (?)',@collection_ids).by_ui_state(params['sample']).distinct.map do |e|
          ElementPermissionProxy.new(current_user, e, user_ids).serialized
        end

        selected['reactions'] = Reaction.joins(:collections_reactions).where('collections_reactions.collection_id in (?)',@collection_ids).by_ui_state(params['reaction']).distinct.map do |e|
          ElementPermissionProxy.new(current_user, e, user_ids).serialized
        end

        # TODO: fallback if sample are not in owned collection and currentCollection is missing
        # (case when cloning report)
        selected
      end

      namespace :load_report do
        desc 'return samples & reactions for a report'
        params do
          optional :currentCollection, default: Hash.new, type: Hash do
            optional :id, type: Integer
            optional :is_sync_to_me, type: Boolean, default: false
          end
          optional :sample, type: Hash do
            use :ui_state_params
          end
          optional :reaction, type: Hash do
            use :ui_state_params
          end
          optional :loadType, type: String
          optional :selectedTags, default: Hash.new, type: Hash do
            optional :sampleIds, type: Array[Integer]
            optional :reactionIds, type: Array[Integer]
          end
        end
        post do
          selected = { 'samples' => [], 'reactions' => [] }
          selectedTags = params['selectedTags']
          %w[sample reaction].each do |element|
            next unless params[element][:checkedAll] || params[element][:checkedIds].present?
            klass = Object.const_get(element.capitalize)
            col_els = @collection.send(element + 's').by_ui_state(params[element])
            col_ids = col_els.map(&:id)
            all_ids = params[element][:checkedIds] || []
            dif_ids = all_ids - col_ids
            dif_els = klass.where(id: dif_ids)
            all_els = (col_els + dif_els).uniq { |x| x.id }

            tags = selectedTags["#{element}Ids".to_sym]
            selected[element + 's'] = all_els.map do |e|
              if params[:loadType] == 'lists'
                if tags && tags.include?(e.id)
                  { id: e.id, in_browser_memory: true }
                else
                  ElementListPermissionProxy.new(current_user, e, user_ids)
                                            .serialized
                end
              else
                se = ElementPermissionProxy.new(current_user, e, user_ids)
                                            .serialized
                se[:literatures] = citation_for_elements(e.id, e.class.to_s)
                se
              end
            end
          end
          selected
        end
      end
    end
  end
end
