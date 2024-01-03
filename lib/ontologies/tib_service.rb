module Ontologies
  module TibService
    include HTTParty
    ONTOLOGY_API = 'service.tib.eu/ts4tib/api/'

    def self.http_s
      "https://" # Rails.env.test? && "http://" || "https://"
    end

    def self.options
      { :timeout => 10, :headers => {'Content-Type' => 'text/json'}  }
    end

    def self.load_term_info(schema, term_id)
      link = http_s + ONTOLOGY_API + '/ontologies/' + schema + '/terms?obo_id=' + term_id
      response = HTTParty.get(link, options)
    rescue StandardError => e
      Rails.logger.error ["API call", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
      nil
    end
  end
end
