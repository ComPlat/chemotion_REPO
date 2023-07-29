class CreateFunctionSetDatasetKlassesIdentifier < ActiveRecord::Migration[5.0]
  def change
    create_function :set_dataset_klasses_identifier
  end
end
