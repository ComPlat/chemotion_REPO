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
  ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.published_by), NULL)            AS contributor_ids,
  COUNT(DISTINCT s.id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM public.element_tags e
      WHERE e.taggable_type = 'Sample'
        AND e.taggable_id   = s.id
        AND e.taggable_data -> 'xvial' IS NOT NULL
        AND e.taggable_data -> 'xvial' ->> 'num' <> ''
    )
  )::int                                                            AS xvial_count,
  (
    SELECT (cod.x_data ->> 'provided_by')
    FROM public.element_tags et
    INNER JOIN public.compound_open_data_locals cod
      ON cod.x_data ->> 'xid' = et.taggable_data -> 'xvial' ->> 'num'
    WHERE et.taggable_type = 'Sample'
      AND et.taggable_id IN (
        SELECT s2.id FROM public.samples s2
        WHERE s2.molecule_id = m.id AND s2.deleted_at IS NULL
      )
      AND COALESCE(cod.x_data ->> 'provided_by', '') <> ''
    LIMIT 1
  )                                                                 AS provider,
  (
    SELECT (cod.x_data ->> 'group')
    FROM public.element_tags et
    INNER JOIN public.compound_open_data_locals cod
      ON cod.x_data ->> 'xid' = et.taggable_data -> 'xvial' ->> 'num'
    WHERE et.taggable_type = 'Sample'
      AND et.taggable_id IN (
        SELECT s2.id FROM public.samples s2
        WHERE s2.molecule_id = m.id AND s2.deleted_at IS NULL
      )
      AND COALESCE(cod.x_data ->> 'group', '') <> ''
    LIMIT 1
  )                                                                 AS group_label,
  EXISTS (
    SELECT 1 FROM public.publication_ontologies po
    WHERE po.element_type = 'Sample'
      AND po.element_id IN (
        SELECT s3.id FROM public.samples s3
        WHERE s3.molecule_id = m.id AND s3.deleted_at IS NULL
      )
  )                                                                 AS has_analyses,
  (
    SELECT c.label
    FROM public.collections_samples j
    INNER JOIN public.collections c ON c.id = j.collection_id AND c.deleted_at IS NULL
    WHERE j.sample_id IN (
      SELECT s4.id FROM public.samples s4
      WHERE s4.molecule_id = m.id AND s4.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.collections pe
      WHERE pe.label = 'Published Elements' AND pe.deleted_at IS NULL
        AND c.ancestry LIKE '%/' || pe.id::text || '/%'
    )
    ORDER BY c.position ASC
    LIMIT 1
  )                                                                 AS embargo_label
FROM public.molecules m
JOIN public.samples      s ON s.molecule_id = m.id AND s.deleted_at IS NULL
JOIN public.publications p ON p.element_type = 'Sample'
                          AND p.element_id  = s.id
                          AND p.deleted_at IS NULL
                          AND p.state::text = 'completed'
WHERE m.deleted_at IS NULL
GROUP BY m.id
HAVING MAX(p.published_at) >= now() - interval '36 hours'
