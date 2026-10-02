import React from 'react';
import PropTypes from 'prop-types';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';

const QuickCreationBadge = ({ sample }) => {
  const source = sample?.tag?.taggable_data?.creation_source;
  if (source !== 'quick_entry') return null;

  const tooltip = (
    <Tooltip id={`quick-creation-tooltip-${sample.id}`}>
      Submitted via the public welcome-page &quot;New Entry&quot; quick form.
    </Tooltip>
  );

  return (
    <OverlayTrigger placement="top" overlay={tooltip}>
      <Badge bg="warning" text="dark" className="mx-2 quick-creation-badge">
        <i className="fa fa-bolt" aria-hidden="true" />
        &nbsp;Quick creation
      </Badge>
    </OverlayTrigger>
  );
};

QuickCreationBadge.propTypes = {
  sample: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    tag: PropTypes.shape({
      taggable_data: PropTypes.shape({
        creation_source: PropTypes.string,
      }),
    }),
  }),
};

QuickCreationBadge.defaultProps = {
  sample: null,
};

export default QuickCreationBadge;
