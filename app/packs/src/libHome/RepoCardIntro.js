import React, { Component } from 'react';
import { Button, Label, Col, Row, Carousel, Thumbnail, OverlayTrigger, Tooltip } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import CountUp from 'react-countup';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import { HomeFeature } from './RepoCommon';
import RepoCardLatestPublish from './RepoCardLatestPublish';

const RepoCardIntro = ({ lastPublished }) => (
  <div className="container">
    <Row>
      <Col md={6} sm={12} className="even">
        <img
          className="icon-chemotion"
          src="/images/repo/Chemotion-V1.png"
          key="chemotion_full"
          alt="Chemotion Repository"
        />
      </Col>
      <Col md={6} sm={12} className="even">
        <RepoCardLatestPublish lastPublished={lastPublished} />
      </Col>
    </Row>
    <Row>
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

export default RepoCardIntro;
