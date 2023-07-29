create trigger set_element_klasses_identifier
    after insert on element_klasses
    for each statement execute function set_element_klasses_identifier();
