import React from 'react';
import { Button, ButtonGroup, OverlayTrigger, Popover } from 'react-bootstrap';
import PropTypes from 'prop-types';

const DeleteConfirmBtn = (props) => {
  const { label, onClickYes, onClickNo, tipPlacement } = props;
  const popover = (
    <Popover id="popover-positioned-scrolling-left">
      <Popover.Header as="h3">Delete: {label} ?</Popover.Header>
      <Popover.Body>
        <ButtonGroup>
          <Button variant="danger" size="sm" onClick={() => onClickYes()}>
            Yes
          </Button>
          <Button variant="warning" size="sm" onClick={() => onClickNo()}>
            No
          </Button>
        </ButtonGroup>
      </Popover.Body>
    </Popover>
  );
  return (
    <ButtonGroup className="actions">
      <OverlayTrigger
        placement={tipPlacement}
        trigger="focus"
        overlay={popover}
      >
        <Button size="sm" variant="danger">
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
};

DeleteConfirmBtn.defaultProps = {
  onClickNo: () => {},
  tipPlacement: 'right',
};

export default DeleteConfirmBtn;
