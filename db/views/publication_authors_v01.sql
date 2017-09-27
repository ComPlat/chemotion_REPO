select distinct jsonb_array_elements(taggable_data->'creators')->>'id' as author_id,
element_id,element_type,
case when state like 'completed%' then 'completed' else state end as state
, doi_id, ancestry
from publications where deleted_at ISNULL