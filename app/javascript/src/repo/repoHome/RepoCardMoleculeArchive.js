import React from 'react';
import { Button, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Aviator from 'aviator';

const formatCount = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return n;
  if (num >= 10000) return `${Math.round(num / 1000)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num;
};

const RepoCardMoleculeArchive = (params) => {
  const { publishedStatics } = params;
  let count = 0;
  if (publishedStatics && publishedStatics.length !== 0) {
    count = publishedStatics.find(p => (p.el_type === 'sample' && p.ex_type === 'xvial'))?.e_cnt || 0;
  }
  const tooltipView = <Tooltip id="id_archive_tip">Click to view chemical compounds</Tooltip>;
  const goArchive = () => Aviator.navigate('/home/moleculeArchive');

  return (
    <Card className="repo-molecule-archive h-100 w-100">
      <Card.Header className="py-2 border-0">
        <h3>archive for materials</h3>
      </Card.Header>
      <Card.Body className="py-2">
        <div className="repo-stat-strip repo-stat-strip-single">
          <OverlayTrigger placement="top" overlay={tooltipView}>
            <Button
              variant="link"
              className="donut-col donut-col-link"
              onClick={goArchive}
            >
              <span className="donut-col-main">
                <span className="stat-icon-slot">
                  <i className="icon-sample" aria-hidden />
                </span>
                <span className="donut-col-headline">
                  <span className="donut-col-label">Compounds</span>
                  <span className="donut-col-value">{formatCount(count)}</span>
                </span>
              </span>
            </Button>
          </OverlayTrigger>
        </div>
      </Card.Body>
      <Card.Footer className="d-flex flex-column align-items-center border-0">
        <p className="archive-description text-center mb-2">
          Reference compounds from the <b>Molecule Archive</b>
        </p>
        <a
          href="https://compound-platform.eu/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the Molecule Archive site"
        >
          <img
            className="icon-molecule-archive2"
            src="/images/repo/molecule-archive-logo-MS-weiss.svg"
            alt="Molecule Archive"
          />
        </a>
      </Card.Footer>
    </Card>
  );
};

export default RepoCardMoleculeArchive;
