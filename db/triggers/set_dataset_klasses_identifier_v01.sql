create trigger set_dataset_klasses_identifier
    after insert on dataset_klasses
    for each statement execute function set_dataset_klasses_identifier();
