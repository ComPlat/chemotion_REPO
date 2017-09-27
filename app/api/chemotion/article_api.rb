require 'moneta'

module Chemotion
  class ArticleAPI < Grape::API
    resource :articles do

      helpers do
        def resize_image(file, tmp_path, no_resize = false)
          image = Magick::Image.read(file[:tempfile].path).first
          image = image.resize_to_fit(400, 268) unless no_resize
          image.format = 'png'

          FileUtils.mkdir_p(tmp_path)
          timg = Tempfile.new('image_', tmp_path)
          timg.binmode
          timg.write(image.to_blob)
          timg.flush
          { cover_image: File.basename(timg.path) || '' }
        end

        def store_image(params)
          sourcepath = params[:public_path] + params[:pfad]
          targetpath = params[:public_path] + params[:key] + '_' + params[:pfad]
          FileUtils.cp(sourcepath, targetpath) if File.exist?(sourcepath)
        end

        def create_or_update_file(params)
          key = params[:key]
          public_path = params[:public_path]
          FileUtils.mkdir_p(public_path)
          store = Moneta.build do
            use :Transformer, key: [:json], value: [:json]
            adapter :File, dir: public_path
          end
          store_idx = store.key?('index.json') ? store['index.json'] : []
          updated_file = (store_idx&.length > 0 && store_idx&.select{ |a| a['key'] == key }) || []
          raise '401 Unauthorized' if updated_file&.length > 0 && updated_file[0]['creator_id'] != current_user.id
          created_at = updated_file&.length > 0 ? updated_file[0]['created_at'] : Time.now
          published_at = params[:published_at].blank? ? created_at : DateTime.parse(params[:published_at]).to_time
          updated_at = params[:updated_at].blank? ? published_at : DateTime.parse(params[:updated_at]).to_time
          key = updated_file&.length > 0 ? updated_file[0]['key'] : SecureRandom.uuid
          store_idx.delete_if { |a| a['key'] == key }
          filename = key + '_cover.png'
          filepath = public_path + filename
          cover_image = params[:cover_image]
          if cover_image.present? && cover_image != filename
            sourcepath = public_path + cover_image
            FileUtils.cp(sourcepath, filepath) if File.exist? sourcepath
          end
          params[:article].each do |stelle|
            next unless stelle['pfad'].present? && (!stelle['pfad'].include?(key))
            store_image({public_path: public_path, key: key, pfad: stelle['pfad']})
            stelle['pfad'] = key + '_' + stelle['pfad']
          end
          header = {
            key: key,
            title: params[:title],
            cover_image: cover_image.present? ? filename : '',
            creator_name: current_user.name,
            creator_id: current_user.id,
            created_at: created_at,
            firstParagraph: params[:firstParagraph],
            published_at: published_at,
            updated_at: updated_at
          }
          store_idx.unshift(header)
          store['index.json'] = store_idx
          filestore = {
            content: params[:content],
            title: params[:title],
            cover_image: cover_image.present? ? filename : '',
            creator_name: current_user.name,
            creator_id: current_user.id,
            created_at: created_at,
            firstParagraph: params[:firstParagraph],
            published_at: published_at,
            updated_at: updated_at,
            article: params[:article],
          }
          store[key] = filestore
          filestore
        rescue StandardError => e
          puts e
            error!('401 Unauthorized. Please contact the author or administrator.', 401)
        ensure
          store&.close
        end

        def delete_file(key, public_path)
          FileUtils.mkdir_p(public_path)
          store = Moneta.build do
            use :Transformer, key: [:json], value: [:json]
            adapter :File, dir: public_path
          end
          store_idx = store.key?('index.json') ? store['index.json'] : []
          error!('404 Not Found', 404) unless store.key?('index.json')
          updated_file = (store_idx&.length > 0 && store_idx&.select{ |a| a['key'] == key }) || []
          raise '401 Unauthorized' if updated_file&.length > 0 && updated_file[0]['creator_id'] != current_user.id

          store_idx.delete_if { |a| a['key'] == key }
          store['index.json'] = store_idx
          FileUtils.rm_r(Dir.glob(public_path + key + '*'), force: true)
          key
        rescue StandardError => e
          puts e
          error!('401 Unauthorized. Please contact the author or administrator.', 401)
        ensure
          store&.close
        end
      end

      desc 'Create or Update a news'
      params do
        optional :key, type: String, desc: 'key'
        requires :title, type: String, desc: 'title'
        optional :cover_image, type: String, desc: 'cover_image URL'
        optional :content, type: Hash do
          optional :ops, type: Array[Hash]
        end
        optional :firstParagraph, type: String, desc: 'first paragraph of content'
        optional :published_at, type: String, desc: 'published date'
        optional :updated_at, type: String, desc: 'updated date'
        optional :article, type: Array, desc: 'full of content'
      end

      post 'create_or_update' do
        error!('401 Unauthorized', 401) unless current_user&.is_article_editor
        public_path = File.join((ENV['ARTICLE_PATH'] || 'public/newsroom/'))
        create_or_update_file(params.deep_merge(public_path: public_path))
      end

      desc 'Create or Update a howto'
      params do
        optional :key, type: String, desc: 'howto key'
        requires :title, type: String, desc: 'title'
        optional :cover_image, type: String, desc: 'cover_image URL'
        optional :content, type: Hash do
          optional :ops, type: Array[Hash]
        end
        optional :firstParagraph, type: String, desc: 'first paragraph of content'
        optional :published_at, type: String, desc: 'published date'
        optional :updated_at, type: String, desc: 'updated date'
        optional :article, type: Array, desc: 'full of content'
      end
      post :create_or_update_howto do
        error!('401 Unauthorized', 401) unless current_user&.is_howto_editor
        public_path = File.join((ENV['HOWTO_PATH'] || 'public/howto/'))
        create_or_update_file(params.deep_merge(public_path: public_path))
      end

      desc 'Delete a howto'
      params do
        requires :key, type: String, desc: 'howto key'
      end
      before do
        error!('401 Unauthorized', 401) unless current_user&.is_howto_editor
      end
      post 'delete_howto' do
        delete_file(params[:key], File.join((ENV['HOWTO_PATH'] || 'public/howto/')))
      end

      desc 'Delete a news'
      before do
        error!('401 Unauthorized', 401) unless current_user&.is_article_editor
      end
      delete ':key' do
        delete_file(params[:key], File.join((ENV['ARTICLE_PATH'] || 'public/newsroom/')))
      end

      desc 'Image section of Editor'
      params do
        requires :file, type: Array, desc: 'image file'
        requires :editor_type, type: String, desc: 'howto editor or newsroom editor'
      end
      post 'editor_image' do
        p_path = 'public/' + params[:editor_type] + '/'
        e_path = ENV[params[:editor_type].upcase + '_PATH']
        if params[:file]
          img = resize_image(params[:file][0], File.join((e_path || p_path)), true)
          { pfad_image: img[:cover_image], cover_image: img[:cover_image] }
        else
          { pfad_image: '', cover_image: '' }
        end
      end
    end
  end
end
