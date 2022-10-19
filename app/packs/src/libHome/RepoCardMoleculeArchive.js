import React, { Component } from 'react';
import { Button, Label, Col, Row, Carousel, Thumbnail, OverlayTrigger, Tooltip } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import CountUp from 'react-countup';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import { HomeFeature } from './RepoCommon';

const RepoCardMoleculeArchive = () => {
  const tooltipView = <Tooltip id="id_icon_tip">Click to view chemical compounds</Tooltip>;
  return (
    <div>
    <Row className="repo-statistic" style={{ justifyContent: 'center' }}>
      <Col lg={12} md={12} sm={12}>
        <Col lg={12} md={12} sm={12} style={{ textAlign: 'center', fontSize: '24px', margin: '20px' }}>
          archive for materials
        </Col>
      </Col>
      <Col lg={12} md={12} sm={12} className="panel panel-info elem-info" style={{ flex: 'unset' }}>
        <Col lg={12} md={12} sm={12} className="panel-heading dtl">
          <Row className="rl">
            <OverlayTrigger placement="top" overlay={tooltipView}>
              <Button className="animation-ring" bsStyle="link">
                <i className="icon-sample" />
              </Button>
            </OverlayTrigger>
            <div className="tit">Samples</div>
          </Row>
        </Col>
        <Col lg={12} md={12} sm={12} className="panel-heading dtl">
          <Row className="rr">
            <div className="tit">
              <OverlayTrigger placement="top" overlay={tooltipView}>
                <Button bsStyle="link">
                  published
                </Button>
              </OverlayTrigger>
            </div>
            <div className="cnt">
              <CountUp end={1680} />
            </div>
            <div className="italic-desc">Compounds</div>
          </Row>
        </Col>
      </Col>
      <Col lg={12} md={12} sm={12}>
        <Col lg={4} md={4} sm={4} style={{ display: 'flex', justifyContent: 'center' }}>
          <img
            className="icon-molecule-archive2"
            src="/images/repo/molecule-archive-logo-weiss.svg"
            key="chemotion_full"
            alt="Molecule Archive"
          />
        </Col>
        <Col lg={8} md={8} sm={8} style={{ fontSize: '1.5rem' }}>
          find chemical compounds provided as reference compounds from <b>Molecule Archive</b>
        </Col>
      </Col>
    </Row>
    </div>
  );
};

export default RepoCardMoleculeArchive;
