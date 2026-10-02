import React, { useMemo } from 'react';
import { DropdownButton, Dropdown } from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';

const DropdownButtonSelection = ({
  options, placeholder, selected, onSelect, disabled, className, variant,
}) => {
  const id = useMemo(() => `dropdown-${uuid.v4()}`, []);
  return (
    <DropdownButton
      variant={variant}
      title={selected || placeholder}
      id={id}
      onSelect={onSelect}
      disabled={disabled}
      className={`dropdown-button-selection ${className}`.trim()}
    >
      {options.map(opt => (
        <Dropdown.Item key={opt} eventKey={opt} active={opt === selected}>
          {opt}
        </Dropdown.Item>
      ))}
    </DropdownButton>
  );
};

DropdownButtonSelection.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  placeholder: PropTypes.string.isRequired,
  selected: PropTypes.string,
  onSelect: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  variant: PropTypes.string,
};

DropdownButtonSelection.defaultProps = {
  selected: null,
  onSelect: null,
  disabled: false,
  className: '',
  variant: 'outline-secondary',
};

export default DropdownButtonSelection;
