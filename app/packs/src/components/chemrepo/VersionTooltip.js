import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'react-bootstrap';

const tooltipMessages = {
  new: type => `Create a new version of this ${type}`,
  unsaved: type => `A new version cannot be created from an unsaved ${type}`,
  exists: type => `A new version of this ${type} has already been created`,
  default: 'Create a new version of this element',
};

function createVerTooltip({ type, state, id = null }) {
  const typeLabel = type.toLowerCase();
  const tooltipId = id || `new-ver-${typeLabel}-${state}-tooltip`;

  const content =
    tooltipMessages[state]?.(typeLabel) || tooltipMessages.default;

  return <Tooltip id={tooltipId}>{content}</Tooltip>;
}

createVerTooltip.propTypes = {
  type: PropTypes.string.isRequired,
  state: PropTypes.oneOf(['new', 'unsaved', 'exists']).isRequired,
  id: PropTypes.string,
};

createVerTooltip.defaultProps = { id: null };

export default createVerTooltip;
