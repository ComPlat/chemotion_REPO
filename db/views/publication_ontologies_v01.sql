select root.element_type, root.element_id, sub.element_id as container_id,
root.published_at, containers.extended_metadata->'kind' as ontologies, trim(split_part(containers.extended_metadata->'kind', '|',1)) as term_id,
trim(split_part(containers.extended_metadata->'kind', '|',2)) as label
from publications root, publications sub, containers
where root.state like 'complete%' and root.element_type in ('Sample', 'Reaction') and sub.element_type in ('Container')
and root.id = any (string_to_array(sub.ancestry, '/')::integer[])
and root.deleted_at is null
and sub.element_id = containers.id