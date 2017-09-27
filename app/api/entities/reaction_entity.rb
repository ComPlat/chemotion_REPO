module Entities
  class ReactionEntity < Grape::Entity
    expose :id, documentation: { type: "Integer", desc: "Reaction's unique id"}
    expose :name, :short_label, :description, :publication, :reaction_svg_file,
    :rinchi_long_key, :rinchi_short_key, :rinchi_string
    expose :rinchi_web_key, if: -> (obj, opts) { obj.respond_to? :rinchi_web_key}
    # expose :analysis_samples_reactions, if: -> (obj, opts) { obj.respond_to? :analysis_samples_reactions}
    expose :container, using: Entities::ContainerEntity
    expose :products, using: Entities::SampleEntity
    expose :doi, using: Entities::DoiEntity
    expose :status, if: -> (obj, opts) { obj.respond_to? :status}
    expose :tlc_description, if: -> (obj, opts) { obj.respond_to? :tlc_description}
    expose :tlc_solvents, if: -> (obj, opts) { obj.respond_to? :tlc_solvents}
    expose :temperature, if: -> (obj, opts) { obj.respond_to? :temperature}
    expose :timestamp_start, if: -> (obj, opts) { obj.respond_to? :timestamp_start}
    expose :timestamp_stop, if: -> (obj, opts) { obj.respond_to? :timestamp_stop}
    expose :observation, if: -> (obj, opts) { obj.respond_to? :observation}
    expose :rf_value, if: -> (obj, opts) { obj.respond_to? :rf_value}
    expose :duration
  end
end
