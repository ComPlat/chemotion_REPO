import React from 'react';
import {
  Button,
  ButtonGroup,
  OverlayTrigger,
  Popover
} from 'react-bootstrap';
import PropTypes from 'prop-types';

const DeleteConfirmBtn = (props) => {
  const popover = (
    <Popover id="popover-positioned-scrolling-left">
      delete: <br /> {props.label} ?<br />
      <ButtonGroup>
        <Button bsStyle="danger" bsSize="xsmall" onClick={() => props.onClickYes()} >
          Yes
        </Button>&nbsp;
        <Button bsStyle="warning" bsSize="xsmall" onClick={() => props.onClickNo()} >
          No
        </Button>
      </ButtonGroup>
    </Popover>
  );
  return (
    <ButtonGroup className="actions">
      <OverlayTrigger
        animation
        placement={props.tipPlacement}
        root
        trigger="focus"
        overlay={popover}
      >
        <Button bsSize="xsmall" bsStyle="danger" >
          <i className="fa fa-trash-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    </ButtonGroup>
  );
};

DeleteConfirmBtn.propTypes = {
  label: PropTypes.string.isRequired,
  onClickYes: PropTypes.func.isRequired,
  onClickNo: PropTypes.func,
  tipPlacement: PropTypes.oneOf(['top', 'bottom', 'right', 'left'])
};

DeleteConfirmBtn.defaultProps = {
  onClickNo: () => { },
  tipPlacement: 'right'
};

export default DeleteConfirmBtn;
