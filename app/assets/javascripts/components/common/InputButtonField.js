import React from 'react';
import {
  FormGroup,
  ControlLabel,
  InputGroup,
  FormControl,
  OverlayTrigger,
  Tooltip,
  Button
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';

const InputButtonField = props =>
  (
    <FormGroup>
      <ControlLabel>{props.label}</ControlLabel>
      <InputGroup>
        <FormControl
          type="text"
          value={props.value}
          placeholder={props.placeholder}
          onChange={event => props.onInputChange(props.field, event)}
        />
        <InputGroup.Button>
          <OverlayTrigger
            placement={props.tipPlacement}
            overlay={<Tooltip id={`tooltip-${uuid.v4()}`}>{props.btnTip}</Tooltip>}
          >
            <Button
              bsStyle="success"
              onClick={() => props.onBtnClick(props.btnField, props.btnValue || '')}
            >
              {props.btnValue}
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
      </InputGroup>
    </FormGroup>

  );

InputButtonField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  field: PropTypes.string.isRequired,
  btnValue: PropTypes.string.isRequired,
  btnField: PropTypes.string.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onBtnClick: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  btnTip: PropTypes.string,
  tipPlacement: PropTypes.oneOf(['top', 'bottom', 'right', 'left']),
};

InputButtonField.defaultProps = {
  placeholder: 'Please input...',
  btnTip: 'click here',
  tipPlacement: 'top'
};

export default InputButtonField;
