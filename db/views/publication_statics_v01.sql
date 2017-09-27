select 'sample' as el_type, 'sample-embargo' as ex_type, count(id) as e_cnt from publications where state in ('accepted') and element_type = 'Sample' and deleted_at is null
union
select 'sample' as el_type, 'sample-review' as ex_type, count(id) as e_cnt from publications where state in ('pending','reviewed') and element_type = 'Sample' and deleted_at is null
union
select 'sample' as el_type, 'sample' as ex_type, count(id) as e_cnt from publications where state like 'completed%' and element_type = 'Sample' and deleted_at is null
union
select 'reaction' as el_type, 'reaction-embargo' as ex_type, count(id) as e_cnt from publications where state in ('accepted') and element_type = 'Reaction' and deleted_at is null
union
select 'reaction' as el_type, 'reaction-review' as ex_type, count(id) as e_cnt from publications where state in ('pending','reviewed') and element_type = 'Reaction' and deleted_at is null
union
select 'reaction' as el_type, 'reaction' as ex_type, count(id) as e_cnt from publications where state like 'completed%' and element_type = 'Reaction' and deleted_at is null
union
select 'analysis' as el_type, summ.g_type as ex_type, sum(summ.c_num) as e_cnt from
(
select
  case
    when (extended_metadata->'kind') like '%NMR%' then 'NMR'
    when (extended_metadata->'kind') like '%mass%' then 'Mass'
    when (extended_metadata->'kind') like '%DEPT%' then 'DEPT'
    when ((extended_metadata->'kind') like '%X-ray%' or (extended_metadata->'kind') like '%CHMO:0000156%') then 'X-ray'
    when (extended_metadata->'kind') like '%CHMO:0000630%' then 'IR'
    when (extended_metadata->'kind') like '%CHMO:0001007%' then 'TLC'
    when (extended_metadata->'kind') like '%CHMO:0001075%' then 'EA'
    when (SPLIT_PART((extended_metadata->'kind'),'|',2) <> '') then TRIM(SPLIT_PART((extended_metadata->'kind'),'|',2))
    else (extended_metadata->'kind')
  end g_type, count(id) as c_num
from containers
where id in (select element_id from publications
where state like 'completed%' and element_type = 'Container' and deleted_at is null) and extended_metadata->'kind' <> ''
group by (extended_metadata->'kind')
) summ
group by summ.g_type
