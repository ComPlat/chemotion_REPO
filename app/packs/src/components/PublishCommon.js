import React from 'react';
import { Button, ButtonGroup, Tooltip, OverlayTrigger } from 'react-bootstrap';
import PropTypes from 'prop-types';
import Aviator from 'aviator';
import { get } from 'lodash';
import Sample from './models/Sample';
import { sampleShowOrNew, reactionShow } from './routesUtils';
import Reaction from './models/Reaction';
import { isNmrPass, isDatasetPass } from './utils/ElementUtils';
import { getFormattedISODate } from './chemrepo/date-utils';
import { getElementType, getPublicationId } from './chemrepo/publication-utils';
import UnsealBtn from './chemrepo/UnsealButton';

const labelStyle = {
  display: 'inline-block',
  marginLeft: '5px',
  marginRight: '5px',
  borderColor: 'grey'
};

const handleClick = (e, id, clickType) => {
  e.preventDefault();
  e.stopPropagation();
  const uri = Aviator.getCurrentURI();
  const uriArray = uri.split(/\//);
  switch (clickType) {
    case 'Reaction':
      Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/reaction/${id}`, { silent: true });
      reactionShow({ params: { reactionID: id } });
      break;

    default:
      Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/sample/${id}`, { silent: true });
      sampleShowOrNew({ params: { sampleID: id } });
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
          // style={{ display: 'none' }}
          bsStyle="success"
          bsSize="xsmall"
          className="button-right"
          // NB: props disabled will prevent displaying the OverlayTrigger. workaround by mocking disabled style
          onClick={() => showModal(!isDisabled)}
          style={isDisabled ? { cursor: 'not-allowed', opacity: '0.65' } : {} }
        >
          <i className="fa fa-paper-plane" />
        </Button>
      </OverlayTrigger>
    ) : <span />
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
        bsStyle="success"
        bsSize="xsmall"
        className="button-right"
        // NB: disabled will prevent the OverlayTrigger. workaround by mocking disabled style
        onClick={() => showModal(!isPoly)}
        // disabled={isPoly}
        style={isPoly ? { cursor: 'not-allowed', opacity: '0.65' } : {}}
      >
        <i className="fa fa-paper-plane" />
      </Button>
    </OverlayTrigger>
  ) : <span />;
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

  const isEdit = element.type === 'reaction' ? element.changed : element.isEdited;
  const reviewBtn = (canPublish && !isEdit && !publishedId && tagData.publication) ? (
                    <OverlayTrigger
                      placement="bottom"
                      overlay={<Tooltip id="reviewPublish">Submit for Publication</Tooltip>}
                    >
                      <Button
                        bsStyle="danger"
                        bsSize="xsmall"
                        className="button-right"
                        // NB: disabled will prevent the OverlayTrigger. workaround by mocking disabled style
                        onClick={() => validation(element)}
                      >
                        <i className="fa fa-paper-plane" />
                      </Button>
                    </OverlayTrigger>
                    ) : (<span />);
  const commentBtn = ((canPublish && !publishedId && tagData.publication) || isDecline) ? (
                    <OverlayTrigger
                      placement="bottom"
                      overlay={<Tooltip id="reviewerComment">Reviewer&apos;s comment</Tooltip>}
                    >
                      <Button
                        bsSize="xsmall"
                        bsStyle="success"
                        target="_blank"
                        className="button-right"
                        onClick={showComment}
                      >
                        <i className="fa fa-comments" />
                      </Button>
                    </OverlayTrigger>
                    ) : (<span />)
  return (
    <span>
    {reviewBtn}
    {commentBtn}
    </span>
  )
};

const OrigElnTag = ({ element }) => {
  const tag = (element && element.tag) || {};
  const tagData = (tag && tag.taggable_data) || {};
  const elnInfo = (tagData && tagData.eln_info) || {};
  if (Object.keys(elnInfo).length === 0) return <div />;

  const tip = `go to original ELN: ${elnInfo.short_label}`;

  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="data public">{tip}</Tooltip>}
    >
      <Button
        bsSize="xsmall"
        style={labelStyle}
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
    <ButtonGroup bsSize="xsmall">
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="data public">This is a new version of an already published {tagType.toLowerCase()}.</Tooltip>}
      >
        <Button
          bsSize="xsmall"
          bsStyle="success"
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
  return publishedId ? (
    <ButtonGroup bsSize="xsmall">
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="data public">{tip}</Tooltip>}
      >
        <Button
          bsSize="xsmall"
          bsStyle={isPending ? 'warning' : 'danger'}
          onClick={(event) => handleClick(event, publishedId, tagType)}
        >
          <i className="fa fa-newspaper-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
      {fnUnseal ? <UnsealBtn element={element} fnUnseal={fnUnseal} /> : null}
    </ButtonGroup>
  ) : null;
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
  let btnStyle = 'default';
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
        <Button bsSize="xsmall" bsStyle={btnStyle} style={labelStyle} onClick={() => { window.open(openUrl, '_blank'); }}>
          <i className="fa fa-newspaper-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }
  return <span />;
};

LabelPublication.propTypes = {
  element: PropTypes.object,
};


const ChemotionTag = ({ tagData, firstOnly = false }) => {
  const chemotionTag = tagData.chemotion;
  if (!chemotionTag) { return null; }
  const { chemotion_first, last_published_at, doi } = chemotionTag;
  if (firstOnly && !chemotion_first) { return null; }
  const formattedTime = getFormattedISODate(chemotion_first || last_published_at);
  const tooltipText = chemotion_first ? `Published First Here on ${formattedTime}`
    : `Last published on ${formattedTime}`;
  const first = chemotion_first ? <span>1<sup>st</sup></span> : null;

  return (
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="printCode">{tooltipText}</Tooltip>}>
      <a
        style={labelStyle}
        target="_blank"
        href={`https://dx.doi.org/${doi}`}
      >
        <img alt="chemotion_first" src="/favicon.ico" className="pubchem-logo" />
        {first}
      </a>
    </OverlayTrigger>
  );
};

ChemotionTag.propTypes = {
  tagData: PropTypes.object,
};
ChemotionTag.defaultProps = {
  tagData: {},
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
  validateMolecule,
  validateYield,
};
