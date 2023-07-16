class MatriceMoleculeViewer < ActiveRecord::Migration[5.2]
  def change
    Matrice.create(
      name: 'moleculeViewer',
      enabled: false,
      label: 'moleculeViewer',
      include_ids: [],
      exclude_ids: []
    ) if Matrice.find_by(name: 'moleculeViewer').nil?
  end
end
