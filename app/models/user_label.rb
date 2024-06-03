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

  def self.public_labels(label_ids, current_user, is_public)
    return [] if label_ids.blank?

    if is_public
      labels = UserLabel.where(id: label_ids, access_level: 2).order('access_level desc, position, title')
    else
      if User.reviewer_ids.include?(current_user.id)
        labels = UserLabel.where('id in (?) and ((user_id = ? AND access_level = 0) OR access_level IN (?))', label_ids, current_user.id, [1, 2, 3])
        .order('access_level desc, position, title')
      else
        labels = UserLabel.where('id in (?) and ((user_id = ? AND access_level = 0) OR access_level IN (?))', label_ids, current_user.id, [1, 2])
        .order('access_level desc, position, title')
      end
    end

    labels&.map{|l| {id: l.id, title: l.title, description: l.description, color: l.color, access_level: l.access_level} } ||[]
  end

  def self.my_labels(current_user, is_public)
    if is_public
      labels = UserLabel.where('access_level IN (?)', current_user.id, [2])
      .order('access_level desc, position, title')
    else
      if User.reviewer_ids.include?(current_user.id)
        labels = UserLabel.where('(user_id = ? AND access_level in (0, 1)) OR access_level IN (2, 3)', current_user.id)
        .order('access_level desc, position, title')
      else
        labels = UserLabel.where('(user_id = ? AND access_level in (0, 1)) OR access_level = 2', current_user.id)
        .order('access_level desc, position, title')
      end
    end
  end
end
