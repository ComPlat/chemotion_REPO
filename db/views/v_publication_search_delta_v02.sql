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
  m.sum_formular                                               AS mol_sum_formular,
  COALESCE((
    SELECT array_agg(DISTINCT (pa.author_id)::int)
    FROM public.publication_authors pa
    WHERE pa.element_type = p.element_type
      AND pa.element_id   = p.element_id
      AND pa.state        = 'completed'
      AND pa.author_id    ~ '^\d+$'
  ), ARRAY[]::int[])                                           AS author_ids,
  COALESCE((
    SELECT array_agg(DISTINCT po.term_id)
    FROM public.publication_ontologies po
    WHERE po.element_type = p.element_type
      AND po.element_id   = p.element_id
      AND po.term_id IS NOT NULL
  ), ARRAY[]::text[])                                          AS ontology_term_ids,
  COALESCE((
    SELECT jsonb_object_agg(t.term_id, t.label)
    FROM (
      SELECT po.term_id, MIN(po.label) AS label
      FROM public.publication_ontologies po
      WHERE po.element_type = p.element_type
        AND po.element_id   = p.element_id
        AND po.term_id IS NOT NULL
      GROUP BY po.term_id
    ) t
  ), '{}'::jsonb)                                              AS ontology_term_labels,
  COALESCE((
    SELECT array_agg(DISTINCT TRIM(aff.value))
    FROM jsonb_each_text(COALESCE(p.taggable_data -> 'affiliations', '{}'::jsonb)) AS aff(key, value)
    WHERE COALESCE(TRIM(aff.value), '') <> ''
  ), ARRAY[]::text[])                                          AS institution_names,
  COALESCE(
    CASE WHEN p.element_type = 'Sample' THEN (
      SELECT c.label
      FROM public.collections_samples j
      INNER JOIN public.collections c ON c.id = j.collection_id AND c.deleted_at IS NULL
      WHERE j.sample_id = p.element_id
        AND EXISTS (
          SELECT 1 FROM public.collections pe
          WHERE pe.label = 'Published Elements' AND pe.deleted_at IS NULL
            AND c.ancestry LIKE '%/' || pe.id::text || '/%'
        )
      ORDER BY c.position ASC
      LIMIT 1
    ) WHEN p.element_type = 'Reaction' THEN (
      SELECT c.label
      FROM public.collections_reactions j
      INNER JOIN public.collections c ON c.id = j.collection_id AND c.deleted_at IS NULL
      WHERE j.reaction_id = p.element_id
        AND j.deleted_at IS NULL
        AND EXISTS (
          SELECT 1 FROM public.collections pe
          WHERE pe.label = 'Published Elements' AND pe.deleted_at IS NULL
            AND c.ancestry LIKE '%/' || pe.id::text || '/%'
        )
      ORDER BY c.position ASC
      LIMIT 1
    ) END,
    ''
  )                                                            AS embargo_label,
  (
    SELECT COUNT(*)::int
    FROM public.publication_ontologies po
    WHERE po.element_type = p.element_type
      AND po.element_id   = p.element_id
  )                                                            AS ana_count
FROM public.publications p
LEFT JOIN public.samples   s ON p.element_type = 'Sample'   AND s.id = p.element_id   AND s.deleted_at IS NULL
LEFT JOIN public.molecules m ON p.element_type = 'Sample'   AND m.id = s.molecule_id  AND m.deleted_at IS NULL
LEFT JOIN public.reactions r ON p.element_type = 'Reaction' AND r.id = p.element_id   AND r.deleted_at IS NULL
WHERE p.deleted_at IS NULL
  AND p.state::text = 'completed'
  AND p.element_type IN ('Sample', 'Reaction')
  AND p.published_at >= now() - interval '36 hours'
