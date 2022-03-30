# == Schema Information
#
# Table name: publication_collections
#
#  id           :integer
#  state        :string
#  element_id   :integer
#  label        :text
#  doi          :text
#  elobj        :jsonb
#  doi_id       :integer
#  published_by :integer
#

class PublicationCollections < ApplicationRecord
end
