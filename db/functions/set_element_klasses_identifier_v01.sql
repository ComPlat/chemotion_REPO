create or replace function set_element_klasses_identifier()
returns trigger as
$FUNC$
begin
	update element_klasses set identifier = gen_random_uuid() where identifier is null;
  return new;
end
$FUNC$ language plpgsql;
