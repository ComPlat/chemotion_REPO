import React from 'react';
import PropTypes from 'prop-types';
import { Button, Label, Modal, ButtonToolbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { AffiliationMap } from 'repo-review-ui';
import Utils from 'src/utilities/Functions';
import {
  AffiliationList,
  AuthorList,
  ContributorInfo,
  DownloadMetadataBtn
} from 'src/repoHome/RepoCommon';

const Doi = (props) => {
  const { type, id, doi } = props;
  const title = `${type} DOI:`.replace(/(^\w)/g, m => m.toUpperCase());
  const data = (
    <span>
      <Button key={`${type}-jumbtn-${id}`} bsStyle="link" onClick={() => { window.location = `https://dx.doi.org/${doi}`; }}>{doi}</Button>
      <DownloadMetadataBtn type={type} id={id} />
      <OverlayTrigger placement="bottom" overlay={<Tooltip id="tip_clipboard">copy to clipboard</Tooltip>}>
        <Button onClick={() => { navigator.clipboard.writeText(`https://dx.doi.org/${doi}`); }} bsSize="xsmall" >
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
        onHide={onCloseFn}
        dialogClassName="news-preview-dialog"
      >
        <Modal.Body style={{ overflow: 'auto' }}>
          <div><h4><Label>{label}</Label></h4></div>
          <div style={{ maxHeight: '50vh', overflow: 'auto', whiteSpace: 'pre', backgroundColor: 'black', color: 'white', fontFamily: 'monospace' }}>
            {metadata}
          </div>
          <br />
          <ButtonToolbar>
            <Button bsStyle="warning" onClick={onCloseFn}> Close</Button>
            <Button bsStyle="primary" onClick={() => Utils.downloadFile({ contents: contentUrl })}> Download</Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    </div>
  );
};

MetadataModal.propTypes = {
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired
};

const ElementDoi = (edois, isPublished) => {
  if (edois == null || typeof edois === 'undefined' || edois.length === 0) { return (<div />); }
  const dois = edois.map(edoi => (<div key={`${edoi.element_type}_${edoi.element_id}`}><Doi type={edoi.element_type} id={edoi.element_id} doi={edoi.doi || ''} isPublished={isPublished} /></div>));
  return (<div>{dois}</div>);
};

const InfoModal = ({ showModal, selectEmbargo, onCloseFn, editable=false }) => {
  const tag = (selectEmbargo && selectEmbargo.taggable_data) || {};
  const affiliationMap = AffiliationMap(tag.affiliation_ids);
  const doi = tag.col_doi || '';
  const la =  selectEmbargo && selectEmbargo.taggable_data && selectEmbargo.taggable_data.label;
  const isPublished = true;
  const author_ids = tag.author_ids || [];
  const id = (selectEmbargo && selectEmbargo.element_id) || 0;
  return (
    <Modal show={showModal} onHide={onCloseFn} bsSize="large">
      <Modal.Header closeButton>
        <Modal.Title>
          <h4><Label>{la}</Label></h4>
          <ContributorInfo contributor={tag.contributors} affiliationMap={affiliationMap} />
          <h5>
            <b>Author{author_ids.length > 1 ? 's' : ''}: </b>
            <AuthorList creators={tag.creators} affiliationMap={affiliationMap} />
          </h5>
          <AffiliationList
            affiliations={tag.affiliations}
            affiliationMap={affiliationMap}
            rorMap={tag.rors}
          />
          <Doi type="collection" id={id} doi={doi} isPublished={isPublished} />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ height: '50vh', overflow: 'auto' }}>
        <div>
          {ElementDoi(tag.element_dois, isPublished)}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <ButtonToolbar>
          <Button bsStyle="warning" onClick={onCloseFn}> Close</Button>
        </ButtonToolbar>
      </Modal.Footer>
    </Modal>
  );
};

export { MetadataModal, InfoModal };
