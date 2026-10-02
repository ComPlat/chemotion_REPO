import React from 'react';
import { Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import Utils from 'src/utilities/Functions';
import LdData from 'src/repo/chemrepo/LdData';

const DownloadMetadataBtn = (l) => {
  let contentUrl = `/api/v1/public/metadata/download?type=${l.type.toLowerCase()}&id=${l.id}`;
  if (l.concept) {
    contentUrl += '&concept=1'
  }

  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id={`tt_metadata__${uuid.v4()}`}>download published metadata</Tooltip>}
    >
      <Button
        size="xsm"
        onClick={() => Utils.downloadFile({
          contents: contentUrl
        })}
        variant="outline-dark"
      >
        <i className="fa fa-file-code-o" />
      </Button>
    </OverlayTrigger>
  );
};

const DownloadJsonBtn = (l) => {
  let contentUrl = `/api/v1/public/metadata/download_json?type=${l.type.toLowerCase()}&id=${l.id}`;
  if (l.concept) {
    contentUrl += '&concept=1'
  }
  return (
    <>
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id={`tt_metadata__${uuid.v4()}`}>download JSON-LD</Tooltip>}
      >
        <Button
          style={{ backgroundColor: 'grey', color:'white', marginLeft: '5px' }}
          size="sm"
          onClick={() => Utils.downloadFile({
            contents: contentUrl
          })}
        >
          JSON-LD
        </Button>
      </OverlayTrigger>
      <LdData type={l.type.toLowerCase()} id={l.id} />
    </>
  );
};

const DownloadZipBtn = ({ zipUrl, chemotionZipUrl, publicationId, buttonSize }) => {
  const [showModal, setShowModal] = React.useState(false);

  // Button is disabled (not rendered) when both URLs are null, undefined, or empty
  if (!zipUrl && !chemotionZipUrl) {
    return null;
  }

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleDownload = (url, type) => {
    const filename = publicationId
      ? `Publication-${publicationId}-${type}.zip`
      : `Publication-${type}.zip`;

    Utils.downloadFile({
      contents: url,
      name: filename
    });
    setShowModal(false);
  };

  return (
    <>
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id={`tt_zip_download__${uuid.v4()}`}>Download ZIP file</Tooltip>}
      >
        <Button
          size={buttonSize}
          variant="outline-dark"
          onClick={handleOpenModal}
        >
          <i className="fa fa-file-archive-o" />&nbsp;Download ZIP
        </Button>
      </OverlayTrigger>

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Download ZIP File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Please select which ZIP file you would like to download:</p>
          <div style={{ marginTop: '20px' }}>
            {zipUrl && (
              <Button
                variant="primary"
                size="lg"
                className="d-block w-100"
                onClick={() => handleDownload(zipUrl, 'standard')}
                style={{ marginBottom: '10px' }}
              >
                <i className="fa fa-download" /> Standard ZIP
              </Button>
            )}
            {chemotionZipUrl && (
              <Button
                variant="primary"
                size="lg"
                className="d-block w-100"
                onClick={() => handleDownload(chemotionZipUrl, 'chemotion')}
              >
                <i className="fa fa-download" /> Chemotion ZIP
              </Button>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleCloseModal}>Cancel</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

DownloadZipBtn.propTypes = {
  zipUrl: PropTypes.string,
  chemotionZipUrl: PropTypes.string,
  publicationId: PropTypes.number,
  buttonSize: PropTypes.string,
};

DownloadZipBtn.defaultProps = {
  zipUrl: null,
  chemotionZipUrl: null,
  publicationId: null,
  buttonSize: 'xsm',
};

const DownloadDOICsv = (e, a) => {
  const dataToCsvURI = data => encodeURI(`data:text/csv;charset=utf-8,${data.map(row => row.join(',')).join('\n')}`);
  const dois = [];
  dois.push(['Reserved DOIs', '']);
  dois.push(['', '']);

  if (e.tag.taggable_data.reserved_doi) dois.push([e.type.charAt(0).toUpperCase() + e.type.slice(1), `DOI: ${e.tag.taggable_data.reserved_doi}`]);
  a.forEach((an) => {
    if (an.extended_metadata.reserved_doi) dois.push([`${an.name} - ${an.extended_metadata.kind}`, `DOI: ${an.extended_metadata.reserved_doi}`]);
  });

  if (e.type === 'reaction') {
    // product(sample)
    if (e.products !== null && e.products.length > 0) {
      e.products.forEach((p) => {
        if (p.tag.taggable_data.reserved_doi) dois.push([`Product ${p.name}`, `DOI: ${p.tag.taggable_data.reserved_doi}`]);
        p.analysisArray().forEach((an) => {
          if (an.extended_metadata.reserved_doi) dois.push([`${an.name} - ${an.extended_metadata.kind}`, `DOI: ${an.extended_metadata.reserved_doi}`]);
        });
      });
    }
  }
  Utils.downloadFile({ contents: dataToCsvURI(dois), name: 'export_dois.csv' });
};

export { DownloadMetadataBtn, DownloadJsonBtn, DownloadZipBtn, DownloadDOICsv };
