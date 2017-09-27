require 'securerandom'
module Chemotion
  class RepositoryAPI < Grape::API
    include Grape::Kaminari
    helpers ContainerHelpers
    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers SampleHelpers
    helpers SubmissionHelpers

    namespace :repository do
      helpers do
        def fetch_embargo_collection(cid)
          if (cid == 0)
            chemotion_user = User.chemotion_user
            new_col_label = current_user.initials + '_' + Time.now.strftime("%Y-%m-%d")
            col_check = Collection.where([" label like ? ", new_col_label+'%'])
            new_col_label = new_col_label << '_' << (col_check&.length+1)&.to_s if col_check&.length > 0
            new_embargo_col = Collection.create!(user: chemotion_user,
            label: new_col_label, ancestry: current_user.publication_embargo_collection.id)
            SyncCollectionsUser.find_or_create_by(user: current_user, shared_by_id: chemotion_user.id, collection_id: new_embargo_col.id,
            permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10,
            fake_ancestry: current_user.publication_embargo_collection.sync_collections_users.first.id.to_s)
            new_embargo_col
          else
            Collection.find(cid)
          end
        end

        def duplicate_analyses(new_element, analyses_arr, ik = nil)
          unless new_element.container
            Container.create_root_container(containable: new_element)
            new_element.reload
          end
          analyses = Container.analyses_container(new_element.container.id).first
          parent_publication = new_element.publication
          analyses_arr && analyses_arr.each do |ana|
            new_ana = analyses.children.create(
              name: ana.name,
              container_type: ana.container_type,
              description: ana.description
            )
            new_ana.extended_metadata = ana.extended_metadata
            new_ana.save!

            # move reserved doi
            if (d = ana.doi)
              d.update(doiable: new_ana)
            else
              d = Doi.create_for_analysis!(new_ana, ik)
            end
            Publication.create!(
              state: Publication::STATE_PENDING,
              element: new_ana,
              original_element: ana,
              published_by: current_user.id,
              doi: d,
              parent: new_element.publication,
              taggable_data: @publication_tag.merge(
                author_ids: @author_ids
              )
            )
            # duplicate datasets and copy attachments
            ana.children.where(container_type: 'dataset').each do |ds|
              new_dataset = new_ana.children.create(container_type: "dataset")
              ds.attachments.each do |att|
                copied_att = att.copy(attachable_type: 'Container', attachable_id: new_dataset.id, transferred: true)
                copied_att.save!
                new_dataset.attachments << copied_att

                # copy publication image file to public/images/publications/{attachment.id}/{attachment.filename}
                if MimeMagic.by_path(copied_att.filename)&.type&.start_with?("image")
                  file_path = File.join('public/images/publications/', copied_att.id.to_s, '/', copied_att.filename)
                  public_path = File.join('public/images/publications/', copied_att.id.to_s)
                  FileUtils.mkdir_p(public_path)
                  File.write(file_path, copied_att.store.read_file.force_encoding("utf-8")) if copied_att.store.file_exist?
                end

              end

              new_dataset.name = ds.name
              new_dataset.extended_metadata = ds.extended_metadata
              new_dataset.save!
            end
          end
        end

        def reviewer_collections
          c = current_user.pending_collection
          User.reviewer_ids.each do |rev_id|
            SyncCollectionsUser.find_or_create_by(
              collection_id: c.id,
              user_id: rev_id,
              shared_by_id: c.user_id,
              permission_level: 3,
              sample_detail_level: 10,
              reaction_detail_level: 10,
              label: "REVIEWING",
            )
          end
        end

        # Create(clone) publication sample/analyses with dois
        def duplicate_sample(sample = @sample, analyses = @analyses, parent_publication_id = nil)
          new_sample = sample.dup
          new_sample.collections << current_user.pending_collection
          new_sample.collections << Collection.element_to_review_collection
          new_sample.collections << @embargo_collection unless @embargo_collection.nil?
          new_sample.save!
          unless @literals.nil?
            lits = @literals&.select { |lit| lit['element_type'] == 'Sample' && lit['element_id'] == sample.id}
            duplicate_literals(new_sample, lits)
          end
          duplicate_analyses(new_sample, analyses, new_sample.molecule.inchikey)
          has_analysis = new_sample.analyses.present?
          if (has_analysis = new_sample.analyses.present?)
            if (d = sample.doi)
              d.update!(doiable: new_sample)
            else
              d = Doi.create_for_element!(new_sample)
            end
            pub = Publication.create!(
              state: Publication::STATE_PENDING,
              element: new_sample,
              original_element: sample,
              published_by: current_user.id,
              doi: d,
              parent_id: parent_publication_id,
              taggable_data: @publication_tag.merge(
                author_ids: @author_ids,
                original_analysis_ids: analyses.pluck(:id),
                analysis_ids: new_sample.analyses.pluck(:id)
              )
            )
          end
          new_sample.analyses.each do |ana|
            Publication.find_by(element: ana).update(parent: pub)
          end
          new_sample
        end

        def concat_author_ids(coauthors = params[:coauthors])
          coauthor_ids = coauthors.map do |coa|
           val = coa.strip
           next val.to_i if val =~ /^\d+$/
           User.where(type: %w(Person Collaborator)).where.not(confirmed_at: nil).find_by(email: val)&.id if val =~ /^\S+@\S+$/
          end.compact
          [current_user.id] + coauthor_ids
        end

        def duplicate_reaction(reaction, analysis_set)
          new_reaction = reaction.dup
          if analysis_set && analysis_set.length > 0
            analysis_set_ids = analysis_set.map(&:id)
            reaction_analysis_set = reaction.analyses.where(id: analysis_set_ids)
          end
          princhi_string, princhi_long_key, princhi_short_key, princhi_web_key = reaction.products_rinchis

          new_reaction.collections << current_user.pending_collection
          new_reaction.collections << Collection.element_to_review_collection
          new_reaction.collections << @embargo_collection unless @embargo_collection.nil?

          # composer = SVG::ReactionComposer.new(paths, temperature: temperature_display_with_unit,
          #                                             solvents: solvents_in_svg,
          #                                             show_yield: true)
          # new_reaction.reaction_svg_file = composer.compose_reaction_svg_and_save(prefix: Time.now)
          dir = File.join(Rails.root, 'public','images','reactions')
          rsf = reaction.reaction_svg_file
          path = File.join(dir, rsf)
          new_rsf = "#{Time.now.to_i}-#{rsf}"
          dest = File.join(dir, new_rsf)

          new_reaction.save!
          unless @literals.nil?
            lits = @literals&.select { |lit| lit['element_type'] == 'Reaction' && lit['element_id'] == reaction.id}
            duplicate_literals(new_reaction, lits)
          end
          if File.exists? path
            FileUtils.cp(path, dest)
            new_reaction.update_columns(reaction_svg_file: new_rsf)
          end
          # new_reaction.save!
          et = new_reaction.tag
          data = et.taggable_data || {}
          # data[:products_rinchi] = {
          #   rinchi_string: princhi_string,
          #   rinchi_long_key: princhi_long_key,
          #   rinchi_short_key: princhi_short_key,
          #   rinchi_web_key:  princhi_web_key
          # }
          et.update!(taggable_data: data)

          if (d = reaction.doi)
            d.update!(doiable: new_reaction)
          else
            # NB: the reaction has still no sample, so it cannot get a proper rinchi needed for the doi
            # => use the one from original reaction
            d = Doi.create_for_element!(new_reaction, "reaction/" + reaction.products_short_rinchikey_trimmed)
          end

          pub = Publication.create!(
            state: Publication::STATE_PENDING,
            element: new_reaction,
            original_element: reaction,
            published_by: current_user.id,
            doi: d,
            taggable_data: @publication_tag.merge(
              author_ids: @author_ids,
              original_analysis_ids: analysis_set_ids,
              products_rinchi: {
                rinchi_string: princhi_string,
                rinchi_long_key: princhi_long_key,
                rinchi_short_key: princhi_short_key,
                rinchi_web_key:  princhi_web_key
              })
          )

          duplicate_analyses(new_reaction, reaction_analysis_set, "reaction/" + reaction.products_short_rinchikey_trimmed)
          reaction.reactions_samples.each  do |rs|
            new_rs = rs.dup
            sample = current_user.samples.find_by(id: rs.sample_id)
            if @scheme_only == true
              sample.target_amount_value = 0.0
              sample.real_amount_value = nil
            end
            sample_analysis_set = sample.analyses.where(id: analysis_set_ids)
            new_sample = duplicate_sample(sample, sample_analysis_set, pub.id)
            sample.tag_as_published(new_sample, sample_analysis_set)
            new_rs.sample_id = new_sample
            new_rs.reaction_id = new_reaction.id
            new_rs.sample_id = new_sample.id
            new_rs.reaction_id = new_reaction.id
            new_rs.save!
          end

          new_reaction.update_svg_file!
          new_reaction.reload
          new_reaction.save!
          new_reaction.reload
        end

        def create_publication_tag(contributor, author_ids, license)
          authors = User.where(type: %w(Person Collaborator), id: author_ids)
                          .includes(:affiliations)
                          .order("position(users.id::text in '#{author_ids}')")
          affiliations = authors.map(&:current_affiliations)
          affiliations_output = {}
          affiliations.flatten.each do |aff|
            affiliations_output[aff.id] = aff.output_full
          end
          {
            published_by: author_ids[0],
            author_ids: author_ids,
            creators: authors.map { |author|
              {
                'givenName' => author.first_name,
                'familyName' => author.last_name,
                'name' => author.name,
                'ORCID' => author.orcid,
                'affiliationIds' => author.current_affiliations.map(&:id),
                'id' => author.id
              }
            },
            contributors: {
              'givenName' => contributor.first_name,
              'familyName' => contributor.last_name,
              'name' => contributor.name,
              'ORCID' => contributor.orcid,
              'affiliations' => contributor.current_affiliations.map{ |aff| aff.output_full },
              'id' => contributor.id
            },
            affiliations: affiliations_output,
            affiliation_ids: affiliations.map { |as| as.map(&:id) },
            queued_at: DateTime.now,
            license: license,
            scheme_only: @scheme_only
          }
        end

        def prepare_reaction_data
          reviewer_collections
          new_reaction = duplicate_reaction(@reaction, @analysis_set)
          reaction_analysis_set = @reaction.analyses.where(id: @analysis_set_ids)
          @reaction.tag_as_published(new_reaction, reaction_analysis_set)
          new_reaction.create_publication_tag(current_user, @author_ids, @license)
          new_reaction.samples.each do |new_sample|
            new_sample.create_publication_tag(current_user, @author_ids, @license)
          end
          Publication.where(element: new_reaction).first
        end

        def duplicate_literals(element,literals)
          literals&.each do |lit|
            attributes = {
             literature_id: lit.literature_id,
             element_id: element.id,
             element_type: lit.element_type,
             category: 'detail',
             user_id: lit.user_id
           }
           Literal.create(attributes)
          end
        end

        def prepare_sample_data
          reviewer_collections
          new_sample = duplicate_sample(@sample, @analyses)
          @sample.tag_as_published(new_sample, @analyses)
          new_sample.create_publication_tag(current_user, @author_ids, @license)
          @sample.untag_reserved_suffix
          Publication.where(element: new_sample).first
        end


        def find_embargo_collection(root_publication)
          has_embargo_col = root_publication.element&.collections&.select { |c| c['ancestry'].to_i == User.find(root_publication.published_by).publication_embargo_collection.id }
          has_embargo_col && has_embargo_col.length > 0 ? has_embargo_col.first.label : ''
       end
      end

      desc 'Get review list'
      params do
        optional :type, type: String, desc: "Type"
        optional :state, type: String, desc: "State"
        optional :page, type: Integer, desc: "page"
        optional :pages, type: Integer, desc: "pages"
        optional :per_page, type: Integer, desc: "per page"

      end
      paginate per_page: 10, offset: 0, max_per_page: 100
      get 'list' do
        type = (params[:type].empty? || params[:type] == 'All') ? ['Sample','Reaction'] : params[:type].chop!
        state = (params[:state].empty? || params[:state] == 'All') ? [Publication::STATE_PENDING, Publication::STATE_REVIEWED, Publication::STATE_ACCEPTED] : params[:state]
        list = if User.reviewer_ids.include?(current_user.id)
                 Publication.where(state: state, ancestry: nil, element_type: type)
               else
                 Publication.where(state: state, ancestry: nil, element_type: type, published_by: current_user.id)
               end.order(updated_at: :desc)
        elements = []
        paginate(list).each do |e|
          element_type = e.element&.class&.name
          next if element_type.nil?

          u = User.find(e.published_by) unless e.published_by.nil?
          svg_file = e.element.reaction_svg_file if element_type == 'Reaction'
          title = e.element.short_label if element_type == 'Reaction'

          svg_file = e.element.sample_svg_file if element_type == 'Sample'
          title = e.element.short_label if element_type == 'Sample'

          scheme_only = element_type == 'Reaction' && e.taggable_data && e.taggable_data['scheme_only']
          elements.push(
            id: e.element_id, svg: svg_file, type: element_type, title: title,
            published_by: u&.name, submit_at: e.updated_at, state: e.state, embargo: find_embargo_collection(e), scheme_only: scheme_only
          )
        end
        { elements: elements }
      end

      desc 'Get embargo list'
      get 'embargo_list' do
        if (current_user.type == 'Anonymous')
          cols = Collection.where(id: current_user.sync_in_collections_users.pluck(:collection_id)).where.not(label: 'chemotion').order('label ASC')
        else
          cols = Collection.where(ancestry: current_user.publication_embargo_collection.id).order('label ASC')
        end
        { repository: cols, current_user: {id: current_user.id, type: current_user.type} }
      end

      resource :reaction do
        helpers RepositoryHelpers
        desc "Return PUBLISHED serialized reaction"
        params do
          requires :id, type: Integer, desc: "Reaction id"
          optional :is_public, type: Boolean, default: true
        end
        get do
          reaction = Reaction.where(id: params[:id])
          .select(
            <<~SQL
            reactions.id, reactions.name, reactions.description, reactions.reaction_svg_file, reactions.short_label,
            reactions.status, reactions.tlc_description, reactions.tlc_solvents, reactions.rf_value,
            reactions.temperature, reactions.timestamp_start,reactions.timestamp_stop,reactions.observation,
            reactions.rinchi_string, reactions.rinchi_long_key, reactions.rinchi_short_key,reactions.rinchi_web_key,
            (select json_extract_path(taggable_data::json, 'publication') from publications where element_type = 'Reaction' and element_id = reactions.id) as publication,
            reactions.duration
            SQL
          ).includes(container: :attachments).last
          literatures = get_literature(params[:id], 'Reaction', params[:is_public] ? 'public' : 'detail') || []
          reaction.products.each do |p|
            literatures += get_literature(p.id,'Sample', params[:is_public]? 'public' : 'detail')
          end
          schemeList = get_reaction_table(params[:id])
          publication = Publication.find_by(element_id: params[:id], element_type: 'Reaction')
          published_user = User.find(publication.published_by) unless publication.nil?
          entities = Entities::ReactionEntity.represent(reaction, serializable: true)
          entities[:literatures] = literatures unless entities.nil? || literatures.blank?
          entities[:schemes] = schemeList unless entities.nil? || schemeList.blank?
          { reaction: entities, reviewLevel: repo_review_level(params[:id], 'Reaction'), pub_name: published_user&.name || '' }
        end
      end

      resource :sample do
        helpers RepositoryHelpers
        desc "Return Review serialized Sample"
        params do
          requires :id, type: Integer, desc: "Sample id"
          optional :is_public, type: Boolean, default: true
        end
        get do
          sample = Sample.where(id: params[:id])
          .includes(:molecule,:tag).last
          molecule = Molecule.find(sample.molecule_id) unless sample.nil?
          containers = Entities::ContainerEntity.represent(sample.container)
          publication = Publication.find_by(element_id: params[:id], element_type: 'Sample')
          published_user = User.find(publication.published_by) unless publication.nil?
          literatures = get_literature(params[:id], 'Sample', params[:is_public]? 'public' : 'detail')
          {
            molecule: MoleculeGuestSerializer.new(molecule).serializable_hash.deep_symbolize_keys,
            sample: sample,
            publication: publication,
            literatures: literatures,
            analyses: containers,
            doi: Entities::DoiEntity.represent(sample.doi, serializable: true),
            pub_name: published_user&.name,
            reviewLevel: repo_review_level(params[:id], 'Sample')
          }
        end
      end

      resource :metadata do
        desc "metadata of publication"
        params do
          requires :id, type: Integer, desc: "Id"
          requires :type, type: String, desc: "Type", values: %w[sample reaction]
        end
        after_validation do
          @root_publication = Publication.find_by(
            element_type: params['type'].classify,
            element_id: params['id']
          ).root
          error!('404 Publication not found', 404) unless @root_publication
          error!('401 Unauthorized', 401) unless (User.reviewer_ids.include?(current_user.id) || @root_publication.published_by == current_user.id)
        end
        post :preview do
          mt = []
          root_publication = @root_publication
          publications = [root_publication] + root_publication.descendants
          publications.each do |pub|
            mt.push({element_type: pub.element_type, metadata_xml: pub.datacite_metadata_xml})
          end
          { metadata: mt }
        end
        post :preview_zip do
          env['api.format'] = :binary
          content_type('application/zip, application/octet-stream')
          root_publication = @root_publication
          publications = [root_publication] + root_publication.descendants
          filename = URI.escape("metadata_#{root_publication.element_type}_#{root_publication.element_id}-#{Time.new.strftime("%Y%m%d%H%M%S")}.zip")
          header('Content-Disposition', "attachment; filename=\"#{filename}\"")
          zip = Zip::OutputStream.write_buffer do |zip|
            publications.each do |pub|
              el_type = pub.element_type == "Container" ? "analysis" : pub.element_type.downcase
              zip.put_next_entry URI.escape("metadata_#{el_type}_#{pub.element_id}.xml")
              zip.write pub.datacite_metadata_xml
            end
          end
          zip.rewind
          zip.read
        end
      end

      namespace :reviewing do
        helpers do
          # TODO: mv to model
          def save_comments(root, comments, summary, feedback)
            review = root.review || {}
            review['summary'] = summary
            review['feedback'] = feedback
            root.update!(review: review)
          end

          # TODO: mv to model
          def save_comment(root, comment)
            review = root.review || {}
            if review.empty?
              root.update_column(:review, { comments: comment })
            else
              comments = review['comments'] || {}
              review['comments'] = comments.deep_merge(comment || {})
              root.update!(review: review)
              root.review
            end
          end

          def accept_new_sample(root, sample)
            ap = Publication.create!(
              state: Publication::STATE_PENDING,
              element: sample,
              doi: sample.doi,
              published_by: root.published_by,
              parent: root,
              taggable_data: root.taggable_data
            )
            sample.analyses.each do |a|
              accept_new_analysis(ap, a)
            end
          end

          def accept_new_analysis(root, analysis)
            ap = Publication.create!(
              state: Publication::STATE_PENDING,
              element: analysis,
              doi: analysis.doi,
              published_by: root.published_by,
              parent: root,
              taggable_data: root.taggable_data
            )
            atag = ap.taggable_data
            aids = atag&.delete('analysis_ids')
            aoids = atag&.delete('original_analysis_ids')
            ap.save! if aids || aoids

            analysis.children.where(container_type: "dataset").each do |ds|
              ds.attachments.each do |att|
                if MimeMagic.by_path(att.filename)&.type&.start_with?("image") && att.store.file_exist?
                  file_path = File.join('public/images/publications/', att.id.to_s, '/', att.filename)
                  public_path = File.join('public/images/publications/', att.id.to_s)
                  FileUtils.mkdir_p(public_path)
                  File.write(file_path, att.store.read_file.force_encoding("utf-8")) if att.store.file_exist?
                end
              end
            end
          end

          def element_submit(root)
            root.descendants.each { |np| np.destroy! if np.element.nil? }
            root.element.reserve_suffix
            root.element.reserve_suffix_analyses(root.element.analyses) if root.element.analyses&.length > 0
            root.element.analyses&.each do |a|
              accept_new_analysis(root, a) if Publication.find_by(element: a).nil?
            end

            case root.element_type
            when 'Sample'
              analyses_ids = root.element.analyses.pluck(:id)
              root.update!(taggable_data: root.taggable_data.merge(analysis_ids: analyses_ids))
              root.element.analyses.each do |sa|
                accept_new_analysis(root,ana) if Publication.find_by(element: sa).nil?
              end

            when 'Reaction'
              root.element.products.each do |p|
                Publication.find_by(element_type:'Sample', element_id: p.id)&.destroy! if p.analyses&.length == 0
                next if p.analyses&.length == 0
                p.reserve_suffix
                p.reserve_suffix_analyses(p.analyses)
                prod_pub = Publication.find_by(element: p);
                if prod_pub.nil?
                  accept_new_sample(root, p)
                else
                  p.analyses.each do |rpa|
                    accept_new_analysis(prod_pub,rpa) if Publication.find_by(element: rpa).nil?
                  end
                end
              end
            end
            root.reload
            root.update_columns(doi_id: root.element.doi.id) unless root.doi_id == root.element.doi.id
            root.descendants.each { |pub_a|
              next if pub_a.element.nil?
              pub_a.update_columns(doi_id: pub_a.element.doi.id) unless pub_a.doi_id == pub_a.element&.doi&.id
            }
          end

          def public_literature(root_publication)
            publications = [root_publication] + root_publication.descendants
            publications.each do |pub|
              next unless pub.element_type=='Reaction' || pub.element_type =='Sample'
              literals = Literal.where(element_type: pub.element_type, element_id: pub.element_id)
              literals&.each { |l| l.update_columns(category: 'public') } unless literals.nil?
            end
          end

        end

        desc "process reviewed publication"
        params do
          requires :id, type: Integer, desc: "Id"
          requires :type, type: String, desc: "Type", values: %w[sample reaction]
          optional :comments, type: Hash
          optional :summary, type: String
          optional :feedback, type: String
        end

        after_validation do
          @root_publication = Publication.find_by(
            element_type: params['type'].classify,
            element_id: params['id']
          ).root
          error!('401 Unauthorized', 401) unless ((User.reviewer_ids.include?(current_user.id) && @root_publication.state == Publication::STATE_PENDING) || (@root_publication.published_by == current_user.id && @root_publication.state == Publication::STATE_REVIEWED ))
        end

        post :comments do
          save_comments(
            @root_publication,
            params[:comments],
            params[:summary],
            params[:feedback]
          ) unless params[:comments].nil? && params[:summary].nil? && params[:feedback].nil?
          @root_publication.element
        end

        post :comment do
          save_comment(@root_publication, params[:comments]) unless params[:comments].nil?
          @root_publication.review
        end

        post :reviewed do
          save_comments(@root_publication, params[:comments], params[:summary], params[:feedback]) unless params[:comments].nil? && params[:summary].nil? && params[:feedback].nil?
          element_submit(@root_publication)
          @root_publication.update_state(Publication::STATE_REVIEWED)
          @root_publication.process_element(Publication::STATE_REVIEWED)
          @root_publication.inform_users(Publication::STATE_REVIEWED)
          @root_publication.element
        end

        post :submit do
          save_comments(@root_publication, params[:comments], params[:summary], params[:feedback]) unless params[:comments].nil? && params[:summary].nil? && params[:feedback].nil?
          element_submit(@root_publication)
          @root_publication.update_state(Publication::STATE_PENDING)
          @root_publication.process_element(Publication::STATE_PENDING)
          @root_publication.inform_users(Publication::STATE_PENDING)
          @root_publication.element
        end

        post :accepted do
          save_comments(@root_publication, params[:comments], params[:summary], params[:feedback]) unless params[:comments].nil? && params[:summary].nil? && params[:feedback].nil?
          element_submit(@root_publication)
          public_literature(@root_publication)
          # element_accepted(@root_publication)

          @root_publication.update_state(Publication::STATE_ACCEPTED)
          @root_publication.process_element(Publication::STATE_ACCEPTED)
          @root_publication.inform_users(Publication::STATE_ACCEPTED)
          @root_publication.element
          if params['type'] == 'sample'
            {
              sample: SampleSerializer.new(@root_publication.element).serializable_hash.deep_symbolize_keys,
              message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
            }
          elsif params['type'] == 'reaction'
            {
              reaction: ReactionSerializer.new(@root_publication.element).serializable_hash.deep_symbolize_keys,
              message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
            }
          end
        end
        post :declined do
          save_comments(@root_publication, params[:comments], params[:summary], params[:feedback]) unless params[:comments].nil? && params[:summary].nil? && params[:feedback].nil?
          @root_publication.update_state('declined')
          @root_publication.process_element('declined')
          @root_publication.inform_users(Publication::STATE_DECLINED, current_user.id)
          @root_publication.element
        end
      end

      namespace :publishSample do
        desc "Publish Samples with chosen Dataset"
        params do
          requires :sampleId, type: Integer, desc: "Sample Id"
          requires :analysesIds, type: Array[Integer], desc: "Selected analyses ids"
          optional :coauthors, type: Array[String], default: [], desc: "Co-author (User)"
          optional :refs, type: Array[Integer], desc: "Selected references"
          optional :embargo, type: Integer, desc: "Embargo collection"
          requires :license, type: String, desc: "Creative Common License"
          requires :addMe, type: Boolean, desc: "add me as author"
        end

        after_validation do
          @sample = current_user.samples.find_by(id: params[:sampleId])
          @analyses = @sample && @sample.analyses.where(id: params[:analysesIds])
          @literals = Literal.where(id: params[:refs]) unless params[:refs].nil? || params[:refs].empty?
          ols_validation(@analyses)
          if params[:addMe]
            @author_ids = [current_user.id] + coauthor_validation(params[:coauthors])
          else
            @author_ids = coauthor_validation(params[:coauthors])
          end
          error!('401 Unauthorized', 401) unless @sample
          error!('404 analyses not found', 404) if @analyses.empty?
        end

        post do
          @license = params[:license]
          @publication_tag = create_publication_tag(current_user, @author_ids, @license)
          @embargo_collection = fetch_embargo_collection(params[:embargo]) if params[:embargo].present? && params[:embargo] >= 0
          pub = prepare_sample_data
          pub.process_element
          pub.inform_users

          @sample.reload
          {
            sample: SampleSerializer.new(@sample).serializable_hash.deep_symbolize_keys,
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end

        put :dois do
          @sample.reserve_suffix
          @sample.reserve_suffix_analyses(@analyses)
          @sample.reload
          @sample.tag_reserved_suffix(@analyses)
          { sample: SampleSerializer.new(@sample).serializable_hash.deep_symbolize_keys }
        end
      end

      # desc: submit reaction data for publication
      namespace :publishReaction do
        desc "Publish Reaction with chosen Dataset"
        params do
          requires :reactionId, type: Integer, desc: "Reaction Id"
          requires :analysesIds, type: Array[Integer], desc: "Selected analyses ids"
          optional :coauthors, type: Array[String], default: [], desc: "Co-author (User)"
          optional :refs, type: Array[Integer], desc: "Selected references"
          optional :embargo, type: Integer, desc: "Embargo collection"
          requires :license, type: String, desc: "Creative Common License"
          requires :addMe, type: Boolean, desc: "add me as author"
        end

        after_validation do
          @scheme_only = false
          @reaction = current_user.reactions.find_by(id: params[:reactionId])
          error!('404 found no reaction to publish', 401) unless @reaction
          @analysis_set = @reaction.analyses.where(id: params[:analysesIds]) | Container.where(id: (@reaction.samples.map(&:analyses).flatten.map(&:id) & params[:analysesIds]))
          ols_validation(@analysis_set)
          if params[:addMe]
            @author_ids = [current_user.id] + coauthor_validation(params[:coauthors])
          else
            @author_ids = coauthor_validation(params[:coauthors])
          end
          error!('404 found no analysis to publish', 404) unless @analysis_set.present?

          #error!('Reaction Publication not authorized', 401)
          @analysis_set_ids = @analysis_set.map(&:id)
          @literals = Literal.where(id: params[:refs]) unless params[:refs].nil? || params[:refs].empty?
        end

        post do
          @license = params[:license]
          @publication_tag = create_publication_tag(current_user, @author_ids, @license)
          @embargo_collection = fetch_embargo_collection(params[:embargo]) if params[:embargo].present? && params[:embargo] >= 0
          pub = prepare_reaction_data
          pub.process_element
          pub.inform_users

          @reaction.reload
          {
            reaction: ReactionSerializer.new(@reaction).serializable_hash.deep_symbolize_keys,
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end

        put :dois do
          reaction_products = @reaction.products.select { |s| s.analyses.select { |a| a.id.in?@analysis_set_ids }.count > 0 }
          @reaction.reserve_suffix
          reaction_products.each do |p|
            d = p.reserve_suffix
            et = p.tag
            et.update!(
              taggable_data: (et.taggable_data || {}).merge(reserved_doi: d.full_doi)
            )
          end
          @reaction.reserve_suffix_analyses(@analysis_set)
          @reaction.reload
          @reaction.tag_reserved_suffix(@analysis_set)
          @reaction.reload
          {
            reaction: ReactionSerializer.new(@reaction).serializable_hash.deep_symbolize_keys,
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end
      end

      # desc: submit reaction data (scheme only) for publication
      namespace :publishReactionScheme do
        desc 'Publish Reaction Scheme only'
        params do
          requires :reactionId, type: Integer, desc: 'Reaction Id'
          requires :temperature, type: Hash, desc: 'Temperature'
          requires :duration, type: Hash, desc: 'Duration'
          requires :products, type: Array, desc: 'Products'
          optional :coauthors, type: Array[String], default: [], desc: 'Co-author (User)'
          optional :embargo, type: Integer, desc: 'Embargo collection'
          requires :license, type: String, desc: 'Creative Common License'
          requires :addMe, type: Boolean, desc: "add me as author"
          requires :schemeDesc, type: Boolean, desc: "publish scheme"
        end

        after_validation do
          @reaction = current_user.reactions.find_by(id: params[:reactionId])
          @scheme_only = true
          error!('404 found no reaction to publish', 401) unless @reaction
          schemeYield = params[:products] && params[:products].map{|v| v.slice(:id, :_equivalent)}
          @reaction.reactions_samples.select{|rs| rs.type == 'ReactionsProductSample'}.map do |p|
            py = schemeYield.select{ |o| o['id'] == p.sample_id }
            p.equivalent = py[0]['_equivalent'] if py && py.length > 0
            p.scheme_yield = py[0]['_equivalent'] if py && py.length > 0
          end

          @reaction.reactions_samples.select{|rs| rs.type != 'ReactionsProductSample'}.map do |p|
            p.equivalent = 0
          end
          @reaction.name = ''
          @reaction.purification = '{}'
          @reaction.dangerous_products = '{}'
          unless params[:schemeDesc]
            @reaction.description = {"ops"=>[{"insert"=>""}]}
          end
          @reaction.observation = {"ops"=>[{"insert"=>""}]}
          @reaction.tlc_solvents = ''
          @reaction.tlc_description = ''
          @reaction.rf_value = 0
          @reaction.rxno = nil
          @reaction.role = ''
          @reaction.temperature = params[:temperature]
          @reaction.duration = "#{params[:duration][:dispValue]} #{params[:duration][:dispUnit]}" unless params[:duration].nil?
          if params[:addMe]
            @author_ids = [current_user.id] + coauthor_validation(params[:coauthors])
          else
            @author_ids = coauthor_validation(params[:coauthors])
          end
        end

        post do
          @license = params[:license]
          @publication_tag = create_publication_tag(current_user, @author_ids, @license)
          @embargo_collection = fetch_embargo_collection(params[:embargo]) if params[:embargo].present? && params[:embargo] >= 0
          pub = prepare_reaction_data
          pub.process_element
          pub.inform_users

          @reaction.reload
          {
            reaction: ReactionSerializer.new(@reaction).serializable_hash.deep_symbolize_keys,
            message: ENV['PUBLISH_MODE'] ? "publication on: #{ENV['PUBLISH_MODE']}" : 'publication off'
          }
        end
      end

      namespace :embargo do
        helpers do
          def handle_embargo_collections(col)
            col.update_columns(ancestry: current_user.published_collection.id)
            sync_emb_col = col.sync_collections_users.where(user_id: current_user.id)&.first
            sync_published_col = SyncCollectionsUser.joins("INNER JOIN collections ON collections.id = sync_collections_users.collection_id ")
            .where("collections.label='Published Elements'")
            .where("sync_collections_users.user_id = #{current_user.id}").first
            sync_emb_col.update_columns(fake_ancestry: sync_published_col.id)
          end

          def remove_anonymous(col)
            anonymous_ids = col.sync_collections_users.joins("INNER JOIN users on sync_collections_users.user_id = users.id")
            .where("users.type='Anonymous'").pluck(:user_id)
            anonymous_ids.each do |anonymous_id|
              anonymous = Anonymous.find(anonymous_id)
              anonymous.sync_in_collections_users.destroy_all
              anonymous.collections.each { |c| c.really_destroy! }
              anonymous.really_destroy!
            end
          end

          def remove_embargo_collection(col)
           col.sync_collections_users.destroy_all
           col.really_destroy!
          end
        end
        desc "Generate account with chosen Embargo"
        params do
          requires :collection_id, type: Integer, desc: "Embargo Collection Id"
        end

        after_validation do
          @embargo_collection = Collection.find(params[:collection_id])
          @sync_emb_col = @embargo_collection.sync_collections_users.where(user_id: current_user.id)&.first
          error!('404 found no collection', 401) unless @sync_emb_col
        end

        get :list do
          sample_list = Publication.where(ancestry: nil, element: @embargo_collection.samples).order(updated_at: :desc)
          reaction_list = Publication.where(ancestry: nil, element: @embargo_collection.reactions).order(updated_at: :desc)
          list = sample_list + reaction_list
          elements = []
          list.each do |e|
            element_type = e.element&.class&.name
            u = User.find(e.published_by) unless e.published_by.nil?
            svg_file = e.element.sample_svg_file if element_type == 'Sample'
            title = e.element.short_label if element_type == 'Sample'

            svg_file = e.element.reaction_svg_file if element_type == 'Reaction'
            title = e.element.short_label if element_type == 'Reaction'

            scheme_only = element_type == 'Reaction' && e.taggable_data && e.taggable_data['scheme_only']
            elements.push(
              id: e.element_id, svg: svg_file, type: element_type, title: title,
              published_by: u&.name, submit_at: e.updated_at, state: e.state, scheme_only: scheme_only
            )
          end
          { elements: elements, embargo_id: params[:collection_id], current_user: { id: current_user.id, type: current_user.type } }
        end

        post :account do
          begin
            # create Anonymous user
            name_abbreviation = "e#{SecureRandom.random_number(9999)}"
            email = "#{@embargo_collection.id}.#{name_abbreviation}@chemotion.net"
            pwd = Devise.friendly_token.first(8)
            first_name = "External"
            last_name = "Chemotion"
            type = 'Anonymous'

            params = { email: email, password: pwd, first_name: first_name, last_name: last_name, type: type, name_abbreviation: name_abbreviation, confirmed_at: Time.now }
            new_obj = User.create!(params)
            new_obj.profile.update!({data: {}})
            # sync collection with Anonymous user
            chemotion_user = User.chemotion_user
            root_label = "with %s" %chemotion_user.name_abbreviation
            rc = Collection.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, is_locked: true, is_shared: true, label: root_label)

            # Chemotion Collection
            SyncCollectionsUser.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, collection_id: Collection.public_collection_id,
            permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)


            SyncCollectionsUser.find_or_create_by(user: new_obj, shared_by_id: chemotion_user.id, collection_id: @embargo_collection.id,
            permission_level: 0, sample_detail_level: 10, reaction_detail_level: 10, fake_ancestry: rc.id.to_s)

            # send mail
            if ENV['PUBLISH_MODE'] == 'production'
              PublicationMailer.mail_external_review(current_user, @embargo_collection.label, email, pwd).deliver_now
            end

            { message: 'A temporary account has been created' }
          rescue StandardError => e
            { error: e.message }
          end
        end

        post :release do
          begin
            pub_samples = Publication.where(ancestry: nil, element: @embargo_collection.samples).order(updated_at: :desc)
            pub_reactions = Publication.where(ancestry: nil, element: @embargo_collection.reactions).order(updated_at: :desc)
            pub_list = pub_samples + pub_reactions
            check_state = pub_list.select { |pub| pub.state != Publication::STATE_ACCEPTED }
            if check_state.present?
              { error: "Embargo #{@embargo_collection.label} release failed, because not all elements have been 'accepted'."}
            else
              remove_anonymous(@embargo_collection)
              handle_embargo_collections(@embargo_collection)
              case ENV['PUBLISH_MODE']
              when 'production'
                if Rails.env.production?
                  ChemotionEmbargoPubchemJob.set(queue: "publishing_embargo_#{@embargo_collection.id}").perform_later(@embargo_collection.id)
                end
              when 'staging'
                ChemotionEmbargoPubchemJob.set(queue: "publishing_embargo_#{@embargo_collection.id}").perform_later(@embargo_collection.id)
                #ChemotionEmbargoPubchemJob.perform_now(@embargo_collection.id)
              else 'development'
              end


              { message: "Embargo #{@embargo_collection.label} has been released" }
            end

          rescue StandardError => e
            { error: e.message }
          end
        end

        post :delete do
          begin
            element_cnt = @embargo_collection.samples.count + @embargo_collection.reactions.count
            if element_cnt.positive?
              { error: "Delete Embargo #{@embargo_collection.label} deletion failed: the collection is not empty. Please refresh your page."}
            else
              remove_anonymous(@embargo_collection)
              remove_embargo_collection(@embargo_collection)
              { message: "Embargo #{@embargo_collection.label} has been deleted" }
            end
          rescue StandardError => e
            { error: e.message }
          end
        end

        post :move do
          begin
            #@new_embargo = params[:new_embargo]
            @element = params[:element]
            @new_embargo_collection = fetch_embargo_collection(params[:new_embargo]&.to_i) if params[:new_embargo].present? && params[:new_embargo]&.to_i >= 0
            case @element['type']
            when 'Sample'
              CollectionsSample
            when 'Reaction'
              CollectionsReaction
            end.remove_in_collection(@element['id'], [@embargo_collection.id])

            case @element['type']
            when 'Sample'
              CollectionsSample
            when 'Reaction'
              CollectionsReaction
            end.create_in_collection(@element['id'], [@new_embargo_collection.id])

            { col_id: @embargo_collection.id,
              new_embargo: @new_embargo_collection,
              is_new_embargo: params[:new_embargo]&.to_i == 0,
              message: "#{@element['type']} [#{@element['title']}] has been moved from Embargo Bundle [#{@embargo_collection.label}] to Embargo Bundle [#{@new_embargo_collection.label}]" }
          rescue StandardError => e
            { error: e.message }
          end
        end
      end
    end
  end
end
