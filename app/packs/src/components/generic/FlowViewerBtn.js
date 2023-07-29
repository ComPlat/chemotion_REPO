/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { renderFlowModal } from '../../generic/Utils';

const FlowViewerBtn = props => (
  <OverlayTrigger delayShow={1000} placement="top" overlay={<Tooltip id={uuid.v4()}>click to view defined workflow</Tooltip>}>
    <Button onClick={() => renderFlowModal(props.generic, true)} bsSize="xsmall" bsStyle="primary"><i className="fa fa-sitemap" aria-hidden="true" />{' '}Workflow</Button>
  </OverlayTrigger>
);

FlowViewerBtn.propTypes = { generic: PropTypes.object.isRequired };

export default FlowViewerBtn;
