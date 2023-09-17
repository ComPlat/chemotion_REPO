/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Col, Panel, Row } from 'react-bootstrap';
import { CalcDuration, ToggleIndicator } from '../../libHome/RepoCommon';

const PublicReactionProperties = ({
  reaction, toggle, show, isPublished
}) => {
  if (!reaction) return null;
  const { status, temperature } = reaction;
  const reactionStatus = status?.trim() || '';
  const reactionTemperature = (temperature || {}).userText || '';
  const reactionDuration = CalcDuration(reaction);
  if (
    isPublished &&
    !reactionStatus &&
    !reactionTemperature &&
    !reactionDuration
  ) { return null; }
  return (
    <span>
      <ToggleIndicator
        onClick={toggle}
        name="Properties"
        indicatorStyle={show ? 'down' : 'right'}
      />
      <Panel
        className="public-data-section"
        id="collapsible-panel-properties"
        expanded={show}
        defaultExpanded={show}
        onToggle={() => {}}
      >
        <Panel.Collapse>
          <Panel.Body>
            <Row>
              <Col sm={4} md={4} lg={4}>
                <b>Status: </b>
                {reactionStatus}
              </Col>
              <Col sm={4} md={4} lg={4}>
                {isPublished && !reactionTemperature ? '' : (<b>Temperature: </b>)}
                {temperature?.userText !== ''
                  ? `${temperature.userText} ${temperature.valueUnit}`
                  : ''}
              </Col>
              <Col sm={4} md={4} lg={4}>
                {isPublished && !reactionDuration ? '' : (
                  <b>Duration: </b>
                )}
                {reactionDuration}
              </Col>
            </Row>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );
};

PublicReactionProperties.propTypes = {
  reaction: PropTypes.any.isRequired,
  toggle: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  isPublished: PropTypes.bool.isRequired,
};

export default PublicReactionProperties;
