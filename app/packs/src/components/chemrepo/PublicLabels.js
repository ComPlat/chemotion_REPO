import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';

function PublicLabels(_labels) {
  // eslint-disable-next-line react/destructuring-assignment
  if (!_labels || !Array.isArray(_labels) || _labels.length < 1) return null;

  const renderTooltip = (description, title) => (
    <Tooltip id="tooltip">{description || title}</Tooltip>
  );

  // eslint-disable-next-line react/destructuring-assignment
  const output = _labels.map(_label => (
    <OverlayTrigger
      key={uuid.v4()}
      placement="top"
      overlay={renderTooltip(_label.description, _label.title)}
    >
      <Badge
        style={{
          backgroundColor: _label.color,
          borderRadius: _label.access_level === 2 ? '0.25em' : '10px',
        }}
      >
        {_label.title}
      </Badge>
    </OverlayTrigger>
  ));
  return <div className="repo-public-labels">{output}</div>;
}

export default PublicLabels;
