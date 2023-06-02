GrapeSwaggerRails.options.before_action do
  data_url = Rails.env.development? ? 'http://' : 'https://'
  GrapeSwaggerRails.options.app_url = "#{data_url}#{request.host_with_port}"
end

GrapeSwaggerRails.options.url = '/swagger_doc.json'
# GrapeSwaggerRails.options.url = Rails.env.development? ? '/api/v1/swagger_doc' : '/swagger_doc.json'
GrapeSwaggerRails.options.app_url  = "#{ENV['APPLICATION_URL']}"

