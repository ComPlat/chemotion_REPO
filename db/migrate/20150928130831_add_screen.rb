class AddScreen < ActiveRecord::Migration[4.2]
  def change
    create_table "screens", force: :cascade do |t|
      t.string   "description"
      t.string   "name"
      t.string   "result"
      t.string   "collaborator"
      t.string   "conditions"
      t.string   "requirements"
      t.datetime "created_at",  null: false
      t.datetime "updated_at",  null: false
    end unless table_exists?(:screens)

    create_table :collections_screens do |t|
      t.integer :collection_id
      t.integer :screen_id
      t.index :collection_id
      t.index :screen_id
    end unless table_exists?(:collections_screens)

    change_table :collections do |t|
      t.integer :screen_detail_level,  default: 0
    end unless column_exists?(:collections, :screen_detail_level)

    change_table :wellplates do |t|
      t.integer "screen_id", null: true, index: true
    end unless column_exists?(:wellplates, :screen_id)
  end
end
