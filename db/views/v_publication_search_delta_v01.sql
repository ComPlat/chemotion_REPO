SELECT
  p.id                                                         AS publication_id,
  p.element_type                                               AS element_type,
  p.element_id                                                 AS element_id,
  p.published_by                                               AS published_by,
  p.published_at                                               AS published_at,
  EXTRACT(YEAR FROM p.published_at)::int                       AS year_published,
  p.doi_id                                                     AS doi_id,
  COALESCE((p.taggable_data ->> 'scheme_only')::boolean, FALSE) AS scheme_only,
  CASE WHEN p.element_type = 'Reaction' THEN r.rxno ELSE NULL END AS reaction_rxno,
  m.id                                                         AS molecule_id,
  m.iupac_name                                                 AS mol_iupac_name,
  m.inchikey                                                   AS mol_inchikey,
  m.inchistring                                                AS mol_inchistring,
  m.cano_smiles                                                AS mol_cano_smiles,
  m.sum_formular                                               AS mol_sum_formular
FROM public.publications p
LEFT JOIN public.samples   s ON p.element_type = 'Sample'   AND s.id = p.element_id   AND s.deleted_at IS NULL
LEFT JOIN public.molecules m ON p.element_type = 'Sample'   AND m.id = s.molecule_id  AND m.deleted_at IS NULL
LEFT JOIN public.reactions r ON p.element_type = 'Reaction' AND r.id = p.element_id   AND r.deleted_at IS NULL
WHERE p.deleted_at IS NULL
  AND p.state::text = 'completed'
  AND p.element_type IN ('Sample', 'Reaction')
  AND p.published_at >= now() - interval '36 hours'
