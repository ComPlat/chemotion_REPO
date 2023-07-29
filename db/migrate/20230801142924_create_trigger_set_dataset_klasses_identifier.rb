class CreateTriggerSetDatasetKlassesIdentifier < ActiveRecord::Migration[5.0]
  def change
    create_trigger :set_dataset_klasses_identifier, on: :dataset_klasses
  end
end
