/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import {
  Button,
  Card,
  Col,
  Collapse,
  Container,
  Form,
  OverlayTrigger,
  Row,
  Tooltip,
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import ContainerComponent from 'src/repo/chemrepo/reaction/ContainerComponent';
import { ExactFormula } from 'src/repo/others/Formula';
import ExactMass from 'src/repo/chemrepo/ExactMass';
import Quill2Viewer from 'src/repo/others/Quill2Viewer';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import { stopBubble } from 'src/utilities/DomHelper';
import RepoContainerDatasets from 'src/repo/repoHome/RepoContainerDatasets';
import { hNmrCheckMsg, cNmrCheckMsg } from 'src/utilities/ElementUtils';
import { contentToText } from 'src/utilities/quillFormat';
import { chmoConversions } from 'src/components/OlsComponent';
import { isDatasetPass, isNmrPass } from 'src/repo/repoHome/analysis-utils';
import { getAttachmentFromContainer, previewAttachmentImage } from 'src/utilities/imageHelper';
import RepoPreviewImage from 'src/repo/chemrepo/common/RepoPreviewImage';
import { Citation, RefByUserInfo } from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import RepoSegment from 'src/repo/repoHome/RepoSegment';
import MolViewerBtn from 'src/components/viewer/MolViewerBtn';
import LicenseIcon from 'src/repo/chemrepo/LicenseIcon';
import { getFormattedISODate } from 'src/repo/chemrepo/date-utils';
import { formatPhysicalProps } from 'src/repo/chemrepo/publication-utils';
import PublicLabels from 'src/repo/chemrepo/PublicLabels';
import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';
import VersionDropdown from 'src/repo/chemrepo/VersionDropdown';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import zoomSvg from 'src/repo/chemrepo/svg-utils';
import RdfBtn from 'src/repo/chemrepo/RdfBtn';
import { AffiliationMap } from 'src/repo/repoHome/RepoReviewCommon';
import FundingDisplay from 'src/repo/chemrepo/funding/FundingDisplay';
import RepoXvialButton from 'src/repo/chemrepo/common/RepoXvialButton';
import RepoPublicComment from 'src/repo/chemrepo/common/RepoPublicComment';
import RepoUserComment from 'src/repo/chemrepo/common/RepoUserComment';
import { hideInfo, MoleculeInfo, ElementIcon } from './molecule';
import { ClipboardCopyLink, ClipboardCopyBtn } from './clipboard';
import { DownloadMetadataBtn, DownloadZipBtn } from './downloads';
import { IconToMyDB } from './ui';
import { AuthorList, ContributorInfo, AffiliationList } from './people';

const nmrMsg = (sample, container) => {
  if (sample.molecule && container.extended_metadata &&
    (typeof container.extended_metadata?.kind === 'undefined' ||
      (container.extended_metadata?.kind?.split('|')[0].trim() !== chmoConversions.nmr_1h?.termId && container.extended_metadata.kind?.split('|')[0].trim() !== chmoConversions.nmr_13c?.termId)
    )) {
    return '';
  }
  const nmrStr = container.extended_metadata && contentToText(container.extended_metadata.content);

  if (container.extended_metadata.kind?.split('|')[0].trim() === chmoConversions.nmr_1h?.termId) {
    const msg = hNmrCheckMsg(sample.molecule.sum_formular, nmrStr);
    return msg === '' ? (<div style={{ display: 'inline', color: 'green' }}>&nbsp;<i className="fa fa-check" /></div>) : (<div style={{ display: 'inline', color: 'red' }}>&nbsp;(<sup>1</sup>H {msg})</div>);
  } else if (container.extended_metadata?.kind?.split('|')[0].trim() === chmoConversions.nmr_13c?.termId) {
    const msg = cNmrCheckMsg(sample.molecule.sum_formular, nmrStr);
    return msg === '' ? (<div style={{ display: 'inline', color: 'green' }}>&nbsp;<i className="fa fa-check" /></div>) : (<div style={{ display: 'inline', color: 'red' }}>&nbsp;(<sup>13</sup>C {msg})</div>);
  }
  return '';
};

const RenderAnalysisHeader = (props) => {
  const {
    element, isPublic, isLogin, isReviewer, updateRepoXvial, xvialCom, userInfo, reactionId, literatures, onVersionChange, zipUrl, chemotionZipUrl
  } = props;
  const svgPath = `/images/samples/${element.sample_svg_file}`;
  let doiLink = '';
  const molecule = element.molecule || {};
  if (isPublic) {
    doiLink = element.tag && element.tag.taggable_data && element.tag.taggable_data.publication && element.tag.taggable_data.publication.doi;
  } else {
    doiLink = (element.doi && element.doi.full_doi) || '';
  }
  const nameOrFormula = molecule.iupac_name && molecule.iupac_name !== ''
    ? <span><b>IUPAC Name: </b> {molecule.iupac_name} (<ExactFormula sample={element} molecule={molecule} />)</span>
    : <span><b>Formula: </b> <ExactFormula sample={element} molecule={molecule} /></span>;

  const iupacUserDefined = element.showed_name == (molecule.iupac_name)
    ? <span />
    : <h5><b>Name: </b> {element.showed_name} </h5>;

  const rinchiStyle = { borderStyle: 'none', boxShadow: 'none' };
  const crsId = (element.publication && element.publication.id) || '';
  const xvial = (element.tag && element.tag.taggable_data && element.tag.taggable_data.xvial && element.tag.taggable_data.xvial.num) || '';
  const references = literatures ? literatures.map(lit => (
    <li key={`product_${lit.id}`} style={{ display: 'flex' }}>
      <RefByUserInfo info={lit.ref_added_by} litype={lit.litype} />&nbsp;
      <Citation key={lit.id} literature={lit} />
    </li>
  )) : [];
  const { meltingPoint, boilingPoint, showPhysicalProps } = formatPhysicalProps(element);
  return (
    <div>
      <br />
      <Row style={rinchiStyle}>
        <Col sm={6} md={6} lg={6}>
          {zoomSvg(svgPath, <MolViewerBtn isPublic fileContent={element.molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n'} disabled={false} viewType={`mol_el_${element.id}`} />)}
        </Col>
        <Col sm={6} md={6} lg={6}>
          <span className="repo-pub-sample-header">
            <span className="repo-pub-title"><IconToMyDB isLogin={isLogin} id={element.id} type="sample" /></span>&nbsp;
            <span className="repo-pub-title"><b>Product</b></span>&nbsp;
            <RepoXvialButton isEditable={isReviewer} isLogin={isLogin} allowRequest elementId={element.id} data={xvial} saveCallback={updateRepoXvial} xvialCom={xvialCom} />
            <RepoPublicComment isReviewer={isReviewer} id={element.id} type="Sample" title={`Product CRS-${crsId}, ${element.showed_name}`} userInfo={userInfo} pageType="reactions" pageId={reactionId} />&nbsp;
            <RepoUserComment isLogin={isLogin} id={element.id} type="Sample" title={`Product CRS-${crsId}, ${element.showed_name}`} pageType="reactions" pageId={reactionId} isPublished={isPublic} />
            <br /><br />
          </span>
          {
            element.versions && (
              <div style={{ marginBottom: 10 }}>
                <VersionDropdown
                  type="Sample"
                  element={element}
                  onChange={(version) => onVersionChange(element, version)}
                />
              </div>
            )
          }
          {PublicLabels(element.labels)}
          <div style={hideInfo(molecule)}>
            {nameOrFormula}
            {iupacUserDefined}
            <div><b>Canonical SMILES: </b> <ClipboardCopyLink text={molecule.cano_smiles} /></div>
            <div><b>InChI: </b> <ClipboardCopyLink text={molecule.inchistring} /></div>
            <div><b>InChIKey: </b> <ClipboardCopyLink text={molecule.inchikey} /></div>
            <div><b>Exact Mass: </b> {ExactMass(element, molecule)}</div>
          </div>
          <div className="d-flex align-items-center"><span className="fw-bold fs-6">Sample DOI:</span>
            {
              isPublic ?
              (
                <span className="sub-title" inline="true">
                  <Button variant="link" onClick={() => { window.location = `https://dx.doi.org/${doiLink}`; }}>
                    {doiLink}
                  </Button>
                  <ClipboardCopyBtn text={`https://dx.doi.org/${doiLink}`} />
                  <DownloadZipBtn zipUrl={zipUrl} chemotionZipUrl={chemotionZipUrl} publicationId={crsId} />
                  <DownloadMetadataBtn type="sample" id={element.id} />

                  <RdfBtn type="sample" id={element.id} info={{ pid: crsId, doi: doiLink }} />
                </span>
              )
              :
              (
                <span className="sub-title" inline="true">
                  {doiLink}&nbsp;<ClipboardCopyBtn text={`https://dx.doi.org/${doiLink}`} />
                </span>
              )
            }
          </div>
          <div className="d-flex align-items-center">
            <span className="fw-bold fs-6">Sample ID:</span>
            <Button key={`reaction-jumbtn-${element.id}`} variant="link" onClick={() => { window.location = `/pid/${crsId}`; }}>
              CRS-{crsId}
            </Button><ClipboardCopyBtn text={`https://www.chemotion-repository.net/pid/${crsId}`} />
          </div>
        </Col>
      </Row>
      <Row>
        <Col sm={12} md={12} lg={12}>
          <div className="mb-2">
            <b>Reference{references.length > 1 ? 's' : null} in the Literature: </b>
            <ul className="mb-0" style={{ listStyle: 'none' }}>{references}</ul>
          </div>
          {element.fundingReferences && element.fundingReferences.length > 0 && (
            <div>
              <b>Funding References:</b>
              <FundingDisplay elementId={element.id} elementType="Sample" />
            </div>
          )}
          <RepoSegment segments={element.segments} isPublic={isPublic} />
        </Col>
      </Row>
      {
        (!isPublic || showPhysicalProps) && (
          <Row>
            <Col sm={12} md={12} lg={12}>
              <div><b>Physical Properties:</b></div>
              <div>Melting point: {meltingPoint}</div>
              <div>Boiling point: {boilingPoint}</div>
            </Col>
          </Row>
        )
      }
      <br />
      <NMRiumDisplayer
        sample={new Sample(element)}
        handleSampleChanged={() => {}}
        handleSubmit={() => {}}
        readOnly
      />
      <ViewSpectra
        sample={new Sample(element)}
        handleSampleChanged={() => {}}
        handleSubmit={() => {}}
        isPublic
      />
    </div>
  );
};

class RenderPublishAnalyses extends Component {
  constructor(props) {
    super(props);
  }

  header() {
    const { analysis, element, isPublic } = this.props;
    const content = analysis.extended_metadata['content'];
    const attachment = getAttachmentFromContainer(analysis);

    const idyLogin = typeof element.isLogin === 'undefined' ? true : element.isLogin;

    const kind = (analysis.extended_metadata['kind'] || '').split('|').pop().trim();

    return (
      <div
        className="repo-analysis-header"
      >
        <RepoPreviewImage
          key={`preview-${analysis.id}`}
          element={element}
          analysis={analysis}
          isLogin={idyLogin}
          isPublic={isPublic}
          attachment={attachment}
          title={kind}
        />
        <div className="abstract">
          <div className="lower-text">
            <div className="sub-title" inline="true">
              <b>Analysis DOI: </b>
              <Button variant="link" onClick={() => { window.location = `https://dx.doi.org/${analysis.dataset_doi}`; }}>
                {analysis.dataset_doi}
              </Button>
              <ClipboardCopyBtn text={`https://dx.doi.org/${analysis.dataset_doi}`} />
              <DownloadMetadataBtn type="container" id={analysis.id} />
              <RdfBtn type="container" id={analysis.id} info={{ pid: analysis.pub_id, doi: analysis.dataset_doi }} />
            </div>
            {
              analysis.concept_doi && (
                <div className="sub-title" inline="true">
                  <b>Analysis concept DOI: </b>
                  <Button variant="link" onClick={() => { window.location = `https://dx.doi.org/${analysis.concept_doi}`; }}>
                    {analysis.concept_doi}
                  </Button>
                  <ClipboardCopyBtn text={`https://dx.doi.org/${analysis.concept_doi}`} />
                  <DownloadMetadataBtn type="container" id={analysis.id} concept={true} />
                </div>
              )
            }
            <div className="sub-title" inline="true">
              <b>Analysis ID: </b>
              <Button variant="link" onClick={() => { window.location = `/pid/${analysis.pub_id}`; }}>
                CRD-{ analysis.pub_id }
              </Button>
              <ClipboardCopyBtn text={`https://www.chemotion-repository.net/pid/${analysis.pub_id}`} />
            </div>
            <div className="desc small-p expand-p">
              <b>Content: </b> &nbsp;&nbsp;
              <ClipboardCopyLink text={contentToText(content)}>
              <Quill2Viewer value={content}  />
            </ClipboardCopyLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { analysis, expanded, elementType, publication } = this.props;
    const kind = (analysis.extended_metadata['kind'] || '').split('|').pop().trim();
    const affiliationMap = AffiliationMap(publication.affiliation_ids || [], publication.affiliations || {});
    return (
      <Card key={`analysis-${analysis.id}`}>
        <Card.Header style={{ border: 'unset' }}>
          <h4><i className="fa fa-area-chart" aria-hidden="true" style={{ fontSize: '1.5em' }} /><b> Published on </b> <i>{getFormattedISODate(publication.published_at)}</i>
            <LicenseIcon
              license={this.props.license}
              hasCoAuthors={(this.props.publication.author_ids.length > 1)}
            />
          </h4>
          <p>&nbsp;</p>
          <b>{kind}</b>&nbsp;
          <div style={{ textAlign: 'right', display: 'inline-block', float: 'right' }}>
            <small><b>{ElementIcon(elementType)}</b></small>
          </div>
          <h5>
            <b>Author{this.props.publication.author_ids && (this.props.publication.author_ids.length > 1) ? 's' : ''}: </b>
            <AuthorList
              creators={this.props.publication.creators}
              affiliationMap={affiliationMap}
              contributor={this.props.publication.contributor}
              affiliations={this.props.publication.affiliations}
            />
          </h5>
          <ContributorInfo
            contributor={this.props.publication.contributor}
            affiliationMap={affiliationMap}
          />
          <AffiliationList
            affiliations={this.props.publication.affiliations}
            affiliationMap={affiliationMap}
            rorMap={this.props.publication.rors}
          />
        </Card.Header>
        <Collapse in={expanded}>
          <Card.Body style={{ backgroundColor: '#f5f5f5' }}>
            {this.header()}
            <Col md={12}>
              <b>Datasets</b>
              <RepoContainerDatasets
                rootContainer={this.props.element.container}
                container={this.props.analysis}
                element={this.props.element}
                isPublic={this.props.isPublic}
              />
            </Col>
          </Card.Body>
        </Collapse>
      </Card>
    );
  }
}

RenderPublishAnalyses.propTypes = {
  analysis: PropTypes.object.isRequired,
  element: PropTypes.object,
  expanded: PropTypes.bool.isRequired,
  elementType: PropTypes.string.isRequired,
  license: PropTypes.string.isRequired,
  publication: PropTypes.shape({
    author_ids: PropTypes.arrayOf(PropTypes.number),
    creators: PropTypes.arrayOf(PropTypes.object),
    affiliation_ids: PropTypes.arrayOf(PropTypes.array),
    affiliations: PropTypes.object,
    published_at: PropTypes.string,
  }).isRequired,
  isPublic: PropTypes.bool.isRequired
};

class PublishAnalysesTag extends Component {
  constructor(props) {
    super(props);
    const { reaction, analysis, analysesType, product } = props;
    this.state = {
      reaction,
      analysis,
      analysesType,
      product
    };
    this.handleCheck = this.handleCheck.bind(this);
  }

  handleCheck(e, elementType) {
    if (e.extended_metadata.publish && (e.extended_metadata.publish === true || e.extended_metadata.publish === 'true')) {
      e.extended_metadata.publish = false;
    } else {
      e.extended_metadata.publish = true;
    }
    this.props.handleAnalysesChecked(e, elementType);
  }

  generateTitle() {
    const {
      reaction, analysis, analysesType, product
    } = this.state;
    const kind = (analysis.extended_metadata.kind || '').split('|').pop().trim();
    const { content } = analysis.extended_metadata;
    const status = analysis.extended_metadata.status || '';
    const attachment = getAttachmentFromContainer(analysis);
    const previewImg = attachment ? previewAttachmentImage(attachment) : '/images/wild_card/no_attachment.svg';
    const typeMissing = !analysis.extended_metadata.kind || ((analysis.extended_metadata.kind || '').split('|').length < 2);

    let statusMissing = false;
    let nmrMissing = false;
    let datasetMissing = false;
    if (analysesType === 'Product') {
      statusMissing = (analysis.extended_metadata.status || '') !== 'Confirmed';
      nmrMissing = !isNmrPass(analysis, product);
      datasetMissing = !isDatasetPass(analysis);
    }
    const constructBtnTip = () => {
      const tip = [];
      if (typeMissing || statusMissing || nmrMissing || datasetMissing) {
        if (typeMissing) tip.push('Type is invalid.');
        if (statusMissing) tip.push('Status must be Confirmed.');
        if (nmrMissing) tip.push('Content is invalid, NMR Check fails.');
        if (datasetMissing) {
          tip.push('Dataset is incomplete. Please check that: ');
          tip.push('1. for NMR, Mass, or IR analyses, at least one dataset has been attached with an image and a jcamp files.');
          tip.push('2. the instrument field is not empty.');
        }
        return tip.join('\r\n');
      }
      return 'publish this analysis';
    };
    const btnTip = constructBtnTip();

    let statusChk = false;
    let statusMsg = '';
    let typeChk = false;
    if (analysesType === 'Product') {
      statusChk = (status !== 'Confirmed' || nmrMissing);
      statusMsg = nmrMsg(product, analysis);
      typeChk = (kind === '');
    }

    if (!analysis.extended_metadata.kind) {
      analysis.extended_metadata.publish = false;
    }
    const isPublish = (analysis.extended_metadata.publish && (analysis.extended_metadata.publish === true || analysis.extended_metadata.publish === 'true')
      && !statusMissing && !nmrMissing && !datasetMissing) || false;
    let analysesIcon = '';
    switch (analysesType) {
      case 'Reaction':
        analysesIcon = <i className="icon-reaction" />;
        break;
      case 'Product':
        analysesIcon = <i className="icon-sample" />;
        break;
      default:
        analysesIcon = '';
    }

    return (
      <div
        className="analysis-header order"
      >
        <div className="preview">
          <img src={previewImg} alt="preview" />
        </div>
        <div className="abstract">
          <div className="upper-btn">
            <span
              className="button-right add-to-report"
              onClick={stopBubble}
            >
              <OverlayTrigger
                placement="left"
                overlay={<Tooltip id="checkAnalysis" className="publish_tooltip">{btnTip}</Tooltip>}
              >
                <div>
                  <Form.Check
                    type="checkbox"
                    onChange={() => { this.handleCheck(analysis, analysesType); }}
                    disabled={typeMissing || statusMissing || nmrMissing || datasetMissing}
                    defaultChecked={isPublish}
                    label={
                      (typeMissing || statusMissing || nmrMissing || datasetMissing) ?
                        <span style={{ color: 'red' }}>Add to publication</span>
                      :
                        <span>Add to publication</span>
                    }
                  />
                </div>
              </OverlayTrigger>
            </span>
            <PrintCodeButton element={reaction} analyses={[analysis]} ident={analysis.id} />
            <div
              className="button-right"
            >
              &nbsp;{analysesIcon}
            </div>
          </div>
          <div className="lower-text">
            <div className="main-title">
              {analysis.name}
            </div>
            {
              typeChk ?
                <div className="sub-title" style={{ color: 'red' }}>Type: {kind}</div>
                :
                <div className="sub-title">Type: {kind}</div>
            }
            {
              statusChk ?
                <div className="sub-title"><span style={{ color: 'red' }}>Status:</span> {status} {statusMsg}</div>
                :
                <div className="sub-title"><span>Status:</span> {status} {statusMsg}</div>
            }
            <div className="desc sub-title expand-p">
              <span style={{ float: 'left', marginRight: '5px' }}>
                Content:
              </span>
              <Quill2Viewer value={content} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <Card key={`analysis-${this.props.analysis.id}`}>
        <Card.Header>
          {this.generateTitle()}
        </Card.Header>
        <Card.Body>
          <ContainerComponent readOnly container={this.props.analysis} />
        </Card.Body>
      </Card>
    );
  }
}

PublishAnalysesTag.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  analysis: PropTypes.object.isRequired,
  analysesType: PropTypes.string,
  handleAnalysesChecked: PropTypes.func.isRequired,
  product: PropTypes.object
};
PublishAnalysesTag.defaultProps = {
  analysesType: '',
  product: null
};

const DatasetDetail = ({ isPublished, element }) => {
  const { molecule } = element;
  molecule.tag = {
    taggable_data: { pubchem_cid: molecule.pubchem_cid }
  };

  const moleculeView = molecule.inchikey === null ? (<span />) : (<MoleculeInfo molecule={molecule} sample_svg_file={element.sample_svg_file} />);
  const elementView = element.element?.type === 'reaction' ? new Reaction(element.element) : new Sample(element.element);
  const datasetView = !element ? (
    <span>There is no published dataset</span>
  ) : (
    <RenderPublishAnalyses
      key={`${element.id}-${element.updated_at}`}
      analysis={element.dataset}
      element={elementView}
      expanded
      elementType="Sample"
      license={element.license}
      publication={element.publication}
      isPublic={isPublished}
    />
  );
  return (
    <Container>
      {moleculeView}
      <br /><br />
      <Row>
        <Col sm={12} md={12} lg={12}>
          {datasetView}
        </Col>
      </Row>
      <NMRiumDisplayer
        sample={elementView}
        handleSampleChanged={() => {}}
        handleSubmit={() => {}}
        readOnly
      />
      <ViewSpectra
        sample={elementView}
        handleSampleChanged={() => {}}
        handleSubmit={() => {}}
        isPublic
      />
    </Container>
  );
};

DatasetDetail.propTypes = {
  element: PropTypes.object.isRequired, isPublished: PropTypes.bool.isRequired
};

export {
  RenderAnalysisHeader,
  RenderPublishAnalyses,
  PublishAnalysesTag,
  DatasetDetail,
};
