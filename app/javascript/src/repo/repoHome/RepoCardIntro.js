import React from 'react';
import { Col, Row } from 'react-bootstrap';
import RepoCardLatestPublish from 'src/repo/repoHome/RepoCardLatestPublish';
import RepoCardNfdi4chem from 'src/repo/repoHome/RepoCardNfdi4chem';

const RepoCardIntro = ({ lastPublished }) => (
  <div className="repo-intro w-100 h-100">
    <Row className="h-100 d-flex flex-column w-100">
      <Col xs={12}>
        <h1>Repository for samples, reactions and related research data</h1>
      </Col>
      <Col xs={12} className="flex-grow-1">
        <div className="repo-intro-body d-flex flex-column flex-md-row h-100 w-100">
          <div className="repo-intro-latest d-flex align-items-center">
            <RepoCardLatestPublish lastPublished={lastPublished} />
          </div>
        </div>
      </Col>
      <Col xs={12} className="p-0">
        <div className="repo-intro-body d-flex flex-column flex-md-row h-100 w-100">
          <div className="repo-intro-strategy">
            <RepoCardNfdi4chem />
          </div>
        </div>
      </Col>
    </Row>
  </div>
);

export default RepoCardIntro;
