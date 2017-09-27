# == Schema Information
#
# Table name: publication_authors
#
#  author_id    :text
#  element_id   :integer
#  element_type :string
#  state        :string
#  doi_id       :integer
#  ancestry     :string
#

class PublicationAuthors < ActiveRecord::Base
end
