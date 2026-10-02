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
      <Popover.Body>
        delete: <br /> {props.label} ?<br />
        <ButtonGroup>
          <Button variant="danger" size="sm" onClick={() => props.onClickYes()} >
            Yes
          </Button>{' '}
          <Button variant="warning" size="sm" onClick={() => props.onClickNo()} >
            No
          </Button>
        </ButtonGroup>
      </Popover.Body>
    </Popover>
  );
  return (
    <ButtonGroup className="actions">
      <OverlayTrigger
        placement={props.tipPlacement}
        trigger="focus"
        overlay={popover}
      >
        <Button size={props.size || "sm"} variant="danger" >
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
  tipPlacement: PropTypes.oneOf(['top', 'bottom', 'right', 'left']),
  size: PropTypes.string
};

DeleteConfirmBtn.defaultProps = {
  onClickNo: () => { },
  tipPlacement: 'right',
  size: 'sm'
};

export default DeleteConfirmBtn;
