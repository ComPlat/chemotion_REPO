class AllElementSearch
  PG_ELEMENTS = %w[Sample Reaction] # Screen Wellplate]

  def initialize(term)
    @term = term
  end

  def search_by_substring
    Results.new(PgSearch.multisearch(@term))
  end

  class Results
    attr_reader :samples, :results

    def initialize(results)
      @results = results
    end

    def first
      Results.new(@results.first)
    end

    def empty?
      @results.empty?
    end

    def by_collection_id(id, current_user)
      types = if (prof = current_user&.profile&.data)
                (prof.fetch('layout', {'sample' => 1, 'reaction' => 2}).keys.map(&:capitalize)) & PG_ELEMENTS
              else
                PG_ELEMENTS
              end
      sample_filter =
        # <<~SQL
          " searchable_id in ( " \
          " SELECT samples.id FROM samples " \
          " INNER JOIN collections_samples cs on cs.collection_id = #{id} and cs.sample_id = samples.id and cs.deleted_at ISNULL " \
          " EXCEPT " \
          " SELECT samples.id FROM samples " \
          " INNER JOIN reactions_samples rs on rs.sample_id = samples.id and rs.type not in ('ReactionsProductSample') " \
          " WHERE rs.deleted_at ISNULL " \
          " )"
        # SQL
      reaction_filter =
        # <<~SQL
          " searchable_id in ( " \
          " SELECT reactions.id FROM reactions " \
          " INNER JOIN collections_reactions cr on cr.collection_id = #{id} and cr.reaction_id = reactions.id and cr.deleted_at ISNULL " \
          " INNER JOIN reactions_samples rs on rs.reaction_id = reactions.id and rs.type in ('ReactionsProductSample') and rs.deleted_at ISNULL " \
          " )"
        # SQL
      first_type = types.first
      query = "(searchable_type = '#{first_type}' AND searchable_id IN (" \
                "SELECT #{first_type}_id FROM collections_#{first_type}s "\
                "WHERE collection_id = #{id} AND deleted_at IS NULL))"

      query = "(searchable_type = '#{first_type}' AND #{sample_filter} )" if (first_type === 'Sample')
      query = "(searchable_type = '#{first_type}' AND #{reaction_filter} )" if (first_type === 'Reaction')

      if (types.count > 1)
        types[1..-1].each { |type|
          case type
          when 'Sample'
            query = query + " OR (searchable_type = '#{type}' AND #{sample_filter} )"
          when 'Reaction'
            query = query + " OR (searchable_type = '#{type}' AND #{reaction_filter} )"
          else
            query = query +
                    " OR (searchable_type = '#{type}' AND searchable_id IN (" \
                    "SELECT #{type}_id FROM collections_#{type}s "\
                    "WHERE collection_id = #{id} AND deleted_at IS NULL))"
          end
        }
      end

      @results = @results.where(query)
      Results.new(@results)
    end

    def molecules
      filter_results_by_type('Molecule')
    end

    def samples
      filter_results_by_type('Sample')
    end

    def reactions
      filter_results_by_type('Reaction')
    end

    def wellplates
      filter_results_by_type('Wellplate')
    end

    def screens
      filter_results_by_type('Screen')
    end

    def molecules_ids
      filter_results_ids_by_type('Molecule')
    end

    def samples_ids
      filter_results_ids_by_type('Sample')
    end

    def reactions_ids
      filter_results_ids_by_type('Reaction')
    end

    def wellplates_ids
      filter_results_ids_by_type('Wellplate')
    end

    def screens_ids
      filter_results_ids_by_type('Screen')
    end

    private

    def filter_results_by_type(type)
      @results.where(searchable_type: type).includes(:searchable)
    end

    def filter_results_ids_by_type(type)
      @results.where(searchable_type: type).pluck(:searchable_id)
    end
  end
end
