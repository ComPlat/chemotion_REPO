CREATE OR REPLACE FUNCTION public.com_xvial(p_allow boolean DEFAULT false)
 RETURNS SETOF compound_open_data_locals
 LANGUAGE plpgsql
AS $function$
begin
	if p_allow IS false then
		return QUERY SELECT compound_open_data_locals.* FROM compound_open_data_locals;
	elsif EXISTS(select * from to_regclass('compound_open_datas') where to_regclass is not null) then
	   RETURN QUERY SELECT compound_open_datas.* FROM compound_open_datas;
	else
	   return QUERY SELECT compound_open_data_locals.* FROM compound_open_data_locals;
    end if;
END
$function$
;
