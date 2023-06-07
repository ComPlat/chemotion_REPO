import React from 'react';
import { Col, Row } from 'react-bootstrap';
import RepoCardLatestPublish from './RepoCardLatestPublish';

const RepoCardIntro = ({ lastPublished }) => (
  <div className="repo-intro">
    <Row>
      <Col lg={12} md={12} sm={12}>
        <h1>Repository for samples, reactions and related research data</h1>
      </Col>
    </Row>
    <Row className="row-bottom">
      <Col lg={4} md={4} sm={12}>
        <div className="card-well-competition card-nfdi4chem">
          <h4>
            this repository is part of the strategy of
          </h4>
          <img
            className="icon-nfdi4chem"
            src="/images/repo/NFDI4Chem_logo.svg"
            key="NFDI4Chem"
            alt="NFDI4Chem"
          />
        </div>
      </Col>
      <Col lg={8} md={8} sm={12}>
        <RepoCardLatestPublish lastPublished={lastPublished} />
      </Col>
    </Row>
  </div>
);

export default RepoCardIntro;
