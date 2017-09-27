import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import helpDescs from '../utils/helpDescs';

const HelpInfo = props => (
  helpDescs[props.source] !== undefined ?
    <span>
      <OverlayTrigger container={this} trigger={['hover']} delayShow={600} placement={props.place} overlay={<Tooltip id="tooltip_content" className="left_tooltip max_tooltip">{helpDescs[props.source]}</Tooltip>}>
        {props.optionalElement}
      </OverlayTrigger>
    </span> : null
);

HelpInfo.propTypes = {
  source: PropTypes.string.isRequired,
  place: PropTypes.oneOf(['top', 'bottom', 'right', 'left']),
  optionalElement: PropTypes.element,
};

HelpInfo.defaultProps = {
  place: 'top',
  optionalElement: (<i className="fa fa-info-circle" aria-hidden="true" />)
};

export default HelpInfo;
