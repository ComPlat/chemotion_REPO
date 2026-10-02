import React from 'react';
import { Card } from 'react-bootstrap';

const RepoCardNfdi4chem = () => (
  <Card className="repo-nfdi4chem h-100 w-100">
    <Card.Body className="py-2 d-flex flex-row align-items-center justify-content-center">
      <p className="nfdi4chem-intro mb-0 me-3 text-end">
        This repository is part of the strategy of
      </p>
      <img
        className="nfdi4chem-logo"
        src="/images/repo/NFDI4Chem_logo.svg"
        alt="NFDI4Chem"
      />
    </Card.Body>
  </Card>
);

export default RepoCardNfdi4chem;
