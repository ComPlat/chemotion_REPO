/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { permitOn } from 'src/components/common/uis';
import { getElementType } from 'src/components/chemrepo/publication-utils';

const UnsealBtn = (props) => {
  const { element, fnUnseal } = props;
  if (!element) return null;

  return !permitOn(element) ? (
    <>
      <OverlayTrigger
        placement="bottom"
        overlay={
          <Tooltip
            id="_tooltip_unseal_button"
            className="left_tooltip bs_tooltip"
          >
            {`This ${getElementType(
              element
            )} has been submitted and is currently locked for
          modifications. Click to 'Unseal' it for editing.`}
          </Tooltip>
        }
      >
        <Button bsSize="xsmall" bsStyle="success" onClick={fnUnseal}>
          <i className="fa fa-lock" aria-hidden="true" />
          &nbsp; Locked
        </Button>
      </OverlayTrigger>
    </>
  ) : null;
};

UnsealBtn.propTypes = {
  element: PropTypes.object.isRequired,
  fnUnseal: PropTypes.func,
};

UnsealBtn.defaultProps = { fnUnseal: () => {} };

export default UnsealBtn;
