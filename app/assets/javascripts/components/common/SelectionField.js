import React from 'react';
import {
  FormGroup,
  ControlLabel,
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import Select from 'react-select';

const SelectionField = (props) => {
  const label = props.label && props.label !== '' ?
    <ControlLabel>{props.label}</ControlLabel> : '';
  if (props.isCreatable) {
    return (
      <FormGroup>
        {label}
        <Select.Creatable
          name={`select-${uuid.v4()}`}
          options={props.options}
          placeholder={props.placeholder}
          multi={false}
          isClearable
          value={props.value}
          onChange={event => props.onChange(props.field, event)}
          promptTextCreator={p => `Create new ${p} ${props.label}`}
        />
      </FormGroup>
    );
  }
  return (
    <FormGroup>
      {label}
      <Select
        name={`select-${uuid.v4()}`}
        options={props.options}
        placeholder={props.placeholder}
        multi={false}
        isClearable
        value={props.value}
        onChange={event => props.onChange(props.field, event)}
      />
    </FormGroup>
  );
};

SelectionField.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape).isRequired,
  value: PropTypes.string.isRequired,
  field: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  isCreatable: PropTypes.bool
};

SelectionField.defaultProps = {
  label: '',
  placeholder: 'Please select...',
  isCreatable: false
};

export default SelectionField;
