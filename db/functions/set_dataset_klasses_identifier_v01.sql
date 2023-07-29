create or replace function set_dataset_klasses_identifier()
returns trigger as
$FUNC$
begin
	update dataset_klasses set identifier = gen_random_uuid() where identifier is null;
  return new;
end
$FUNC$ language plpgsql;
