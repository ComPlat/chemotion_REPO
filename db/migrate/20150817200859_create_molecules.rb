class CreateMolecules < ActiveRecord::Migration[4.2]
  def change
    create_table :molecules do |t|
      t.string :inchikey
      t.string :inchistring
      t.float :density
      t.float :molecular_weight
      t.binary :molfile
      t.float :melting_point
      t.float :boiling_point
      t.string :sum_formular
      t.string :names, array: true, default: []
      t.string :iupac_name
      t.string :molecule_svg_file

      t.timestamps null: false
    end unless table_exists?(:molecules)

    add_index :molecules, :inchikey, unique: true unless index_exists?(:molecules, :inchikey)
  end
end
