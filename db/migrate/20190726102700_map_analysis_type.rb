class MapAnalysisType < ActiveRecord::Migration
  CONV = [
    { kind: '1H NMR', ols: 'CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy (1H NMR)' },
    { kind: '13C NMR', ols: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)' },
    { kind: 'Mass', ols: 'CHMO:0000470 | mass spectrometry (MS)' },
    { kind: 'EA', ols: 'CHMO:0001075 | elemental analysis (EA)' },
    { kind: 'GCMS', ols: 'CHMO:0000497 | gas chromatography-mass spectrometry (GCMS)' },
    { kind: 'HPLC', ols: 'CHMO:0001009 | high-performance liquid chromatography (HPLC)' },
    { kind: 'IR', ols: 'CHMO:0000630 | infrared absorption spectroscopy (IR)' },
    { kind: 'TLC', ols: 'CHMO:0001007 | thin-layer chromatography (TLC)' },
    { kind: 'Others', ols: 'BFO:0000015 | process' },
    { kind: 'Mass/EI', ols: 'CHMO:0000480 | electron ionisation mass spectrometry (EI-MS)' },
    { kind: 'Mass/GCMS', ols: 'CHMO:0000497 | gas chromatography-mass spectrometry (GCMS)' },
    { kind: 'NMR', ols: 'CHMO:0000613 | pulsed nuclear magnetic resonance spectroscopy (NMR)' },
    { kind: 'NMR/HCCOSY/CDCl3', ols: 'CHMO:0000599 | correlation spectroscopy (COSY)' },
    { kind: 'NMR/HHCOSY/CDCl3', ols: 'CHMO:0001150 | 1H--1H correlation spectroscopy (1H-1H COSY)' },
    { kind: 'Raman', ols: 'CHMO:0000656 | Raman spectroscopy (Raman spectrometry)' },
    { kind: 'UV-VIS', ols: 'CHMO:0000292 | ultraviolet-visible spectrophotometry (UV-VIS)' },
    { kind: 'Xray', ols: 'CHMO:0000156 | X-ray diffraction (XRD)' },
  ]

  BATCH = [
    { kind: 'NMR/1H/', ols: 'CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy (1H NMR)' },
    { kind: 'NMR/13C/', ols: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)' },
    { kind: 'NMR/19F/', ols: 'CHMO:0000597 | 19F nuclear magnetic resonance spectroscopy (19F NMR)' },
    { kind: 'DEPT/', ols: 'CHMO:0000596 | distortionless enhancement with polarization transfer (DEPT)' },
    { kind: 'Crystal', ols: 'CHMO:0000156 | X-ray diffraction (XRD)' },
  ]

  def change

    BATCH.each do |b|
      sql = <<~SQL
            UPDATE containers SET extended_metadata = extended_metadata || hstore('kind', \'#{b[:ols]}\')
            WHERE extended_metadata->'kind' like \'#{b[:kind]}%\'
          SQL
      ActiveRecord::Base.connection.exec_query(sql)
    end

    CONV.each do |c|
      sql = <<~SQL
            UPDATE containers SET extended_metadata = extended_metadata || hstore('kind', \'#{c[:ols]}\')
            WHERE extended_metadata->'kind' = \'#{c[:kind]}\'
          SQL
      ActiveRecord::Base.connection.exec_query(sql)
    end

  end
end
