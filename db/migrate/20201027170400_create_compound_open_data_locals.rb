class CreateCompoundOpenDataLocals < ActiveRecord::Migration
  def change
    create_view :compound_open_data_locals
  end
end
