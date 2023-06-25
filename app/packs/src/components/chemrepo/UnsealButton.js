import React from 'react';
import PropTypes from 'prop-types';
import { Label, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { permitOn } from '../common/uis';
import { getElementType } from './publication-utils';

const UnsealBtn = (props) => {
  const { element, fnUnseal } = props;
  if (!element) return null;

  return !permitOn(element) ? (
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
          modifications. You can 'Unseal' it for editing.`}
        </Tooltip>
      }
    >
      <div style={{ display: 'inline-block' }}>
        <div onClick={fnUnseal}>
          <span className="collection-label repo-btn-success" key={element.id}>
            <Label>
              <i className="fa fa-unlock" aria-hidden="true" />
            </Label>
          </span>
        </div>
      </div>
    </OverlayTrigger>
  ) : null;
};

UnsealBtn.propTypes = {
  element: PropTypes.object.isRequired,
  fnUnseal: PropTypes.func,
};

UnsealBtn.defaultProps = { fnUnseal: () => {} };

export default UnsealBtn;
