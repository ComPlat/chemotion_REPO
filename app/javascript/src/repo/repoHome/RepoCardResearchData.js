import React from 'react';
import { Card } from 'react-bootstrap';
import RepoCardStaticsBoard from 'src/repo/repoHome/RepoCardStaticsBoard';

const RepoCardResearchData = ({ publishedStatics }) => (
  <Card className="repo-research-data h-100 w-100">
    <Card.Header className="py-2 border-0">
      <h3>research data repository</h3>
    </Card.Header>
    <Card.Body className="py-2">
      <RepoCardStaticsBoard publishedStatics={publishedStatics} />
    </Card.Body>
  </Card>
);

export default RepoCardResearchData;
