import React, { Component } from 'react';
import { Button, Label, Col, Row, Carousel, Thumbnail, OverlayTrigger, Tooltip } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import CountUp from 'react-countup';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import { HomeFeature } from './RepoCommon';
import RepoCardLatestPublish from './RepoCardLatestPublish';

const RepoCardIntro1 = ({ lastPublished }) => (
  <div className="repo-intro" style={{ flexDirection: 'column' }}>
    <Row style={{ display: 'flex', alignItems: 'center' }}>
      <Col lg={6} md={6} sm={12}>
        <img
          className="icon-chemotion"
          src="/images/repo/Chemotion-V1.png"
          key="chemotion_full"
          alt="Chemotion Repository"
        />
      </Col>
      <Col lg={6} md={6} sm={12}>
        <RepoCardLatestPublish lastPublished={lastPublished} />
      </Col>
    </Row>
    <Row style={{ fontSize: '120%' }}>
      <Col lg={12} md={12} sm={12}>
        <ul className="list">
          <li>
            Publish your <b>structures</b> and <b>reactions</b>, attach your characterization data, and make them citable via <b>DOI</b>
          </li>
          <li>
            Automated registration at various scientific data providers
          </li>
          <li>
            <h4 style={{ display: 'inline' }}><Label style={{ backgroundColor: '#ff5555', textShadow: '2px 2px #555' }}>NEW</Label></h4>
            <i>&nbsp;Find chemical compounds from <b>Molecular Archive</b></i>
          </li>
        </ul>
      </Col>
    </Row>
  </div>
);

export default RepoCardIntro1;
