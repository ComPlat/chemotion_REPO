import React from 'react';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';

const DropdownButtonSelection = props =>
  (
    <DropdownButton
      title={props.selected || props.placeholder}
      key={props.selected}
      id={`dropdown-${uuid.v4()}`}
      onSelect={props.onSelect}
    >
      {
        props.options.map(element => (
          <MenuItem key={element} eventKey={element} disabled={props.disabled}>
            {element}
          </MenuItem>
        ))
      }
    </DropdownButton>
  );

DropdownButtonSelection.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  placeholder: PropTypes.string.isRequired,
  selected: PropTypes.string,
  onSelect: PropTypes.func,
  disabled: PropTypes.bool
};

DropdownButtonSelection.defaultProps = {
  selected: null,
  onSelect: null,
  disabled: false
};

export default DropdownButtonSelection;
