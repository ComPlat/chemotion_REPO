import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import { replace, startsWith, filter, flatMap, map } from 'lodash';
import {
  Button,
  Checkbox,
  Col,
  ControlLabel,
  Form,
  FormControl,
  FormGroup,
  Grid,
  InputGroup,
  Label,
  OverlayTrigger,
  Panel,
  Row,
  Table,
  Tooltip,
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import Clipboard from 'clipboard';
import moment from 'moment';
import Select from 'react-select';
import uuid from 'uuid';
import ContainerComponent from './ContainerComponent';
import Formula from '../components/common/Formula';
import PubchemLabels from '../components/PubchemLabels';
import QuillViewer from '../components/QuillViewer';
import { ChemotionTag } from '../components/PublishCommon';
import Sample from '../components/models/Sample';
import Reaction from '../components/models/Reaction';
import PrintCodeButton from '../components/common/PrintCodeButton';
import { stopBubble } from '../components/utils/DomHelper';
import RepoContainerDatasets from './RepoContainerDatasets';
import ImageModal from '../components/common/ImageModal';
import Utils from '../components/utils/Functions';
import { hNmrCheckMsg, cNmrCheckMsg } from '../components/utils/ElementUtils';
import { contentToText } from '../components/utils/quillFormat';
import { chmoConversions } from '../components/OlsComponent';
import DropdownButtonSelection from '../components/common/DropdownButtonSelection';
import InputButtonField from '../components/common/InputButtonField';
import RepoReactionSchemeInfo from './RepoReactionSchemeInfo';
import PublicActions from '../components/actions/PublicActions';
import RepoCommentBtn from '../components/common/RepoCommentBtn';

const ChemotionId = props => (
  <h5>
    <b>ID: </b>
    <Button key={`reaction-jumbtn-${props.id}`} bsStyle="link" onClick={() => { window.location = `/pid/${props.id}`; }}>
      {props.type === 'reaction' ? 'CRR' : 'CSR'}-{props.id}
    </Button><ClipboardCopyBtn text={`https://www.chemotion-repository.net/pid/${props.id}`} />
  </h5>
);
ChemotionId.propTypes = {
  id: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['sample', 'reaction']).isRequired
};

const SchemeWord = () => <span className="reaction-scheme-word">(scheme)</span>;


const AuthorTitle = (authorIds) => {
  if (authorIds && authorIds.length > 1) {
    return 'Authors:';
  }
  if (authorIds && authorIds.length === 1) {
    return 'Author:';
  }
  return '';
}

const NewsroomTemplate = {
  title: '', content: {}, article: []
};

const RequiredLabel = (props) => {
  return (
    <OverlayTrigger
      placement={props.placement}
      overlay={<Tooltip id={uuid.v4()}>This field is required for publication</Tooltip >}
    >
      <i className="fa fa-exclamation-circle field_required" aria-hidden="true" />
    </OverlayTrigger >
  );
};

RequiredLabel.propTypes = {
  placement: PropTypes.oneOf(['top', 'right', 'bottom', 'left']).isRequired
};

const HomeFeature = (props) => {
  return (
    <div className="feature-block">
      <h3><div><i className={`${props.fa}`} aria-hidden="true" /></div>&nbsp;{props.title}</h3>
      <p>
        {props.intro}
      </p>
    </div>
  );
};

HomeFeature.propTypes = {
  fa: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  intro: PropTypes.string.isRequired
};

const LicenseLegalCode = (cp) => {
  let presentLicense = 'Creative Commons Attribution-ShareAlike 4.0 International License';
  let presentHref = 'https://creativecommons.org/licenses/by-sa/4.0/legalcode';
  switch (cp) {
    case 'CC BY-SA':
      presentLicense = 'Creative Commons Attribution-ShareAlike 4.0 International License';
      presentHref = 'https://creativecommons.org/licenses/by-sa/4.0/legalcode';
      break;
    case 'CC BY':
      presentLicense = 'Creative Commons Attribution 4.0 International License';
      presentHref = 'https://creativecommons.org/licenses/by/4.0/legalcode';
      break;
    case 'CC0':
      presentLicense = 'CC0 1.0 Universal';
      presentHref = 'https://creativecommons.org/publicdomain/zero/1.0/legalcode';
      break;
    default:
      break;
  }
  return <span><b>{presentLicense}</b>&nbsp;<a rel="noreferrer noopener" target="_blank" href={presentHref}>View Legal Code</a></span>;
};

const nmrMsg = (sample, container) => {
  if (sample.molecule && container.extended_metadata &&
    (typeof container.extended_metadata.kind === 'undefined' ||
      (container.extended_metadata.kind.split('|')[0].trim() !== chmoConversions.nmr_1h.termId && container.extended_metadata.kind.split('|')[0].trim() !== chmoConversions.nmr_13c.termId)
    )) {
    return '';
  }
  const nmrStr = container.extended_metadata && contentToText(container.extended_metadata.content);

  if (container.extended_metadata.kind.split('|')[0].trim() === chmoConversions.nmr_1h.termId) {
    const msg = hNmrCheckMsg(sample.molecule.sum_formular, nmrStr);
    return msg === '' ? (<div style={{ display: 'inline', color: 'green' }}>&nbsp;<i className="fa fa-check" /></div>) : (<div style={{ display: 'inline', color: 'red' }}>&nbsp;(<sup>1</sup>H {msg})</div>);
  } else if (container.extended_metadata.kind.split('|')[0].trim() === chmoConversions.nmr_13c.termId) {
    const msg = cNmrCheckMsg(sample.molecule.sum_formular, nmrStr);
    return msg === '' ? (<div style={{ display: 'inline', color: 'green' }}>&nbsp;<i className="fa fa-check" /></div>) : (<div style={{ display: 'inline', color: 'red' }}>&nbsp;(<sup>13</sup>C {msg})</div>);
  }
  return '';
};

// the requirements for file types as given
const isFileTypePass = (analysisType, attachments) => {
  const baseType = ['jpg', 'jpeg', 'png', 'tiff'];
  const nmrType = ['jcamp', 'dx', 'jdx'];
  let files = [];
  switch (analysisType) {
    case '1H NMR':
    case chmoConversions.nmr_1h.termId:
    case '13C NMR':
    case chmoConversions.nmr_13c.termId:
    case '15N NMR':
    case 'NMR':
    case 'IR':
    case chmoConversions.ir.termId:
      files = attachments.filter(f => baseType.includes(f.filename.split('.').pop().toLowerCase()) && !f.is_deleted);
      if (files.length < 1) return false;
      files = attachments.filter(f => nmrType.includes(f.filename.split('.').pop().toLowerCase()) && !f.is_deleted);
      if (files.length < 1) return false;
      break;
    case 'EA':
    case chmoConversions.ea.termId:
    case 'X-Ray':
    case 'Crystall-Structure':
    case chmoConversions.crystal_structure.termId:
      files = attachments.filter(f => baseType.includes(f.filename.split('.').pop().toLowerCase()) && !f.is_deleted);
      if (files.length < 1) return false;
      break;
    default:
      break;
  }
  return true;
};

// at least one dataset has to be attached
// in dataset: instrument has to be given
const isDatasetPass = (analysis) => {
  const dataset = analysis.children;
  const attachments = dataset.filter(d => d.attachments.length > 0 && !d.is_deleted);
  if (attachments.length < 1) return false;
  const instruments = dataset.filter(d => d.extended_metadata && (d.extended_metadata.instrument || '').trim() !== '' && !d.is_deleted);
  if (instruments.length < 1) return false;
  const analysisType = (analysis.extended_metadata.kind || '').split('|').shift().trim();
  const files = attachments.filter(d => isFileTypePass(analysisType, d.attachments));
  if (files.length < 1) return false;
  return true;
};

const isNmrPass = (analysis, sample) => {
  const nmrStr = analysis.extended_metadata && contentToText(analysis.extended_metadata.content);
  const nmrType = analysis.extended_metadata && (analysis.extended_metadata.kind || '').split('|').shift().trim();
  if (nmrType !== '1H NMR' && nmrType !== '13C NMR' && nmrType !== chmoConversions.nmr_1h.termId && nmrType !== chmoConversions.nmr_13c.termId) return true;
  if (nmrType === '1H NMR' || nmrType === chmoConversions.nmr_1h.termId) {
    return hNmrCheckMsg(sample.molecule.sum_formular, nmrStr) === '';
  } else if (nmrType === '13C NMR' || nmrType === chmoConversions.nmr_13c.termId) {
    return cNmrCheckMsg(sample.molecule.sum_formular, nmrStr) === '';
  }
  return true;
};

const DownloadMetadataBtn = (l) => {
  const contentUrl = `/api/v1/public/metadata/download?type=${l.type}&id=${l.id}`;
  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id={`tt_metadata__${uuid.v4()}`}>download published metadata</Tooltip>}
    >
      <Button
        bsSize="xsmall"
        onClick={() => Utils.downloadFile({
          contents: contentUrl
        })}
      >
        <i className="fa fa-file-code-o" />
      </Button>
    </OverlayTrigger>
  );
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

class EmbargoCom extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShow: false
    };
    this.handleEmbargoChange = this.handleEmbargoChange.bind(this);
  }

  handleEmbargoChange(e) {
    this.props.onEmbargoChange(e.value);
  }

  handleLicenseChange(e) {
    this.props.onLicenseChange(e.value);
  }

  handleCC0ConsentChange(e, type) {
    this.props.onCC0ConsentChange(e.target.checked, type);
  }

  render() {
    const defaultBundles = [
      { value: '-1', name: 'no', label: 'No embargo' },
      { value: '0', name: 'new', label: '--Create a new Embargo Bundle--' },
    ];
    const licenses = [
      { name: 'CC BY-SA', value: 'CC BY-SA', label: 'CC BY-SA' },
      { name: 'CC BY', value: 'CC BY', label: 'CC BY' },
      { name: 'CC0', value: 'CC0', label: 'CC0' }
    ];

    const bundles = defaultBundles.concat(this.props.opts);
    const description = [
      'Please use the embargo if you do not wish your data to be published as soon as they are  processed but want to release them yourself at a later stage.',
      'Please use one bundle for data that belongs to the same publication.',
      'If you create data for more than one publication, please take care that you assign the data to the right bundle.'
    ].join(' ');
    const { isShow } = this.state;
    const embargoDesc = isShow ? (
      <div style={{
        padding: '10px', backgroundColor: '#dfdfdf', borderRadius: '3px', width: '100%'
      }}
      >
        <b>Embargo Bundle</b>&#58;&nbsp;{description}
      </div>
    ) : (null);

    const cc0Consent1 = 'I hereby waive all copyright and related or neighboring rights together with all associated claims and causes of action with respect to this work to the extent possible under the law.';
    const cc0Consent2 = 'I have read and understand the terms and intended legal effect of CC0, and hereby voluntarily elect to apply it to this work.';
    const deed = (
      <div style={{
        padding: '10px', borderRadius: '3px', borderColor: 'darkred', borderStyle: 'solid', borderWidth: 'thin', width: '100%'
      }}
      >
        {LicenseLegalCode(this.props.selectedLicense)}
        {
        this.props.selectedLicense === 'CC0' ?
          (
            <div stye={{ width: '100%' }}>
              <Checkbox checked={this.props.cc0Deed.consent1} onChange={e => this.handleCC0ConsentChange(e, 'consent1')}>
                {cc0Consent1}
              </Checkbox>
              <Checkbox checked={this.props.cc0Deed.consent2} onChange={e => this.handleCC0ConsentChange(e, 'consent2')}>
                {cc0Consent2}
              </Checkbox>
            </div>
          )
          :
          (null)
      }
      </div>
    );

    return (
      <div>
        <Form horizontal style={{ display: 'flex' }}>
          <div style={{ width: '20%', textAlign: 'right' }}>
            <ControlLabel>Choose license&nbsp;</ControlLabel>
          </div>
          <div style={{ width: '20%' }}>
            <Select
              value={this.props.selectedLicense}
              onChange={e => this.handleLicenseChange(e)}
              options={licenses}
              className="select-assign-collection"
            />
          </div>
          <div style={{ width: '40%', textAlign: 'right' }}>
            <ControlLabel>Publish with Embargo Bundle</ControlLabel>&nbsp;
            <div role="button" style={{ display: 'inline' }} onClick={() => this.setState({ isShow: !isShow })}>
              <i className="fa fa-question-circle" aria-hidden="true" />
            </div>&nbsp;
          </div>
          <div style={{ width: '40%' }}>
            <Select
              value={this.props.selectedValue}
              onChange={e => this.handleEmbargoChange(e)}
              options={bundles}
              className="select-assign-collection"
            />
          </div>
        </Form>
        {embargoDesc}
        {deed}
      </div >
    );
  }
}

EmbargoCom.propTypes = {
  opts: PropTypes.array,
  selectedValue: PropTypes.string.isRequired,
  onEmbargoChange: PropTypes.func.isRequired,
  selectedLicense: PropTypes.string,
  onLicenseChange: PropTypes.func.isRequired,
  onCC0ConsentChange: PropTypes.func.isRequired,
  cc0Deed: PropTypes.shape({
    consent1: PropTypes.bool.isRequired,
    consent2: PropTypes.bool.isRequired
  })
};

EmbargoCom.defaultProps = {
  opts: [],
  selectedLicense: 'CC BY-SA',
  cc0Deed: { consent1: false, consent2: false }
};

const PublishTypeAs = (props) => {
  return (
    <div style={{ display: 'inline' }}>
      <OverlayTrigger placement="bottom" overlay={<Tooltip id="tip_publish_as">Choose the publication type as Full or Scheme-Only</Tooltip>}>
        <i className="fa fa-question-circle" aria-hidden="true" />
      </OverlayTrigger>&nbsp;
      <DropdownButtonSelection
        options={props.options}
        selected={props.selected}
        placeholder="Select publication type..."
        onSelect={e => props.onChange(e)}
      />
    </div>
  );
};

PublishTypeAs.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string),
  selected: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

PublishTypeAs.defaultProps = {
  options: [],
  selected: 'full',
};


const ElStateLabel = (state) => {
  let stateStyle;
  switch (state) {
    case 'reviewed':
      stateStyle = 'info';
      break;
    case 'pending':
      stateStyle = 'warning';
      break;
    case 'accepted':
      stateStyle = 'success';
      break;
    default:
      stateStyle = 'default';
  }
  return <Label bsStyle={stateStyle}>{state}</Label>;
};


const MoveEmbargoedBundle = (element, onMoveClick) => {
  return (
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="moveEmbargo">Move to another embargoed bundle</Tooltip>}>
      <Button bsSize="xsmall" onClick={() => onMoveClick(element)}><i className="fa fa-exchange" aria-hidden="true" /></Button>
    </OverlayTrigger>
  );
};

const ElSubmitTime = (submitAt) => {
  const time = new Date(submitAt);
  return `${time.getDate()}-${time.getMonth() + 1}-${time.getFullYear()} ${time.getHours()}:${time.getMinutes()} `;
};

const SvgPath = (svg, type) => {
  if (svg && svg !== '***') {
    if (type === 'Reaction') {
      return `/images/reactions/${svg}`;
    }
    return `/images/samples/${svg}`;
  }
  return 'images/wild_card/no_image_180.svg';
};

const ElAspect = (e, onClick, user = null, currentElement = null, onMoveClick) => {
  if (!e) {
    return '';
  }
  let listClass;
  if (e.type === 'Reaction') {
    listClass = (currentElement !== null && currentElement.reaction && currentElement.reaction.id === e.id) ? 'list_focus_on' : 'list_focus_off';
  } else {
    listClass = (currentElement !== null && currentElement.sample && currentElement.sample.id === e.id) ? 'list_focus_on' : 'list_focus_off';
  }
  const schemeOnly = (e && e.scheme_only === true) || false;
  return (
    <tr
      key={e.id}
      className={listClass}
      onClick={() => onClick(e.type.toLowerCase(), e.id)}
    >
      <td style={{ position: 'relative' }} >
        <span className="review_element_label">
          <IconToMyDB isLogin id={e.id} type={e.type.toLowerCase()} />{schemeOnly ? <SchemeWord /> : ''}&nbsp;{e.title}
        </span>
        &nbsp;By&nbsp;{e.published_by}&nbsp;at&nbsp;
        {ElSubmitTime(e.submit_at)}&nbsp;{user !== null && user.type === 'Anonymous' ? '' : ElStateLabel(e.state)}
        &nbsp;{user !== null && user.type === 'Anonymous' ? '' : MoveEmbargoedBundle(e, onMoveClick)}
        <div>
          <SVG src={SvgPath(e.svg, e.type)} className="molecule-mid" key={e.svg} />
        </div>
      </td>
    </tr>
  );
};

const SampleExactMW = (em) => {
  if (em) {
    return (<span>{em.toFixed(6)} g&sdot;mol<sup>-1</sup></span>);
  }
  return '';
};

const DateFormatYMDLong = (params) => {
  const dateTime = new Date(params);
  const options = {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
  };
  return dateTime.toLocaleDateString('en-GB', options);
};

const DateFormatDMYTime = (dt) => {
  if (dt == null || typeof dt === 'undefined') return '';
  try {
    const m = moment(dt, 'DD/MM/YYYY HH:mm:ss');
    if (m.isValid()) {
      return dt;
    }
    const dtJSON = new Date(dt).toJSON();
    const dtISO = new Date(Date.parse(dt)).toISOString();
    if (dtISO === dtJSON) {
      return moment.parseZone(new Date(Date.parse(dt))).utc().format('DD/MM/YYYY HH:mm:ss').toString();
    }
    return '';
  } catch (e) {
    return '';
  }
};

const EditorTips = () => {
  return (
    <ol>
      {/* <li>Use <b>Preview</b> to see how your work will look like.</li> */}
      <li>Use&nbsp;&nbsp;<i className="fa fa-file-text-o" aria-hidden="true" />&nbsp;&nbsp;to open a text editor and add into the content.</li>
      <li>Use&nbsp;&nbsp;<i className="fa fa-picture-o" aria-hidden="true" />&nbsp;&nbsp;to open a image editor and add into the content.</li>
      <li>Use&nbsp;&nbsp;<i className="fa fa-arrows" aria-hidden="true" />&nbsp;&nbsp;to change the section order.</li>
      <li>Use&nbsp;&nbsp;<i className="fa fa-trash-o" aria-hidden="true" />&nbsp;&nbsp;to remove the section from the content.</li>
      <li>In text editor, use&nbsp;&nbsp;<i className="fa fa-link" aria-hidden="true" />&nbsp;&nbsp;to link to the url.</li>
    </ol>
  );
};

const BackSoonPage = () => {
  return (
    <div>
      <h1>We&rsquo;ll be back soon!</h1>
      <h3><i className="fa fa-cog fa-spin fa-5x" /></h3>
      <h3>
        Sorry for the inconvenience but we&rsquo;re performing some maintenance at the moment.
      </h3>
      <h3>
        If you need to you can always <a href="mailto:chemotion@ioc.kit.edu">contact us</a>, otherwise we&rsquo;ll be back online shortly!
      </h3>
      <h4>&mdash; ComPlat Team</h4>
    </div>
  );
};

const ShowIndicator = (show) => {
  return show ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
};

const labelStyle = {
  display: 'inline-block',
  marginLeft: '2px',
  marginRight: '2px'
};

const IconLicense = (cp, hasCoAuthors = false) => {
  const presentStyle = { marginTop: '-10px', height: '31px', width: '88px' };
  let presentHref = 'http://creativecommons.org/licenses/by-sa/4.0/';
  let presentAlt = 'This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.';
  let presentPath = '/images/creative_common/cc-by-sa.svg';
  const cc0Alt = [
    'To the extent possible under law, the',
    (hasCoAuthors ? 'persons' : 'person'),
    'who associated CC0 with this work',
    (hasCoAuthors ? 'have' : 'has'),
    'waived all copyright and related or neighboring rights to this work.'
  ].join(' ');

  switch (cp) {
    case 'CC BY-SA':
      presentHref = 'http://creativecommons.org/licenses/by-sa/4.0/';
      presentAlt = 'This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.';
      presentPath = '/images/creative_common/cc-by-sa.svg';
      break;
    case 'CC BY':
      presentHref = 'http://creativecommons.org/licenses/by/4.0/';
      presentAlt = 'This work is licensed under a Creative Commons Attribution 4.0 International License.';
      presentPath = '/images/creative_common/cc-by.svg';
      break;
    case 'CC0':
      presentHref = 'http://creativecommons.org/publicdomain/zero/1.0/';
      presentAlt = cc0Alt;
      presentPath = '/images/creative_common/cc-zero.svg';
      break;
    default:
      break;
  }
  return <a rel="noreferrer noopener" target="_blank" href={presentHref}><img src={presentPath} style={presentStyle} alt={presentAlt} title={presentAlt} /></a>;
};

const IconToMyDB = ({
  id, type, tooltipTitle = 'Link to My DB', isLogin = false
}) => {
  if (isLogin) {
    return (
      <OverlayTrigger placement="bottom" overlay={<Tooltip id="printCode">{tooltipTitle}</Tooltip>}>
        <a
          style={labelStyle}
          target="_blank"
          rel="noreferrer noopener"
          href={`/mydb/collection/all/${type}/${id}`}
        >
          <i className={`icon-${type}`} style={{ fontSize: '1.6em' }} />
        </a>
      </OverlayTrigger>
    );
  }
  return (<span style={labelStyle}><i className={`icon-${type}`} style={{ fontSize: '1.6em' }} /></span>);
};

IconToMyDB.propTypes = {
  id: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  tooltipTitle: PropTypes.string,
  isLogin: PropTypes.bool,
}

IconToMyDB.defaultProps = {
  tooltipTitle: 'Link to My DB',
  isLogin: false
}

const SidToPubChem = ({ sid }) => {
  let labelStyle = {
    // display: 'inline-block',
    marginLeft: '2px',
    marginRight: '2px',
    //position: 'absolute',
    fontSize: 'xx-large'
  };
  if (!sid || isNaN(sid)) {
    labelStyle.WebkitFilter = "grayscale(100%)"
  }
  const handleOnClick = (e) => {
    if (sid && !isNaN(sid)){
      window.open("https://pubchem.ncbi.nlm.nih.gov/substance/" + sid, '_blank')
    }
    e.stopPropagation()
  }

  if (sid && !isNaN(sid)){
    return (
      <span style={labelStyle} onClick={handleOnClick}>
        <img src="/images/wild_card/pubchem_sid.svg" className="pubchem-logo" />
      </span>
    )
    }else {
      return <span />
  }
}

SidToPubChem.propTypes = {
  sid: PropTypes.string
}

const ElementIcon = (elementType) => {
  switch (elementType) {
    case 'Reaction':
      return <i className="icon-reaction" style={{ fontSize: '1.5em', verticalAlign: 'middle' }} />;
    case 'Sample':
      return <i className="icon-sample" style={{ fontSize: '1.5em', verticalAlign: 'middle' }} />;
    default:
      return <div />;
  }
};

const AnalysesTypeJoinLabel = (analyses, type) => {
  const regExp = /\(([^)]+)\)/;
  const analysesTypeJoin = analyses.map((analysis) => {
    let kind = (regExp.exec(analysis.extended_metadata['kind'] || '') || ['']).pop().trim();
    if (kind === '') {
      kind = (analysis.extended_metadata['kind'] || '').split('|').pop().trim();
    }
    return kind;
  }).join(', ');

  return analysesTypeJoin === '' ? analysesTypeJoin :
    (
      <div style={{ display: 'inline-block', whiteSpace: 'pre-line', textAlign: 'left', verticalAlign: 'middle' }}>
        <small><b>{ElementIcon(type)}</b></small>{' '}{analysesTypeJoin}
      </div>
    );
};

const PreviewImage = (container) => {
  const rawImg = container.preview_img;
  const noAttSvg = '/images/wild_card/no_attachment.svg';
  const noAvaSvg = '/images/wild_card/not_available.svg';
  switch (rawImg) {
    case null:
    case undefined:
      return noAttSvg;
    case 'not available':
      return noAvaSvg;
    default:
      return `data:image/png;base64,${rawImg}`;
  }
};

const CalcDuration = (reaction) => {
  let duration = null;

  if (reaction.duration && !!reaction.duration.match(/\d+/)) {
    return reaction.duration;
  }

  if (reaction.timestamp_start && reaction.timestamp_stop) {
    const start = moment(reaction.timestamp_start, 'DD-MM-YYYY HH:mm:ss');
    const stop = moment(reaction.timestamp_stop, 'DD-MM-YYYY HH:mm:ss');
    if (start < stop) {
      duration = moment.preciseDiff(start, stop);
    }
  }
  if (duration == null) {
    return '';
  }
  return duration;
};

const AuthorList = ({ creators, affiliationMap }) => {
  return (
    <span>
      {creators.map(
        (creator, i) => (
          <span key={`auth_${creator.id}_${uuid.v4()}`}>
            {i === 0 ? null : ' - '}{creator.name}
            <sup>
              {creator.affiliationIds && creator.affiliationIds.map(e => affiliationMap[e]).sort().join()}
            </sup>
          </span>
        )
      )}
    </span>
  );
};

AuthorList.propTypes = {
  creators: PropTypes.array,
  affiliationMap: PropTypes.object,
};

AuthorList.defaultProps = {
  creators: [],
  affiliationMap: {},
};

const ContributorInfo = ({ contributor }) => {
  if (!contributor.name) {
    return <div />;
  }
  return (
    <div>
      <h5>
        <b>Contributor: </b>{contributor.name}
      </h5>
      <div>
        {contributor.affiliations && contributor.affiliations.map(
          (e, i) => <p style={{ fontSize: 'small' }} key={uuid.v4()}>{i + 1}. {e}</p>
        )}
      </div>
    </div>
  );
};

ContributorInfo.propTypes = {
  contributor: PropTypes.object,
};

ContributorInfo.defaultProps = {
  contributor: {},
};

const AffiliationList = ({ affiliations, affiliationMap }) => {
  const names = [];
  Object.keys(affiliationMap).map((affiliationId) => {
    const ind = affiliationMap[affiliationId];
    names[ind] = affiliations[affiliationId];
    return null;
  });
  return (
    <div>
      {names.map(
        (e, i) => (i === 0 ? null : <p style={{ fontSize: 'small' }} key={'affil_'+i}>{i}. {e}</p>)
      )}
    </div>
  );
}
AffiliationList.propTypes = {
  affiliations: PropTypes.object,
  affiliationMap: PropTypes.object,
};

AffiliationList.defaultProps = {
  affiliations: {},
  affiliationIds: {},
};

class ClipboardCopyLink extends Component {
  constructor(props) {
    super(props)
    this.clipboard = new Clipboard('.clipboardBtn');
  }

  render() {
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="copy_clipboard">copy to clipboard</Tooltip>}
      >
        <div style={{ display: 'inline' }} role="button" data-clipboard-text={this.props.text || ' '} className="clipboardBtn" >{this.props.text}</div>
      </OverlayTrigger>
    );
  }
}

class ClipboardCopyBtn extends Component {
  constructor(props) {
    super(props)
    this.clipboard = new Clipboard('.clipboardBtn');
  }

  render() {
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="copy_clipboard">copy to clipboard</Tooltip>}
      >
        <Button className="clipboardBtn" data-clipboard-text={this.props.text || ' '} bsSize="xsmall" >
          <i className="fa fa-clipboard" />
        </Button>
      </OverlayTrigger>
    );
  }
}



const MoleculeInfo = ({ molecule, sample_svg_file='' }) => {
  let svgPath = `/images/molecules/${molecule.molecule_svg_file}`;
  if (sample_svg_file && sample_svg_file != '') {
    svgPath = `/images/samples/${sample_svg_file}`;
  }
  const tagData = molecule.tag && molecule.tag.taggable_data;
  const pubchemInfo = {
    pubchem_tag: { pubchem_cid: tagData && tagData.pubchem_cid }
  };
  const nameOrFormula = molecule.iupac_name && molecule.iupac_name !== ''
    ? <h4><b>IUPAC Name: </b> {molecule.iupac_name} (<Formula formula={molecule.sum_formular} />)</h4>
    : <h4><b>Formula: </b> <Formula formula={molecule.sum_formular} /></h4>;
  return (
    <Row>
      <Col sm={4} md={4} lg={4}>
        <SVG key={svgPath} src={svgPath} className="molecule-mid" />
      </Col>
      <Col sm={8} md={8} lg={8}>
        {nameOrFormula}
        <br />
        <h5><b>Canonical Smiles: </b> <ClipboardCopyLink text={molecule.cano_smiles} /></h5>
        <h5><b>Inchi: </b> <ClipboardCopyLink text={molecule.inchistring} /></h5>
        <h5><b>Inchikey: </b> <ClipboardCopyLink text={molecule.inchikey} /></h5>
        <h5><b>Exact Mass: </b> {SampleExactMW(molecule.exact_molecular_weight)}</h5>
        <br />
        <h5>
          <b>Crosslinks: </b>
          &nbsp;&nbsp;
          <PubchemLabels element={pubchemInfo} />
          <ChemotionTag tagData={tagData} />
        </h5>
      </Col>
    </Row>
  );
};

class RenderAnalysisHeader extends Component {
  constructor(props) {
    super();
  }

  render() {
    const svgPath = `/images/samples/${this.props.element.sample_svg_file}`;
    let doiLink = '';
    if (this.props.isPublic) {
      doiLink = this.props.element.tag && this.props.element.tag.taggable_data && this.props.element.tag.taggable_data.publication && this.props.element.tag.taggable_data.publication.doi;
    } else {
      doiLink = (this.props.element.doi && this.props.element.doi.full_doi) || '';
    }

    const nameOrFormula = this.props.element.molecule.iupac_name && this.props.element.molecule.iupac_name !== ''
      ? <span><b>IUPAC Name: </b> {this.props.element.molecule.iupac_name} (<Formula formula={this.props.element.molecule.sum_formular} />)</span>
      : <span><b>Formula: </b> <Formula formula={this.props.element.molecule.sum_formular} /></span>;

    const iupacUserDefined = this.props.element.showed_name == this.props.element.molecule.iupac_name
      ? <span />
      : <h5><b>Name: </b> {this.props.element.showed_name} </h5>;


    const rinchiStyle = { borderStyle: 'none', boxShadow: 'none' };
    const crsId = (this.props.element.publication && this.props.element.publication.id) || '';
    return (
      <div>
        <div>
          <br />
          <Row style={rinchiStyle}>
            <Col sm={6} md={6} lg={6}>
              <SVG key={svgPath} src={svgPath} className="reaction-details" />
            </Col>
            <Col sm={6} md={6} lg={6}>
              <h5>
                <IconToMyDB isLogin={this.props.isLogin} id={this.props.element.id} type="sample" />
              <b>Product </b><br /><br />
                  {nameOrFormula}
                  {iupacUserDefined}
              </h5>
              <h6><b>Canonical Smiles: </b> <ClipboardCopyLink text={this.props.element.molecule.cano_smiles} /></h6>
              <h6><b>Inchi: </b> <ClipboardCopyLink text={this.props.element.molecule.inchistring} /></h6>
              <h6><b>Inchikey: </b> <ClipboardCopyLink text={this.props.element.molecule.inchikey} /></h6>
              <h6><b>Exact Mass: </b> {SampleExactMW(this.props.element.molecule.exact_molecular_weight)}</h6>
              <h6><b>DOI: </b>
                {
                  this.props.isPublic ?
                  (
                    <span className="sub-title" inline="true">
                      <Button bsStyle="link" onClick={() => { window.location = `https://dx.doi.org/${doiLink}`; }}>
                        {doiLink}
                      </Button>
                      <ClipboardCopyBtn text={`https://dx.doi.org/${doiLink}`} />
                      <DownloadMetadataBtn type="sample" id={this.props.element.id} />
                    </span>
                  )
                  :
                  (
                    <span className="sub-title" inline="true">
                      {doiLink}&nbsp;<ClipboardCopyBtn text={`https://dx.doi.org/${doiLink}`} />
                    </span>
                  )
                }
              </h6>
              <h6>
                <b>ID: </b>
                <Button key={`reaction-jumbtn-${this.props.element.id}`} bsStyle="link" onClick={() => { window.location = `/pid/${crsId}`; }}>
                  CRS-{crsId}
                </Button><ClipboardCopyBtn text={`https://www.chemotion-repository.net/pid/${crsId}`} />
              </h6>

            </Col>
          </Row>
        </div>
      </div>
    );
  }
}

const ToggleIndicator = ({ onClick, name, indicatorStyle }) => (
  <span
    role="presentation"
    className="label label-default"
    style={{
      backgroundColor: '#777777',
      color: 'white',
      fontSize: 'smaller',
      fontWeight: 'bold',
      cursor: 'pointer'
    }}
    onClick={onClick}
  >
    {name} &nbsp;<i className={`glyphicon ${indicatorStyle}`} />
  </span>
);

ToggleIndicator.propTypes = {
  indicatorStyle: PropTypes.string,
  name: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

ToggleIndicator.defaultProps = {
  indicatorStyle: '',
  name: '',
};


const ReactionTable = ({
  reaction, toggle, show, bodyAttrs, isPublic = true
}) => {
  let schemes = [];
  let sumSolvents = 0.0;
  const showIndicator = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';

  const schemeOnly = (reaction && reaction.publication && reaction.publication.taggable_data &&
    reaction.publication.taggable_data.scheme_only === true) || false;

  if (isPublic) {
    schemes = reaction.schemes;
  } else {
    reaction.starting_materials.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'starting_materials';
      schemes.push(ns);
    });
    reaction.reactants.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'reactants';
      schemes.push(ns);
    });
    reaction.products.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'products';
      schemes.push(ns);
    });
    reaction.solvents.map((s) => {
      const ns = new Sample(s)
      sumSolvents += ns.amount_l;
      ns.mat_group = 'solvents';
      schemes.push(ns);
    });
  }

  const materialCalc = (target, multi, precision) => {
    return (target ? (target * multi).toFixed(precision) : ' - ')
  }

  const equivYield = (s, sumSolvents=1.0, isPublic = true) => {
    let val = 0;
    switch (s.mat_group) {
      case 'products':
        if (schemeOnly === true) {
          val = `${materialCalc(s.scheme_yield * 100, 1, 0).toString()}%`
        } else {
          val = `${materialCalc(s.equivalent * 100, 1, 0).toString()}%`
        }
        break;
      case 'solvents':
        if (isPublic) {
          val = `${materialCalc(s.equivalent * 100, 1, 0).toString()}%`
        } else {
          val = `${materialCalc((s.amount_l / sumSolvents) * 100, 1, 1).toString()}%`
        }
        break;
      default:
        val = materialCalc(s.equivalent, 1, 3)
    }
    return (
      val
    )
  }

  const rows = (samples) => {
    let currentType = '';

    return (
      typeof samples !== 'undefined'
        ? samples.map((sample, i) => {
          const matType = sample.mat_group && sample.mat_group[0].toUpperCase() + sample.mat_group.replace('_', ' ').slice(1);
          let label = isPublic ? sample.iupac_name : sample.molecule_iupac_name;
          if (sample.mat_group === 'solvents') label = sample.external_label;
          let title = null;
          if (currentType !== sample.mat_group) {
            currentType = sample.mat_group;
            title = (<tr><td colSpan="7"><b>{matType}</b></td></tr>);
          }
          return (
            <tbody key={i}>
              {title}
              <tr>
                <td style={{ width: '26%' }}>{label}</td>
                <td style={{ width: '12%' }}>{isPublic ? sample.sum_formular : sample.molecule.sum_formular}</td>
                <td style={{ width: '14%', textAlign: 'center' }}>{sample.mat_group === 'solvents' ? ' ' : isPublic ? sample.dmv: !sample.has_molarity && !sample.has_density ? '- / -' : sample.has_density ? + sample.density + ' / - ' : ' - / ' + sample.molarity_value + sample.molarity_unit}</td>
                <td style={{ width: '12%', textAlign: 'center' }}>{sample.mat_group === 'solvents' ? ' - ' : materialCalc(sample.amount_g, 1, 3)}</td>
                <td style={{ width: '12%', textAlign: 'center' }}>{materialCalc(sample.amount_l, 1000, 3)}</td>
                <td style={{ width: '12%', textAlign: 'center' }}>{sample.mat_group === 'solvents' ? ' - ' : materialCalc(sample.amount_mol, 1000, 3)}</td>
                <td style={{ width: '12%', textAlign: 'center' }}>{equivYield(sample, sumSolvents, isPublic)}</td>
              </tr>
            </tbody>
          );
        })
        : null
    )
  };

  const table = dataRows => (
    <Table responsive>
      <thead>
        <tr>
          <th>IUPAC</th>
          <th>Formula</th>
          <th style={{ textAlign: 'center' }}>Density/Molarity</th>
          <th style={{ textAlign: 'center' }}>Amount(g)</th>
          <th style={{ textAlign: 'center' }}>Volume(ml)</th>
          <th style={{ textAlign: 'center' }}>Amount(mmol)</th>
          <th style={{ textAlign: 'center' }}>Equiv/Yield</th>
        </tr>
      </thead>
      {dataRows}
    </Table>
  );

  return (
    <span>
      <ToggleIndicator onClick={toggle} name="Reaction Table" indicatorStyle={showIndicator} />
      <Panel style={{ border: 'none' }} id="collapsible-panel-scheme" expanded={show} defaultExpanded={show} onToggle={() => { }}>
        <Panel.Collapse>
          <Panel.Body {...bodyAttrs} >
            <div>
              {table(rows(schemes))}
            </div>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );
}

const ReactionRinChiKey = ({
  reaction, toggle, show, bodyAttrs
}) => {
  const showIndicatorRinchi = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
  return (
    <span>
      <ToggleIndicator onClick={toggle} name="RInChiKey Table" indicatorStyle={showIndicatorRinchi} />
      <Panel style={{ border: 'none' }} id="collapsible-panel-rinchis" expanded={show} defaultExpanded={show} onToggle={() => { }}>
        <Panel.Collapse>
          <Panel.Body {...bodyAttrs}>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>RInChI</b></Col>
              <Col sm={10} md={10} lg={10}><ClipboardCopyLink text={replace(reaction.rinchi_string, 'RInChI=', '')} /></Col>
            </Row>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>Long-RInChIKey</b></Col>
              <Col sm={10} md={10} lg={10}><ClipboardCopyLink text={replace(reaction.rinchi_long_key, 'Long-RInChIKey=', '')} /></Col>
            </Row>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>Short-RInChIKey</b></Col>
              <Col sm={10} md={10} lg={10}><ClipboardCopyLink text={replace(reaction.rinchi_short_key, 'Short-RInChIKey=', '')} /></Col>
            </Row>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>Web-RInChIKey</b></Col>
              <Col sm={10} md={10} lg={10}><ClipboardCopyLink text={replace(reaction.rinchi_web_key, 'Web-RInChIKey=', '')} /></Col>
            </Row>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );
}

const ReactionProperties = ({
  reaction, toggle, show, bodyAttrs
}) => {
  const showIndicatorProp = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
  return (
    <span>
      <ToggleIndicator onClick={toggle} name="Properties" indicatorStyle={showIndicatorProp} />
      <Panel style={{ border: 'none' }} id="collapsible-panel-properties" expanded={show} defaultExpanded={show} onToggle={() => { }}>
        <Panel.Collapse>
          <Panel.Body {...bodyAttrs}>
            <Row >
              <Col sm={4} md={4} lg={4}>
                <b>Status: </b>{reaction.status}
              </Col>
              <Col sm={4} md={4} lg={4}>
                <b>Temperature: </b>{reaction.temperature && reaction.temperature.userText !== '' ? `${reaction.temperature.userText} ${reaction.temperature.valueUnit}` : ''}
              </Col>
              <Col sm={4} md={4} lg={4}>
                <b>Duration: </b>{CalcDuration(reaction)}
              </Col>
            </Row>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );
}

const ReactionTlc = ({
  reaction, toggle, show, bodyAttrs
}) => {
  const showIndicatorTlc = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
  return (
    <span>
      <ToggleIndicator onClick={toggle} name="TLC-Control" indicatorStyle={showIndicatorTlc} />
      <Panel style={{ border: 'none' }} id="collapsible-panel-tlc" expanded={show} defaultExpanded={show} onToggle={() => { }}>
        <Panel.Collapse>
          <Panel.Body {...bodyAttrs}>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>Solvents (parts)</b></Col>
              <Col sm={10} md={10} lg={10}>{reaction.tlc_solvents || ''}</Col>
            </Row>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>Rf-Value</b></Col>
              <Col sm={10} md={10} lg={10}>{reaction.rf_value || ''}</Col>
            </Row>
            <Row style={{ paddingBottom: '8px' }}>
              <Col sm={2} md={2} lg={2}><b>TLC-Description</b></Col>
              <Col sm={10} md={10} lg={10}>
                <div style={{ whiteSpace: 'pre' }}>
                  {reaction.tlc_description || ''}
                </div>
              </Col>
            </Row>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );
}

const InputFieldYield = (props) => {
  return (
    <FormGroup>
      <InputGroup>
        <FormControl
          type="text"
          bsClass="bs-form--compact form-control"
          bsSize="small"
          value={props.value || 0}
          placeholder="Input Yield..."
          onChange={event => props.onInputChange(props.product, event)}
        />
        <InputGroup.Addon>%</InputGroup.Addon>
      </InputGroup>
    </FormGroup>
  );
};

const InputFieldDuration = props =>
  (
    <InputButtonField
      label="Duration"
      value={props.durationValue || ''}
      field="duration"
      btnValue={props.durationUnit || ''}
      btnField="durationUnit"
      onInputChange={props.onInputChange}
      onBtnClick={props.onUnitChange}
      btnTip="switch duration unit"
    />
  );

const InputFieldTemperture = props =>
  (
    <InputButtonField
      label="Temperature"
      value={props.temperatureDisplay || ''}
      field="temperature"
      btnValue={props.temperatureUnit || ''}
      btnField="temperatureUnit"
      onInputChange={props.onInputChange}
      onBtnClick={props.onUnitChange}
      btnTip="switch temperature unit"
    />
  );

const ReactionTableEdit = ({
  reaction, bodyAttrs, isPublic = true,
  onInputChange
}) => {
  let schemes = [];
  let sumSolvents = 0.0;

  if (isPublic) {
    schemes = reaction.schemes;
  } else {
    reaction.starting_materials.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'starting_materials';
      schemes.push(ns);
    });
    reaction.reactants.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'reactants';
      schemes.push(ns);
    });
    reaction.products.map((s) => {
      const ns = new Sample(s)
      ns.mat_group = 'products';
      schemes.push(ns);
    });
    reaction.solvents.map((s) => {
      const ns = new Sample(s)
      sumSolvents += ns.amount_l;
      ns.mat_group = 'solvents';
      schemes.push(ns);
    });
  }

  const materialCalc = (target, multi, precision) => (target ? (target * multi).toFixed(precision) : '0');
  const equivYield = (s, sumSolvents = 1.0, isPublic = true) => {
    let val = 0;
    switch (s.mat_group) {
      case 'products':
        val = materialCalc(s.equivalent * 100, 1, 0);
        break;
      default:
        return <div />;
    }
    return (
      <Form inline>
        <InputFieldYield
          value={val}
          product={s}
          onInputChange={onInputChange}
        />
      </Form>
    );
  };

  const rows = (samples) => {
    let currentType = '';

    return (
      typeof samples !== 'undefined'
        ? samples.map((sample, i) => {
          const matType = sample.mat_group && sample.mat_group[0].toUpperCase() + sample.mat_group.replace('_', ' ').slice(1);
          let label = isPublic ? sample.iupac_name : sample.molecule_iupac_name;
          if (sample.mat_group === 'solvents') label = sample.external_label;
          let title = null;
          if (currentType !== sample.mat_group) {
            currentType = sample.mat_group;
            title = (<tr><td colSpan="7"><b>{matType}</b></td></tr>);
          }
          return (
            <tbody key={i}>
              {title}
              <tr>
                <td style={{ width: '26%' }}>{label}</td>
                <td style={{ width: '12%' }}>{isPublic ? sample.sum_formular : sample.molecule.sum_formular}</td>
                <td style={{ width: '14%', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ width: '12%', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ width: '12%', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ width: '12%', textAlign: 'center' }}>&nbsp;</td>
                <td style={{ width: '12%', textAlign: 'center' }}>{equivYield(sample, sumSolvents, isPublic)}</td>
              </tr>
            </tbody>
          );
        })
        : null
    )
  };

  const table = dataRows => (
    <Table responsive>
      <thead>
        <tr>
          <th>IUPAC</th>
          <th>Formula</th>
          <th style={{ textAlign: 'center' }}>Density/Molarity</th>
          <th style={{ textAlign: 'center' }}>Amount(g)</th>
          <th style={{ textAlign: 'center' }}>Volume(ml)</th>
          <th style={{ textAlign: 'center' }}>Amount(mmol)</th>
          <th style={{ textAlign: 'center' }}>Equiv/Yield</th>
        </tr>
      </thead>
      {dataRows}
    </Table>
  );

  return (
    <span>
      <Label>Reaction Table</Label>
      <Panel style={{ border: 'none' }} id="collapsible-panel-scheme" defaultExpanded onToggle={() => { }}>
        <Panel.Collapse>
          <Panel.Body {...bodyAttrs} >
            <div>
              {table(rows(schemes))}
            </div>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );
};

const ReactionPropertiesEdit = ({
  reaction, bodyAttrs,
  onInputChange, onUnitChange
}) =>
  (
    <span>
      <Label>Properties</Label>
      <Panel style={{ border: 'none' }} id="collapsible-panel-properties" defaultExpanded onToggle={() => { }}>
        <Panel.Collapse>
          <Panel.Body {...bodyAttrs}>
            <Row >
              <Col sm={4} md={4} lg={4}>
                <b>Status</b><div>{reaction.status}</div>
              </Col>
              <Col sm={4} md={4} lg={4}>
                <InputFieldTemperture
                  temperatureDisplay={reaction.temperature_display}
                  temperatureUnit={reaction.temperature && reaction.temperature.valueUnit}
                  onInputChange={onInputChange}
                  onUnitChange={onUnitChange}
                />
              </Col>
              <Col sm={4} md={4} lg={4}>
                <InputFieldDuration
                  durationValue={(reaction.durationDisplay && reaction.durationDisplay.dispValue) || ''}
                  durationUnit={reaction.durationUnit}
                  onInputChange={onInputChange}
                  onUnitChange={onUnitChange}
                />
              </Col>
            </Row>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );

const ReactionSchemeOnlyInfo = ({
  reaction, isPublic = true, schemeDesc,
  onYieldChange, onPropertiesChange, onUnitChange
}) => {
  const svgPath = `/images/reactions/${reaction.reaction_svg_file}`;

  const bodyAttrs = {
    style: {
      fontSize: '90%',
      paddingBottom: 'unset'
    }
  };

  return (
    <Panel style={{ marginBottom: '4px' }}>
      <Panel.Body style={{ paddingBottom: '1px' }}>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <SVG key={svgPath} src={svgPath} className="reaction-details" />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionTableEdit
              reaction={reaction}
              bodyAttrs={bodyAttrs}
              isPublic={isPublic}
              onInputChange={onYieldChange}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <Checkbox
              checked={schemeDesc}
              onChange={() => { onPropertiesChange('schemeDesc'); }}
            >
              <span>add the description field?</span>
            </Checkbox>
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionPropertiesEdit
              reaction={reaction}
              bodyAttrs={bodyAttrs}
              onInputChange={onPropertiesChange}
              onUnitChange={onUnitChange}
            />
          </Col>
        </Row>
      </Panel.Body>
    </Panel>
  );
};

const ReactionInfo = ({ reaction, toggleScheme, showScheme, isPublic = true,
  toggleRinchi, showRinchi,
  toggleProp, showProp,
  toggleTlc, showTlc,
  schemeOnly = false, onToggle = () => {}
 }) => {
  const svgPath = `/images/reactions/${reaction.reaction_svg_file}`;
  const content = reaction.description;
  const additionInfo = reaction.observation;

  const contentlength = (content && content.ops && content.ops.length > 0 && content.ops[0].insert) ? content.ops[0].insert.trim().length : 0;
  const additionlength = (additionInfo && additionInfo.ops && additionInfo.ops.length > 0 && additionInfo.ops[0].insert) ? additionInfo.ops[0].insert.trim().length : 0;

  const descQV = contentlength > 0 ?
  (<span><b>Description:</b><QuillViewer value={content}  /></span>) : null;
  const addQV = additionlength > 0 ?
  (<span><b>Additional information for publication and purification details:</b> <QuillViewer value={additionInfo}  /></span>) : null;


  const bodyAttrs = {
    style: {
      fontSize: '90%',
      paddingBottom: 'unset'
    }
  };

  if (schemeOnly) {
    return (
      <RepoReactionSchemeInfo
        reaction={reaction}
        svgPath={svgPath}
        showScheme={showScheme}
        showRinchi={showRinchi}
        showProp={showProp}
        bodyAttrs={bodyAttrs}
        onToggle={onToggle}
      />
    );
  }

  return (
    <Panel style={{ marginBottom: '4px' }}>
      <Panel.Body style={{ paddingBottom: '1px' }}>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <SVG key={svgPath} src={svgPath} className="reaction-details" />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionTable
              reaction={reaction}
              toggle={toggleScheme}
              show={showScheme}
              isPublic={isPublic}
              bodyAttrs={bodyAttrs}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <div className="desc small-p">
              {descQV}
            </div>
            <div className="desc small-p">
              {addQV}
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionRinChiKey
              reaction={reaction}
              toggle={toggleRinchi}
              show={showRinchi}
              bodyAttrs={bodyAttrs}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionProperties
              reaction={reaction}
              toggle={toggleProp}
              show={showProp}
              bodyAttrs={bodyAttrs}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionTlc
              reaction={reaction}
              toggle={toggleTlc}
              show={showTlc}
              bodyAttrs={bodyAttrs}
            />
          </Col>
        </Row>
      </Panel.Body>
    </Panel>
  );
};

const AnalysisHeaderSample = ({ sample, sampleType }) => {
  const svgPath = `/images/samples/${sample.sample_svg_file}`;
  const doiLink = sample.pubchem_tag.chemotion ? sample.pubchem_tag.chemotion.doi : '';
  const rinchiStyle = { borderStyle: 'none', boxShadow: 'none', textAlign: 'left' };
  return (
    <div className="svg-container">
      <Row style={rinchiStyle}>
        <Col sm={4} md={4} lg={4}>
          <SVG key={svgPath} src={svgPath} className="sample-details" />
        </Col>
        <Col sm={8} md={8} lg={8}>
          <h5><i className="icon-sample" style={{ fontSize: '1.5em' }} /> <b>{sampleType} </b></h5>
          <b> DOI: </b>
          <Button bsStyle="link" onClick={() => { window.location = `https://dx.doi.org/${doiLink}`; }}>
            {doiLink}
          </Button>
          <ClipboardCopyBtn text={`https://dx.doi.org/${doiLink}`} />
          <DownloadMetadataBtn type="sample" id={sample.id} />
        </Col>
      </Row>
    </div>
  );
};
AnalysisHeaderSample.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  sampleType: PropTypes.string,
};

AnalysisHeaderSample.defaultProps = {
  sample: {},
  sampleType: '',
};

class RenderPublishAnalysesPanel extends Component {
  header() {
    const { analysis, isPublic } = this.props;
    const content = analysis.extended_metadata['content'];
    const previewImg = PreviewImage(analysis);
    const kind = (analysis.extended_metadata['kind'] || '').split('|').pop().trim();

    let hasPop = true;
    let fetchNeeded = false;
    let fetchId = 0;
    let fetchFilename = '';
    if (analysis.preview_img && analysis.preview_img !== undefined && analysis.preview_img !== 'not available') {
      const containerAttachments = filter(analysis.children, o => o.attachments.length > 0);
      const atts = flatMap(map(containerAttachments, 'attachments'));
      const imageThumb = filter(atts, o => o.thumb === true && startsWith(o.content_type, 'image/'));
      if (imageThumb && imageThumb.length > 0) {
        fetchNeeded = true;
        fetchId = imageThumb[0].id;
        fetchFilename = imageThumb[0].filename;
      }
    } else {
      hasPop = false;
    }

    const doiLink = (isPublic === false) ? (
      <div className="sub-title" inline="true">
        <b>DOI: </b>
        {analysis.dataset_doi}&nbsp;<ClipboardCopyBtn text={`https://dx.doi.org/${analysis.dataset_doi}`} />
      </div>
      ) : (
      <div className="sub-title" inline="true">
        <b>DOI: </b>
        <Button bsStyle="link" onClick={() => { window.location = `https://dx.doi.org/${analysis.dataset_doi}`; }}>
          {analysis.dataset_doi}
        </Button>
        <ClipboardCopyBtn text={`https://dx.doi.org/${analysis.dataset_doi}`} />
        <DownloadMetadataBtn type="container" id={analysis.id} />
      </div>
    )

    return (
      <div
        className="analysis-header"
        style={{ height: 'unset' }}
      >
        <div className="preview">
          <ImageModal
            hasPop={hasPop}
            preivewObject={{
              src: previewImg
            }}
            popObject={{
              title: kind,
              src: previewImg,
              fetchNeeded,
              fetchId,
              fetchFilename
            }}
          />
        </div>
        <div className="abstract">
          <div className="lower-text">
            <div className="sub-title">
              <b>{kind}</b>
            </div>
            {doiLink}
            <div className="sub-title" inline="true">
              <b>ID: </b>
              <Button bsStyle="link" onClick={() => { window.location = `/pid/${analysis.pub_id}`; }}>
              CRD-{ analysis.pub_id }
              </Button>
              <ClipboardCopyBtn text={`https://www.chemotion-repository.net/pid/${analysis.pub_id}`} />
            </div>
          </div>
          <div className="desc small-p expand-p" style={{ marginLeft: '10px' }}>
            <ClipboardCopyLink text={contentToText(content)}>
              <QuillViewer value={content} />
            </ClipboardCopyLink>
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {this.header()}
        <Col md={12}>
          <b>Datasets</b>
          <RepoContainerDatasets
            container={this.props.analysis}
          />
        </Col>
      </div>
    );
  }
}

class RenderPublishAnalyses extends Component {
  constructor(props) {
    super(props);
  }

  header() {
    const analysis = this.props.analysis;
    const content = analysis.extended_metadata['content'];
    const rawImg = analysis.preview_img;
    const noAttSvg = '/images/wild_card/no_attachment.svg';
    const noAvaSvg = '/images/wild_card/not_available.svg';
    let previewImg = rawImg;
    switch (rawImg) {
      case null:
      case undefined:
        previewImg = noAttSvg;
        break;
      case 'not available':
        previewImg = noAvaSvg;
        break;
      default:
        previewImg = `data:image/png;base64,${rawImg}`;
    }

    const kind = (analysis.extended_metadata['kind'] || '').split('|').pop().trim();

    let hasPop = true;
    let fetchNeeded = false;
    let fetchId = 0;
    let fetchFilename = '';
    if (analysis.preview_img && analysis.preview_img !== undefined && analysis.preview_img !== 'not available') {
      const containerAttachments = filter(analysis.children, o => o.attachments.length > 0);
      const atts = flatMap(map(containerAttachments, 'attachments'));
      const imageThumb = filter(atts, o => o.thumb === true && startsWith(o.content_type, 'image/'));
      if (imageThumb && imageThumb.length > 0) {
        fetchNeeded = true;
        fetchId = imageThumb[0].id;
        fetchFilename = imageThumb[0].filename;
      }
    } else {
      hasPop = false;
    }

    return (
      <div
        className="analysis-header"
      >
        <div className="preview">
          <ImageModal
            hasPop={hasPop}
            preivewObject={{
              src: previewImg
            }}
            popObject={{
              title: kind,
              src: previewImg,
              fetchNeeded,
              fetchId,
              fetchFilename
            }}
          />
        </div>
        <div className="abstract">
          <div className="lower-text">
            <div className="sub-title" inline="true">
              <b>DOI: </b>
              <Button bsStyle="link" onClick={() => { window.location = `https://dx.doi.org/${analysis.dataset_doi}`; }}>
                {analysis.dataset_doi}
              </Button>
              <ClipboardCopyBtn text={`https://dx.doi.org/${analysis.dataset_doi}`} />
              <DownloadMetadataBtn type="container" id={analysis.id} />
            </div>
            <div className="sub-title" inline="true">
              <b>ID: </b>
              <Button bsStyle="link" onClick={() => { window.location = `/pid/${analysis.pub_id}`; }}>
                CRD-{ analysis.pub_id }
              </Button>
              <ClipboardCopyBtn text={`https://www.chemotion-repository.net/pid/${analysis.pub_id}`} />
            </div>
            <div className="desc small-p">
              <b>Content: </b> &nbsp;&nbsp;
              <ClipboardCopyLink text={contentToText(content)}>
              <QuillViewer value={content}  />
            </ClipboardCopyLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { analysis, expanded, elementType } = this.props;
    const kind = (analysis.extended_metadata['kind'] || '').split('|').pop().trim();
    const AffiliationMap = (affiliationIds) => {
      const aId = [].concat.apply(...affiliationIds);
      const affiliationMap = {};
      let aCount = 0;
      aId.map((e) => {
        if (!affiliationMap[e]) {
          aCount += 1;
          affiliationMap[e] = aCount;
        }
      });
      return affiliationMap;
    };
    const affiliationMap = AffiliationMap(this.props.publication.affiliation_ids);
    const time = new Date(this.props.publication && this.props.publication.published_at);
    const formattedTime = `${time.getDate()}-${time.getMonth() + 1}-${time.getFullYear()} `;
    return (
      <Panel key={`analysis-${analysis.id}`} expanded={expanded} className="panel-analyses-public" onToggle={() => { }}>
        <Panel.Heading style={{ border: 'unset' }}>
          <h4><i className="fa fa-area-chart" aria-hidden="true" style={{ fontSize: '1.5em' }} /><b> Published on </b> <i>{formattedTime}</i>
            {IconLicense(this.props.license, (this.props.publication.author_ids.length > 1))}
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
            />
          </h5>
          <AffiliationList
            affiliations={this.props.publication.affiliations}
            affiliationMap={affiliationMap}
          />
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body style={{ backgroundColor: '#f5f5f5' }}>
            {this.header()}
            <Col md={12}>
              <b>Datasets</b>
              <RepoContainerDatasets
                container={this.props.analysis}
              />
            </Col>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}

RenderPublishAnalyses.propTypes = {
  analysis: PropTypes.object.isRequired,
  expanded: PropTypes.bool.isRequired,
  elementType: PropTypes.string.isRequired,
  license: PropTypes.string.isRequired,
  publication: PropTypes.shape({
    author_ids: PropTypes.arrayOf(PropTypes.number),
    creators: PropTypes.arrayOf(PropTypes.object),
    affiliation_ids: PropTypes.arrayOf(PropTypes.array),
    affiliations: PropTypes.object,
    published_at: PropTypes.string,
  }).isRequired
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
    const previewImg = PreviewImage(analysis);
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
            <div
              className="button-right"
            >
              &nbsp;{analysesIcon}
            </div>
            <PrintCodeButton element={reaction} analyses={[analysis]} ident={analysis.id} />
            <span
              className="button-right add-to-report"
              onClick={stopBubble}
            >
              <OverlayTrigger
                placement="left"
                overlay={<Tooltip id="checkAnalysis" className="publish_tooltip">{btnTip}</Tooltip>}
              >
                <div>
                  <Checkbox
                    onChange={() => { this.handleCheck(analysis, analysesType); }}
                    disabled={typeMissing || statusMissing || nmrMissing || datasetMissing}
                    defaultChecked={isPublish}
                  >
                    {
                      (typeMissing || statusMissing || nmrMissing || datasetMissing) ?
                        <span style={{ color: 'red' }}>Add to publication</span>
                      :
                        <span>Add to publication</span>
                    }
                  </Checkbox>
                </div>
              </OverlayTrigger>
            </span>
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
            <div className="desc sub-title">
              <span style={{ float: 'left', marginRight: '5px' }}>
                Content:
              </span>
              <QuillViewer value={content}  />
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <Panel key={`analysis-${this.props.analysis.id}`} eventKey={this.props.analysis.id}>
        <Panel.Heading>
          <Panel.Title toggle>
            {this.generateTitle()}
          </Panel.Title>
        </Panel.Heading>
        <Panel.Body collapsible>
          <ContainerComponent readOnly container={this.props.analysis} />
        </Panel.Body>
      </Panel>
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

RenderPublishAnalysesPanel.propTypes = {
  analysis: PropTypes.object.isRequired,
  isPublic: PropTypes.bool,
};

RenderPublishAnalysesPanel.defaultProps = {
  isPublic: true
};

ReactionTable.propTypes = {
  reaction: PropTypes.any.isRequired,
  toggle: PropTypes.func,
  show: PropTypes.bool,
  bodyAttrs: PropTypes.object,
  isPublic: PropTypes.bool.isRequired
};

ReactionTable.defaultProps = {
  isPublic: true,
  showScheme: false
};

ReactionRinChiKey.propTypes = {
  reaction: PropTypes.any.isRequired,
  toggle: PropTypes.func,
  show: PropTypes.bool,
  bodyAttrs: PropTypes.object
};

ReactionProperties.propTypes = {
  reaction: PropTypes.any.isRequired,
  toggle: PropTypes.func,
  show: PropTypes.bool,
  bodyAttrs: PropTypes.object
};

ReactionTlc.propTypes = {
  reaction: PropTypes.any.isRequired,
  toggle: PropTypes.func,
  show: PropTypes.bool,
  bodyAttrs: PropTypes.object
};

const DatasetDetail = ({ element }) => {
  const { molecule } = element;
  molecule.tag = {
    taggable_data: { pubchem_cid: molecule.pubchem_cid }
  };

  const datasetView = !element ? (
    <span>There is no published dataset</span>
  ) : (
    <RenderPublishAnalyses
      key={`${element.id}-${element.updated_at}`}
      analysis={element.dataset}
      expanded
      elementType="Sample"
      license={element.license}
      publication={element.publication}
    />
  );

  return (
    <Grid>
      <MoleculeInfo molecule={molecule} sample_svg_file={element.sample_svg_file} />
      <br /><br />
      <Row>
        <Col sm={12} md={12} lg={12}>
          {datasetView}
        </Col>
      </Row>
    </Grid>
  );
};

DatasetDetail.propTypes = {
  element: PropTypes.object.isRequired,
};

const ClosePanel = ({ element }) => (
  <div>
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="closeReaction">Close</Tooltip>}
    >
      <Button
        bsSize="xsmall"
        className="button-right"
        onClick={() => PublicActions.close(element, true)}
      >
        <i className="fa fa-times" />
      </Button>
    </OverlayTrigger>
  </div>
);

ClosePanel.propTypes = {
  element: PropTypes.object.isRequired,
};

const CommentBtn = (props) => {
  const {
    canComment,
    reviewLevel,
    submitter,
    pubState,
    comments,
    onShow,
    field,
    orgInfo
  } = props;

  if (!canComment) return '';
  return (
    <span>
      <RepoCommentBtn
        field={field}
        comments={comments}
        orgInfo={orgInfo}
        reviewLevel={reviewLevel}
        state={pubState}
        submitter={submitter}
        onShow={() => onShow(true, field, orgInfo)}
      />&nbsp;
    </span>
  );
};

CommentBtn.propTypes = {
  canComment: PropTypes.bool.isRequired,
  reviewLevel: PropTypes.number.isRequired,
  submitter: PropTypes.string.isRequired,
  pubState: PropTypes.string.isRequired,
  comments: PropTypes.object.isRequired,
  onShow: PropTypes.func.isRequired,
  field: PropTypes.string.isRequired,
  orgInfo: PropTypes.string.isRequired
};

const Doi = (props) => {
  const {
    type, id, doi, isPublished
  } = props;

  let data = '';

  if (isPublished) {
    data = (
      <span>
        <Button key={`${type}-jumbtn-${id}`} bsStyle="link" onClick={() => { window.location = `https://dx.doi.org/${doi}`; }}>
          {doi}
        </Button>
        <ClipboardCopyBtn text={`https://dx.doi.org/${doi}`} />
        <DownloadMetadataBtn type={type} id={id} />
      </span>
    );
  } else {
    data = (
      <span>
        {doi.full_doi}&nbsp;<ClipboardCopyBtn text={`https://dx.doi.org/${doi.full_doi}`} />
      </span>
    );
  }

  return (
    <h5>
      <b>DOI: </b>
      {data}
    </h5>
  );
};

Doi.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  doi: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]).isRequired,
  isPublished: PropTypes.bool.isRequired,
};

const DateInfo = (props) => {
  const {
    pubData, tagData, isPublished
  } = props;

  let time = '';
  let formattedTime = '';

  if (isPublished) {
    time = new Date(tagData && (tagData.published_at || tagData.doi_reg_at));
    formattedTime = `${time.getDate()}-${time.getMonth() + 1}-${time.getFullYear()} `;
    return (<span><b>Published on </b> <i>{formattedTime}</i></span>);
  }

  time = new Date(pubData && pubData.updated_at);
  formattedTime = `${time.getDate()}-${time.getMonth() + 1}-${time.getFullYear()} `;
  return (<span><b>Submitted on </b> <i>{formattedTime}</i></span>);
};

DateInfo.propTypes = {
  pubData: PropTypes.object.isRequired,
  tagData: PropTypes.object.isRequired,
  isPublished: PropTypes.bool.isRequired,
};

export {
  AnalysisHeaderSample,
  AnalysesTypeJoinLabel,
  AffiliationList,
  AuthorList,
  AuthorTitle,
  BackSoonPage,
  CalcDuration,
  ChemotionId,
  ClipboardCopyLink,
  ClipboardCopyBtn,
  ClosePanel,
  CommentBtn,
  ContributorInfo,
  DateFormatYMDLong,
  DateFormatDMYTime,
  DatasetDetail,
  DateInfo,
  Doi,
  DownloadDOICsv,
  DownloadMetadataBtn,
  EditorTips,
  ElementIcon,
  ElStateLabel,
  ElSubmitTime,
  ElAspect,
  EmbargoCom,
  IconLicense,
  IconToMyDB,
  isNmrPass,
  isDatasetPass,
  HomeFeature,
  MoleculeInfo,
  NewsroomTemplate,
  PreviewImage,
  PublishAnalysesTag,
  PublishTypeAs,
  ReactionSchemeOnlyInfo,
  ReactionInfo,
  ReactionTable,
  ReactionRinChiKey,
  ReactionProperties,
  ReactionTlc,
  RenderAnalysisHeader,
  RenderPublishAnalyses,
  RenderPublishAnalysesPanel,
  RequiredLabel,
  SchemeWord,
  SidToPubChem,
  ShowIndicator,
  SvgPath,
  ToggleIndicator,
};
