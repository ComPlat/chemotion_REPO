import React from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ButtonToolbar,
  Badge,
  Modal,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { AffiliationMap } from 'src/repo/repoHome/RepoReviewCommon';
import Utils from 'src/utilities/Functions';
import {
  AffiliationList,
  AuthorList,
  ContributorInfo,
  DownloadMetadataBtn
} from 'src/repo/repoHome/RepoCommon';

const Doi = (props) => {
  const { type, id, doi } = props;
  const title = `${type} DOI:`.replace(/(^\w)/g, m => m.toUpperCase());
  const data = (
    <span className="gap-2">
      <Button key={`${type}-jumbtn-${id}`} variant="link" onClick={() => { window.location = `https://dx.doi.org/${doi}`; }}>{doi}</Button>
      <DownloadMetadataBtn type={type} id={id} />
      <OverlayTrigger placement="bottom" overlay={<Tooltip id="tip_clipboard">copy to clipboard</Tooltip>}>
        <Button onClick={() => { navigator.clipboard.writeText(`https://dx.doi.org/${doi}`); }} size="xsm" className="ms-1" variant="outline-dark">
          <i className="fa fa-clipboard" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    </span>
  );
  return (
    <h5>
      <b>{title} </b>
      {data}
    </h5>
  );
};

const MetadataModal = ({ showModal, label, metadata, onCloseFn, elementId, elementType }) => {
  const contentUrl = `/api/v1/public/metadata/download?type=${elementType.toLowerCase()}&id=${elementId}`;
  return (
    <div>
      <Modal
        show={showModal}
        centered
        size="xl"
        onHide={onCloseFn}
      >
        <Modal.Header closeButton>
          <Modal.Title><h4>Embargo: {label}</h4></Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div style={{ maxHeight: '50vh', overflow: 'auto', whiteSpace: 'pre', backgroundColor: 'black', color: 'white', fontFamily: 'monospace' }}>
            {metadata}
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button variant="secondary" onClick={onCloseFn}>Close</Button>
          <Button variant="primary" onClick={() => Utils.downloadFile({ contents: contentUrl })}>Download</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

MetadataModal.propTypes = {
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired
};

const ElementDoi = (edois, isPublished) => {
  if (edois == null || typeof edois === 'undefined' || edois.length === 0) {
    return (<div className="text-muted fst-italic mt-1 small">No Element DOIs available</div>);
  }
  const dois = edois.map(edoi => (
    <div key={`${edoi.element_type}_${edoi.element_id}`} className="mb-0 py-1 border-bottom">
      <Doi type={edoi.element_type} id={edoi.element_id} doi={edoi.doi || ''} isPublished={isPublished} />
    </div>
  ));
  return (<div className="d-flex flex-column">{dois}</div>);
};

const InfoModal = ({ showModal, selectEmbargo, onCloseFn, editable=false }) => {
  const tag = (selectEmbargo && selectEmbargo.taggable_data) || {};
  const affiliationMap = AffiliationMap(tag.affiliation_ids, tag.affiliations);
  const doi = tag.col_doi || '';
  const la =  selectEmbargo && selectEmbargo.taggable_data && selectEmbargo.taggable_data.label;
  const isPublished = true;
  const author_ids = tag.author_ids || [];
  const id = (selectEmbargo && selectEmbargo.element_id) || 0;

  return (
    <Modal show={showModal} size="xl" centered onHide={onCloseFn}>
      <Modal.Header closeButton>
        <Modal.Title>
          Embargo: {la}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <div className="bg-light p-3 border-bottom">
          <div className="mb-2">
            <ContributorInfo contributor={tag.contributors} affiliationMap={affiliationMap} />
          </div>

          <div className="mb-2 fs-6">
            <span className="fw-bold me-2">Author{author_ids.length > 1 ? 's' : ''}:</span>
            <AuthorList creators={tag.creators} affiliationMap={affiliationMap} affiliations={tag.affiliations} contributor={tag.contributors} />
          </div>

          <div className="mb-0 text-muted small">
            <AffiliationList
              affiliations={tag.affiliations}
              affiliationMap={affiliationMap}
              rorMap={tag.rors}
            />
          </div>

          <div className="mt-2 p-2 bg-white border rounded shadow-sm">
            <Doi type="collection" id={id} doi={doi} isPublished={isPublished} />
          </div>
        </div>

        <div className="p-3" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
          <h6 className="mb-2 border-bottom pb-1 text-secondary fw-bold">Element DOIs</h6>
          {ElementDoi(tag.element_dois, isPublished)}
        </div>
      </Modal.Body>
      <Modal.Footer className="bg-light py-1 justify-content-start">
        <Button variant="secondary" onClick={onCloseFn}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export { MetadataModal, InfoModal };
