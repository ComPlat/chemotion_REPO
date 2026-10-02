SELECT
  m.id                                                              AS molecule_id,
  m.iupac_name                                                      AS mol_iupac_name,
  m.inchikey                                                        AS mol_inchikey,
  m.inchistring                                                     AS mol_inchistring,
  m.cano_smiles                                                     AS mol_cano_smiles,
  m.sum_formular                                                    AS mol_sum_formular,
  MAX(p.published_at)                                               AS max_published_at,
  EXTRACT(YEAR FROM MAX(p.published_at))::int                       AS year_published,
  COUNT(DISTINCT p.id)                                              AS publication_count,
  ARRAY_AGG(DISTINCT p.id)                                          AS publication_ids,
  ARRAY_AGG(DISTINCT s.id)                                          AS sample_ids,
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.published_by), NULL)            AS contributor_ids
FROM public.molecules m
JOIN public.samples      s ON s.molecule_id = m.id AND s.deleted_at IS NULL
JOIN public.publications p ON p.element_type = 'Sample'
                          AND p.element_id  = s.id
                          AND p.deleted_at IS NULL
                          AND p.state::text = 'completed'
WHERE m.deleted_at IS NULL
GROUP BY m.id
