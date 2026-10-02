/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Col, Card, Collapse, Row } from 'react-bootstrap';
import { CalcDuration, ToggleIndicator } from 'src/repo/repoHome/RepoCommon';

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
      <Card className="public-data-section fs-6 fw-normal">
        <Collapse in={show}>
          <Card.Body>
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
          </Card.Body>
        </Collapse>
      </Card>
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
