class CreateTriggerSetElementKlassesIdentifier < ActiveRecord::Migration[5.0]
  def change
    create_trigger :set_element_klasses_identifier, on: :element_klasses
  end
end
