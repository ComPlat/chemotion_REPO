Rails.application.routes.draw do
  if ENV['DEVISE_DISABLED_SIGN_UP'].presence == 'true'
    devise_for :users, controllers: { registrations: 'users/registrations' }, skip: [:registrations]
    as :user do
      get 'sign_in' => 'devise/sessions#new'
      get 'users/sign_up' => 'devise/sessions#new', as: 'new_user_registration'
      get 'users/edit' => 'devise/registrations#edit', as: 'edit_user_registration'
      get 'users/confirmation/new' => 'devise/sessions#new', as: 'new_confirmation'
      put 'users' => 'devise/registrations#update', :as => 'user_registration'
    end
  else
    devise_for :users, controllers: { registrations: 'users/registrations' }
  end

  authenticated :user, lambda {|u| u.type == "Admin"} do
    root to: 'pages#admin', as: :admin_root
    get 'admin', to: 'pages#admin'
    get 'mydb/*any', to: 'pages#admin'
    get 'mydb', to: 'pages#admin'
  end


  authenticated :user, lambda {|u| u.type == "Group"} do
    root to: 'pages#cnc', as: :group_root
    get 'group', to: 'pages#cnc'
    get 'mydb/*any', to: 'pages#cnc'
    get 'mydb', to: 'pages#cnc'
  end

  authenticated :user do
    root to: redirect('home'), as: :authenticated_root
  end


  authenticate :user do
    get 'pages', to:  'pages#home'
    get 'pages/settings', to: 'pages#settings'
    get 'pages/profiles', to: 'pages#profiles'
    patch 'pages/update_profiles', to: 'pages#update_profiles'
    patch 'pages/update_user', to: 'pages#update_user'
    get 'pages/affiliations', to: 'pages#affiliations'
    patch 'pages/create_affiliation', to: 'pages#create_affiliation'
    patch 'pages/update_affiliations', to: 'pages#update_affiliations'

    # get 'command_n_control', to: 'pages#cnc'
    get 'mydb/*any', to: 'pages#mydb'
    get 'mydb', to: 'pages#mydb'
    get 'molecule_moderator', to: 'pages#molecule_moderator'
    get 'home/review', to: 'pages#home'
    get 'home/review/*any', to: 'pages#home'
    get 'home/embargo', to: 'pages#home'
    get 'home/embargo/*review_element', to: 'pages#home'
    get 'pages/tokens', to: 'pages#tokens'
  end

  get 'home/*any', to: 'pages#home'
  get 'home', to: 'pages#home'

  # Standalone page for ChemScanner
  # get 'chemscanner', to: 'pages#chemscanner'
  # get 'editor',      to: 'pages#editor'

  # Standalone page for ChemSpectra
#  get 'chemspectra', to: 'pages#chemspectra'
#  get 'chemspectra-editor', to: 'pages#chemspectra_editor'

  get 'directive', to: 'pages#directive'
  get 'welcome', to: 'pages#home'
  get 'home', to: 'pages#home'
  get 'about', to: 'pages#about'
  get 'command_n_control', to: 'pages#home'
  get 'admin', to: 'pages#home'
  get 'mydb', to: 'pages#home'
  get 'pid', to: 'pages#home'

  get 'pid/:id'  => redirect { |params, request|
    if params[:id].present? && params[:id].to_i && params[:id].to_i < 2147483647
      url_base = "/home/publications/"
      pubs = Publication.where(id: params[:id])
      pub = pubs&.length > 0 ? pubs[0] : nil
      unless pub.nil?
        case pub.element_type
        when 'Sample'
          url = "#{url}molecules/#{pub.element.molecule_id}" if pub.state&.match(Regexp.union(%w[completed]))
          url = "#{url}review/review_sample/#{pub.element_id}" if %w[pending reviewed accepted].include?(pub.state) && pub.ancestry.nil?
          if %w[pending reviewed accepted].include?(pub.state) && !pub.ancestry.nil?
            root = Publication.find_by(id: pub.ancestry, element_type: 'Reaction')
            url =  "#{url}review/review_reaction/#{root.element_id}" if root && %w[pending reviewed accepted].include?(root.state)
          end

        when 'Reaction'
          if pub.state&.match(Regexp.union(%w[completed]))
            url = "#{url}reactions/#{pub.element_id}"
          elsif %w[pending reviewed accepted].include?(pub.state)
            url =  "#{url}review/review_reaction/#{pub.element_id}"
          end
        when 'Container'
          url =  "#{url}datasets/#{pub.element_id}" if pub.state&.match(Regexp.union(%w[completed]))
          if %w[pending reviewed accepted].include?(pub.state) && !pub.ancestry.nil?
            root = pub.root
            url =  "#{url}review/review_#{root.element_type=='Reaction'? 'reaction' : 'sample'}/#{root.element_id}" if root && %w[pending reviewed accepted].include?(root.state)
          end

        end
      end
    end
    url || '/'
  }

  get 'inchikey/*suffix(.:version)' => redirect { |params, request|
    suffix = params[:suffix]
    if !params[:version].blank?
      suffix = "#{params[:suffix]}.#{params[:version]}"
    end
    doi = Doi.find_by(suffix: suffix)
    url_base = "/home/publications/"
    element = doi.doiable

    element = element.root.containable if (element.class.name == 'Container' && suffix.start_with?("reaction"))

    case element.class.name
    when 'Sample'
      url =  "#{url}molecules/#{element.molecule_id}"
    when 'Reaction'
      url = "#{url}reactions/#{element.id}"
    when 'Container'
      url =  "#{url}datasets/#{element.id}"
    end
    url
  }

#  get 'inchikey/:inchikey(/*analysis_type)(.:version)' => redirect { |params, request|
#    inchikey = params[:inchikey]
#    type = params[:analysis_type] || ""
#    version = params[:version] || ""
#    url = "/home/#/inchikey"
#
#    if type.empty? && version.empty?
#      url = url + "/" + inchikey + "/"
#    elsif type.empty?
#      url = url + "/" + inchikey + "." + version
#    elsif version.empty?
#      url = url + "/" + inchikey + "/" + type
#    else
#      url = url + "/" + inchikey + "/" + type + "." + version
#    end
#
#    url
#  }

  get '/review/*any' => redirect { |params, request|
    "/home/review/#{params[:any]}"
  }
  get '/embargo/*review_element' => redirect { |params, request|
    "/home/embargo/#{params[:review_element]}"
  }

  get '/datasets/:id' => redirect { |params, request|
    "/home/publications/datasets/#{params[:id]}"
  }

  get '/molecules/:id' => redirect { |params, request|
    "/home/publications/molecules/#{params[:id]}"
  }

  get '/reactions/:id' => redirect { |params, request|
    "/home/publications/reactions/#{params[:id]}"
  }

  mount API => '/'

  root to: 'pages#root_page', as: :unauthenticated_root

  get 'test', to: 'pages#test'
end
