import React from 'react';
import { Button, ButtonGroup, Tooltip, OverlayTrigger } from 'react-bootstrap';
import PropTypes from 'prop-types';
import Aviator from 'aviator';
import { get } from 'lodash';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import { isNmrPass, isDatasetPass } from 'src/repo/repoHome/analysis-utils';
import { getFormattedISODate } from 'src/repo/chemrepo/date-utils';
import { getElementType, getPublicationId } from 'src/repo/chemrepo/publication-utils';
import UnsealBtn from 'src/repo/chemrepo/UnsealButton';

const handleClick = (e, id, clickType) => {
  e.preventDefault();
  e.stopPropagation();
  if (typeof id === 'undefined' || id === null) return;

  const uri = Aviator.getCurrentURI();
  const uriArray = uri.split(/\//);
  switch (clickType) {
    case 'Reaction':
      Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/reaction/${id}`, { silent: false });
      break;

    default:
      Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/sample/${id}`, { silent: false });
      break;
  }
};
const validateYield = (reaction) => {
  const result = [];
  const products = reaction.products || [];
  products.forEach((product) => {
    const val = ((product.equivalent || 0) * 100).toFixed(0);
    if (val === '0') result.push({ name: 'product-yield', value: false, message: `[Product] ${product.molecule_iupac_name}: yield is 0` });
  });
  if (result.length !== 0 && result.length === products.length) return result;
  return [];
};

const validateMolecule = (element) => {
  const validates = [];
  const sample = element;
  const analyses = sample.analysisArray();
  analyses.forEach((al) => {
    const status = al.extended_metadata.status || '';
    const kind = al.extended_metadata.kind || '';
    if (status !== 'Confirmed') {
      validates.push({ name: `analysis [${al.name}]`, value: false, message: `[${sample.name || sample.short_label}] Analysis [${al.name}]: Status must be Confirmed.` });
    }
    if (kind === '' || (kind.split('|').length < 2)) {
      validates.push({ name: `analysis [${al.name}]`, value: false, message: `[${sample.name || sample.short_label}] Analysis [${al.name}]: Type is invalid.` });
    }
    if (!isNmrPass(al, sample)) {
      validates.push({ name: `analysis [${al.name}]`, value: false, message: `[${sample.name || sample.short_label}] Analysis [${al.name}]: Content is invalid, NMR check fails.` });
    }
    if (!isDatasetPass(al)) {
      validates.push({ name: `analysis [${al.name}]`, value: false, message: `[${sample.name || sample.short_label}] Analysis [${al.name}]: Dataset is incomplete. Please check that: 1. for NMR, Mass, or IR analyses, at least one dataset has been attached with an image and a jcamp files. 2. the instrument field is not empty.` });
    }
  });
  return validates;
};

const PublishBtnReaction = ({ reaction, showModal }) => {
  const tagData = (reaction.tag && reaction.tag.taggable_data) || {};
  // NB set publishedId to true to hide it
  const publishedId = tagData.public_reaction || (tagData.publication && tagData.publication.queued_at);
  const notPublishable = reaction.notPublishable; // false or [samples]
  const isDisabled = reaction.changed || reaction.isNew || !!notPublishable;
  const btnTip = (reaction.changed || reaction.isNew) ? 'Publication panel cannot be open on unsaved reaction.' : 'Open the reaction publication panel';
  const btnTipNotPub = notPublishable && `Product(s) ${notPublishable.map(s => s.short_label).join()} not publishable`;
  return (
    (!publishedId && !tagData.publication) ? (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="publishReaction">{btnTipNotPub || btnTip}</Tooltip>}
      >
        <Button
          size="sm"
          variant="success"
          className="button-right btn-create"
          // NB: props disabled will prevent displaying the OverlayTrigger. workaround by mocking disabled style
          onClick={() => showModal(!isDisabled)}
          style={isDisabled ? { cursor: 'not-allowed', opacity: '0.65' } : {} }
        >
          <i className="fa fa-paper-plane me-1" />
          Submit
        </Button>
      </OverlayTrigger>
    ) : null
  );
};

PublishBtnReaction.propTypes = {
  showModal: PropTypes.func.isRequired,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
};

const PublishBtn = ({ sample, showModal }) => {
  const tagData = (sample.tag && sample.tag.taggable_data) || {};

  const publishedId = tagData.public_sample;
  const isPoly = sample._contains_residues;

  return (sample.can_publish && !sample.isEdited && !publishedId && !tagData.publication) ? (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="publishSample">{isPoly ? 'Cannot publish polymer structure!' : 'Open the sample publication panel'}</Tooltip>}
    >
      <Button
        size="sm"
        variant="success"
        className="button-right btn-create"
        // NB: disabled will prevent the OverlayTrigger. workaround by mocking disabled style
        onClick={() => showModal(!isPoly)}
        style={isPoly ? { cursor: 'not-allowed', opacity: '0.65' } : {}}
      >
        <i className="fa fa-paper-plane me-1" />
        Submit
      </Button>
    </OverlayTrigger>
  ) : null;
};

PublishBtn.propTypes = {
  showModal: PropTypes.func.isRequired,
  sample: PropTypes.instanceOf(Sample).isRequired,
};

const ReviewPublishBtn = ({ element, showComment, validation }) => {
  const tagData = (element.tag && element.tag.taggable_data) || {};
  const publishedId = tagData.public_sample || tagData.public_reaction;
  const isDecline = (tagData && tagData.decline === true) || false;
  const canPublish =  element.can_publish || (element.type === 'reaction' && !element.notPublishable && element.is_published === false)
  const isReviewed = element.publication && element.publication.state == 'reviewed'

  const isEdit = element.type === 'reaction' ? element.changed : element.isEdited;

  const reviewBtn = (canPublish && !isEdit && !publishedId && tagData.publication && isReviewed) ? (
                    <OverlayTrigger
                      placement="bottom"
                      overlay={<Tooltip id="reviewPublish">Submit for Publication</Tooltip>}
                    >
                      <Button
                        variant="danger"
                        size="sm"
                        className="button-right"
                        // NB: disabled will prevent the OverlayTrigger. workaround by mocking disabled style
                        onClick={() => validation(element)}
                      >
                        <i className="fa fa-paper-plane" />
                      </Button>
                    </OverlayTrigger>
                    ) : null;
  const commentBtn = ((canPublish && !publishedId && tagData.publication) || isDecline) ? (
                    <OverlayTrigger
                      placement="bottom"
                      overlay={<Tooltip id="reviewerComment">Reviewer&apos;s comment</Tooltip>}
                    >
                      <Button
                        size="sm"
                        variant="success"
                        className="button-right"
                        onClick={showComment}
                      >
                        <i className="fa fa-comments" />
                      </Button>
                    </OverlayTrigger>
                    ) : null;
  if (!reviewBtn && !commentBtn) return null;
  return (
    <span className="d-flex gap-2">
      {reviewBtn}
      {commentBtn}
    </span>
  )
};

const OrigElnTag = ({ element }) => {
  const tag = (element && element.tag) || {};
  const tagData = (tag && tag.taggable_data) || {};
  const elnInfo = (tagData && tagData.eln_info) || {};
  if (Object.keys(elnInfo).length === 0) return null;

  const tip = `go to original ELN: ${elnInfo.short_label}`;

  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="data public">{tip}</Tooltip>}
    >
      <Button
        size="sm"
        href={`${elnInfo.origin}mydb/collection/all/${element.type}/${elnInfo.id}`}
        target="_blank"
      >
        <i className="fa fa-link" aria-hidden="true" />
      </Button>
    </OverlayTrigger>
  );
};

const NewVersionTag = ({ element }) => {
  const tagType = getElementType(element) || '';
  const previousVersionId = get(element, 'tag.taggable_data.previous_version.id')

  return (previousVersionId !== undefined) && (
    <ButtonGroup size="sm">
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="data public">This is a new version of an already published {tagType.toLowerCase()}.</Tooltip>}
      >
        <Button
          size="sm"
          variant="success"
          onClick={(event) => handleClick(event, previousVersionId, tagType)}
        >
          <i className="fa fa-newspaper-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    </ButtonGroup>
  )
}

NewVersionTag.propTypes = {
  element: PropTypes.object
};

const PublishedTag = ({ element, fnUnseal }) => {
  const tag = (element && element.tag) || {};
  const tagData = (tag && tag.taggable_data) || {};
  const tagType = getElementType(element) || '';
  const isPending =
    (tagData && tagData.publish_pending && tagData.publish_pending === true) ||
    false;
  const tip = isPending
    ? `${tagType} is being reviewed`
    : `${tagType} has been published`;
  const publishedId = getPublicationId(element);

  const pubIdIcon =
    isPending || publishedId ? (
      <ButtonGroup>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="data public">{tip}</Tooltip>}
        >
          <Button
            size="xxsm"
            variant={isPending ? 'warning' : 'success'}
            onClick={event => handleClick(event, publishedId, tagType)}
          >
            <i className="fa fa-newspaper-o" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        {fnUnseal ? <UnsealBtn element={element} fnUnseal={fnUnseal} /> : null}
      </ButtonGroup>
    ) : null;

  return pubIdIcon;
};

PublishedTag.propTypes = {
  element: PropTypes.object,
  fnUnseal: PropTypes.func,
};

const LabelPublication = ({ element }) => {
  const publication = element.tag && element.tag.taggable_data &&
    element.tag.taggable_data.publication;

  if (!publication) { return null; }

  const contributor = publication.contributors && publication.contributors.name;
  const publishedBy = publication.creators && publication.creators[0] &&
    publication.creators[0].name;
  let tooltipText = `Published by ${contributor == null ? publishedBy : contributor} on ${getFormattedISODate(publication.published_at || publication.doi_reg_at)}`;
  const schemeOnly = (element && element.publication && element.publication.taggable_data &&
    element.publication.taggable_data.scheme_only === true) || false;
  let openUrl = (element.type === 'reaction' && schemeOnly === true) ? `/home/publications/reactions/${element.id}` : `https://dx.doi.org/${publication.doi}`;
  let btnStyle = 'light';
  if (!publication.published_at && element.publication) {
    const pub = element.publication;
    let pubCreatedAt = new Date(pub.created_at);
    pubCreatedAt = `${pubCreatedAt.getDate()}-${pubCreatedAt.getMonth() + 1}-${pubCreatedAt.getFullYear()} `;
    tooltipText = `Submitted by ${contributor == null ? publishedBy : contributor} on ${pubCreatedAt}`;
    openUrl = `/pid/${element.publication.id}`;
    btnStyle = 'success';
  }
  if (publication.published_at || element.publication) {
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="printCode">{tooltipText}</Tooltip>}
        onClick={e => e.stopPropagation()}
      >
        <Button size="sm" variant={btnStyle} onClick={() => { window.open(openUrl, '_blank'); }}>
          <i className="fa fa-newspaper-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }
  return null;
};

LabelPublication.propTypes = {
  element: PropTypes.object,
};

import ChemotionTag from 'src/repo/chemrepo/ChemotionTag';

const PublicationActions = ({ element, showModal, showComment, validation, fnUnseal }) => (
  <>
    <OrigElnTag element={element} />
    <PublishedTag element={element} fnUnseal={fnUnseal} />
    <LabelPublication element={element} />
    {element.type === 'reaction'
      ? <PublishBtnReaction reaction={element} showModal={showModal} />
      : <PublishBtn sample={element} showModal={showModal} />}
    <ReviewPublishBtn element={element} showComment={showComment} validation={validation} />
  </>
);

PublicationActions.propTypes = {
  element: PropTypes.object.isRequired,
  showModal: PropTypes.func.isRequired,
  showComment: PropTypes.func.isRequired,
  validation: PropTypes.func.isRequired,
  fnUnseal: PropTypes.func,
};

PublicationActions.defaultProps = {
  fnUnseal: null,
};

export {
  LabelPublication,
  OrigElnTag,
  NewVersionTag,
  PublishedTag,
  ChemotionTag,
  PublishBtn,
  PublishBtnReaction,
  ReviewPublishBtn,
  PublicationActions,
  validateMolecule,
  validateYield,
};
