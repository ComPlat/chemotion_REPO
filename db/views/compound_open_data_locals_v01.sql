SELECT c.* FROM (
SELECT null::INTEGER as x_id, null::INTEGER as x_sample_id, null::jsonb as x_data, null::timestamp as x_created_at, null::timestamp as x_updated_at,
 null::varchar as x_inchikey, null::varchar as x_sum_formular, null::varchar as x_cano_smiles, null::varchar as x_external_label, null::varchar as x_short_label,
 null::varchar as x_name, null::jsonb as x_stereo
) c WHERE c.x_id is not null
