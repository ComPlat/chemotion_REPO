# frozen_string_literal: true

class TemplateSubmissions < ActiveRecord::Migration[6.1]
  def change
    create_table :template_submissions do |t|
      t.string :template_klass, null: false, comment: 'The type of template submitted'
      t.jsonb :template, null: false, default: {}, comment: 'The template data submitted'
      t.jsonb :metadata, null: false, default: {}, comment: 'Additional metadata about the klass info and submission'
      t.string :origin, null: false, comment: 'The origin of the submission'
      t.integer :state, null: false, default: 0, comment: 'The state of the submission (0: pending, 1: approved, 2: rejected, 3: released)'
      t.datetime :created_at, null: false, comment: 'The creation time of the submission'
      t.datetime :updated_at, null: true, comment: 'The last update time of the submission'
      t.datetime :deleted_at, comment: 'The deletion time of the submission'
    end

    add_index :template_submissions, :template, using: :gin, name: 'idx_template_submissions_template'
    add_index :template_submissions, :metadata, using: :gin, name: 'idx_template_submissions_metadata'
  end
end
