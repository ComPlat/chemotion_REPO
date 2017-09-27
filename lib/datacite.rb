require 'net/http'
require 'openssl'

module Datacite

  BASE_URI = 'https://mds.datacite.org/'
  BASE_URI_TEST = 'https://mds.test.datacite.org/'
  RESOURCES = { doi: '/doi', metadata: '/metadata', media: '/media' }
  AUTH = {:username => ENV['DOI_SYMBOL'], :password => ENV['DOI_PASSWORD']}

  class Mds
    attr_reader :doi_domain, :doi_prefix

    def initialize(**options)
      if options[:authorize]
        @username = options[:authorize][:usr]
        @passwd = options[:authorize][:pwd]
      else
        @username = AUTH[:username]
        @passwd = AUTH[:password]
      end

      if options[:testing] || ENV['DATACITE_MODE'] == 'test' || !Rails.env.production?
        @uri = URI.parse(BASE_URI_TEST)
        @test_mode = true
        @test_mode_query = '' # 'testMode=true'
        @base_uri = BASE_URI_TEST
        @doi_domain = ENV['DOI_DOMAIN_TEST']
        @doi_prefix = ENV['DOI_PREFIX_TEST'] || '10.5072'
      else
        @uri = URI.parse(BASE_URI)
        @test_mode = false
        @test_mode_query = ''
        @base_uri = BASE_URI
        @doi_domain = ENV['DOI_DOMAIN']
        @doi_prefix = ENV['DOI_PREFIX']
      end
    end

    def mint(doi, url)
      @uri.path = RESOURCES[:doi]
      # @uri.query = @test_mode_query if @test_mode
      request = Net::HTTP::Post.new(@uri.request_uri)
      request.content_type = 'text/plain'
      request.set_form_data({doi: doi, url: url})
      fetch(request)
    end

    def delete_doi(full_doi)
      @uri.path = RESOURCES[:metadata] + '/' + full_doi
      request = Net::HTTP::Delete.new(@uri.request_uri)
      request.content_type = 'application/plain;charset=UTF-8'
      fetch(request)
    end

    def upload_metadata(xml_string)
      @uri.path = RESOURCES[:metadata]
      # @uri.query = @test_mode_query if @test_mode
      request = Net::HTTP::Post.new(@uri.request_uri)
      request.content_type = 'application/xml;charset=UTF-8'
      request.body = xml_string
      fetch(request)
    end

    def fetch(request, request_limit = 5)
      raise ArgumentError, 'HTTP redirect too deep' if request_limit <= 0
      @http ||= Net::HTTP.new(@uri.host, @uri.port)
      @http.use_ssl = true
      # @http.verify_mode = OpenSSL::SSL::VERIFY_NONE
      request.basic_auth(@username, @passwd) if (@username && @passwd)
      response = @http.request(request)

      case response
      when Net::HTTPSuccess
        response
      when Net::HTTPRedirection
        url = URI.parse(response['location'])
        req = Net::HTTP::Post.new(url.request_uri)
        req.content_type = request.content_type
        req.body = request.body unless request.body.nil?
        fetch(req, request_limit - 1)
      else
        response
      end
    end
  end
end
