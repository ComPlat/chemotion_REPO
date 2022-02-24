class CreateCompoundOpenDataLocals < ActiveRecord::Migration[4.2]
  def change
    create_view :compound_open_data_locals
  end
end
