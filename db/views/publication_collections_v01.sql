select id, state, element_id, taggable_data->>'label' as label, taggable_data->>'col_doi' as doi,
jsonb_array_elements(taggable_data ->'element_dois') as elobj, doi_id, published_by
from publications p where deleted_at isnull and element_type = 'Collection'
