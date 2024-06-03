/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Col, Panel, Row } from 'react-bootstrap';
import { ToggleIndicator } from 'src/repoHome/RepoCommon';

const PublicReactionTlc = ({
  reaction, toggle, show, isPublished
}) => {
  if (!reaction) return null;
  let {
    tlc_description: tlcDescription,
    tlc_solvents: tlcSolvents,
    rf_value: rfValue,
  } = reaction;
  tlcDescription = tlcDescription || '';
  tlcSolvents = tlcSolvents || '';
  if (isPublished && !tlcDescription && !tlcSolvents && !rfValue) return null;
  return (
    <span>
      <ToggleIndicator
        onClick={toggle}
        name="TLC-Control"
        indicatorStyle={show ? 'down' : 'right'}
      />
      <Panel
        className="public-data-section"
        id="collapsible-panel-tlc"
        expanded={show}
        defaultExpanded={show}
        onToggle={() => {}}
      >
        <Panel.Collapse>
          <Panel.Body>
            <Row>
              <Col sm={2} md={2} lg={2}>
                <b>Solvents (parts)</b>
              </Col>
              <Col sm={10} md={10} lg={10}>
                {tlcSolvents}
              </Col>
            </Row>
            <Row>
              <Col sm={2} md={2} lg={2}>
                <b>Rf-Value</b>
              </Col>
              <Col sm={10} md={10} lg={10}>
                {rfValue}
              </Col>
            </Row>
            <Row>
              <Col sm={2} md={2} lg={2}>
                <b>TLC-Description</b>
              </Col>
              <Col sm={10} md={10} lg={10}>
                <div>{tlcDescription}</div>
              </Col>
            </Row>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );
};

PublicReactionTlc.propTypes = {
  reaction: PropTypes.any.isRequired,
  toggle: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  isPublished: PropTypes.bool.isRequired,
};

export default PublicReactionTlc;
