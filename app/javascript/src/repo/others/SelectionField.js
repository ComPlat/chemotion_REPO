import React from 'react';
import {
  Form,
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

function SelectionField(props) {
  const {
    label, isCreatable, options, placeholder, value, field, onChange
  } = props;

  // Ensure value is correctly formatted for react-select (requires an object, not just a string value)
  const getFormattedValue = () => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    const matchedOption = options.find(o => o.value === value);
    return matchedOption || { label: value, value: value };
  };

  const selectStyles = {
    menuPortal: base => ({ ...base, zIndex: 9999 })
  };

  const labelElement = label && label !== ''
    ? <Form.Label>{label}</Form.Label>
    : '';

  if (isCreatable) {
    return (
      <Form.Group>
        {labelElement}
        <CreatableSelect
          name={`select-${uuid.v4()}`}
          options={options}
          placeholder={placeholder}
          isMulti={false}
          isClearable
          value={getFormattedValue()}
          onChange={(event) => onChange(field, event)}
          formatCreateLabel={(p) => `Create new ${p} ${label}`}
          menuPortalTarget={document.body} // Render menu in a portal to avoid clipping
          styles={selectStyles}
          className="selection-field-container"
        />
      </Form.Group>
    );
  }
  return (
    <Form.Group>
      {labelElement}
      <Select
        name={`select-${uuid.v4()}`}
        options={options}
        placeholder={placeholder}
        isMulti={false}
        isClearable
        value={getFormattedValue()}
        onChange={(event) => onChange(field, event)}
        menuPortalTarget={document.body} // Render menu in a portal to avoid clipping
        styles={selectStyles}
        className="selection-field-container"
      />
    </Form.Group>
  );
}

SelectionField.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape).isRequired,
  value: PropTypes.string.isRequired,
  field: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  isCreatable: PropTypes.bool,
};

SelectionField.defaultProps = {
  label: '',
  placeholder: 'Please select...',
  isCreatable: false,
};

export default SelectionField;
