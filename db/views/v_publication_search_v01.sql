SELECT * FROM public.mv_publication_search_snapshot
WHERE published_at IS NULL
   OR published_at < now() - interval '36 hours'
UNION ALL
SELECT * FROM public.v_publication_search_delta
