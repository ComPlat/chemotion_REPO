# frozen_string_literal: true

module DataCitePublisher
  extend ActiveSupport::Concern

  def publisher_config(options = {})
    default_config = {
      name: 'chemotion-repository',
      xml_lang: 'en',
      identifier: 'https://www.re3data.org/repository/r3d100010748',
      identifier_scheme: 're3data',
      scheme_uri: 'https://re3data.org/',
    }

    default_config.merge(options)
  end

  def render_publisher(config)
    attributes = []
    attributes << %(xml:lang="#{config[:xml_lang]}") if config[:xml_lang].present?
    attributes << %(publisherIdentifier="#{config[:identifier]}") if config[:identifier].present?
    attributes << %(publisherIdentifierScheme="#{config[:identifier_scheme]}") if config[:identifier_scheme].present?
    attributes << %(schemeURI="#{config[:scheme_uri]}") if config[:scheme_uri].present?

    "<publisher #{attributes.join(' ')}>#{config[:name]}</publisher>"
  end
end
