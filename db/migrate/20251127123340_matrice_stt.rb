# frozen_string_literal: true

class MatriceStt < ActiveRecord::Migration[6.1]
  def self.up
    Matrice.create(name: 'stt', enabled: true, label: 'Speech-to-Text', include_ids: [], exclude_ids: [],
                   configs: { stt_authorization: '' })
  end

  def self.down
    Matrice.find_by(name: 'stt')&.really_destroy!
  end
end
