import React from 'react';
import { Button, Col, Row, OverlayTrigger, Tooltip } from 'react-bootstrap';
import CountUp from 'react-countup';
import Aviator from 'aviator';

const RepoCardMoleculeArchive = (params) => {
  const { publishedStatics } = params;
  let count = 0;
  if (publishedStatics && publishedStatics.length !== 0) {
    count = publishedStatics.find(p => (p.el_type === 'sample' && p.ex_type === 'xvial'))?.e_cnt || 0;
  }
  const tooltipView = <Tooltip id="id_icon_tip">Click to view chemical compounds</Tooltip>;
  return (
    <Row className="repo-statistic">
      <Col lg={12} md={12} sm={12}>
        <h3>archive for materials</h3>
      </Col>
      <Col lg={12} md={12} sm={12} className="panel panel-info elem-info">
        <Col lg={12} md={12} sm={12} className="panel-heading dtl">
          <Row className="rl">
            <OverlayTrigger placement="top" overlay={tooltipView}>
              <Button className="animation-ring" bsStyle="link" onClick={() => Aviator.navigate('/home/moleculeArchive')}>
                <i className="icon-sample" />
              </Button>
            </OverlayTrigger>
            <div className="tit">Samples</div>
          </Row>
        </Col>
        <Col lg={12} md={12} sm={12} className="panel-heading dtl">
          <div className="rr">
            <div className="cnt">
              <CountUp end={count} />{' '}
              <OverlayTrigger placement="top" overlay={tooltipView}>
                <Button bsStyle="link" onClick={() => Aviator.navigate('/home/moleculeArchive')}>
                  published
                </Button>
              </OverlayTrigger>
            </div>
            <div className="italic-desc">Compounds</div>
          </div>
        </Col>
      </Col>
      <Col lg={12} md={12} sm={12}>
        <Col lg={4} md={4} sm={4} className="panel-heading dtl">
          <img
            className="icon-molecule-archive2"
            src="/images/repo/molecule-archive-logo-weiss.svg"
            key="chemotion_full"
            alt="Molecule Archive"
          />
        </Col>
        <Col lg={8} md={8} sm={8} className="panel-heading dtl">
          find chemical compounds provided as reference compounds from <b>Molecule Archive</b>
        </Col>
      </Col>
    </Row>
  );
};

export default RepoCardMoleculeArchive;
