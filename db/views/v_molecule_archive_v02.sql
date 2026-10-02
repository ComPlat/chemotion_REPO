SELECT * FROM public.mv_molecule_archive_snapshot snap
WHERE NOT EXISTS (
  SELECT 1 FROM public.v_molecule_archive_delta d
  WHERE d.molecule_id = snap.molecule_id
)
UNION ALL
SELECT * FROM public.v_molecule_archive_delta
