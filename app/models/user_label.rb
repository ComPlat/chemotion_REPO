# == Schema Information
#
# Table name: user_labels
#
#  id           :integer          not null, primary key
#  user_id      :integer
#  title        :string           not null
#  description  :string
#  color        :string           not null
#  access_level :integer          default(0)
#  position     :integer          default(10)
#  created_at   :datetime
#  updated_at   :datetime
#  deleted_at   :datetime
#

class UserLabel < ApplicationRecord
  acts_as_paranoid

  def self.public_labels(label_ids)
    return [] if label_ids.blank?
    labels = UserLabel.where(id: label_ids, access_level: [1,2])
    .order('access_level desc, position, title')
    labels&.map{|l| {title: l.title, description: l.description, color: l.color} } ||[]
  end
end
