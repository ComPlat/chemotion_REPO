/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { QRCode } from 'antd';
import PropTypes from 'prop-types';
import moment from 'moment';
import { RepoCommentBtn } from 'repo-review-ui';
import PublicActions from 'src/repo/actions/PublicActions';
import RepoConst from 'src/repo/chemrepo/common/RepoConst';
import StateLabel from 'src/repo/chemrepo/common/StateLabel';
import SVGView from 'src/repo/chemrepo/SVGViewPan';
import { getFormattedISODateTime } from 'src/repo/chemrepo/date-utils';
import RdfBtn from 'src/repo/chemrepo/RdfBtn';
import { ClipboardCopyBtn } from './clipboard';
import { DownloadMetadataBtn, DownloadZipBtn } from './downloads';

const SchemeWord = () => <span className="reaction-scheme-word">(scheme)</span>;

const HomeFeature = props => (
  <div className="feature-block" style={props.extraStyle}>
    <h3><div><i className={`${props.fa}`} aria-hidden="true" /></div>&nbsp;{props.title}</h3>
    <p>
      {props.intro}
    </p>
    {props.extra}
  </div>
);

HomeFeature.propTypes = {
  fa: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  intro: PropTypes.string.isRequired
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

const EditorTips = () => (
  <ol>
    <li>Use&nbsp;&nbsp;<i className="fa fa-file-text-o" aria-hidden="true" />&nbsp;&nbsp;to open a text editor and add into the content.</li>
    <li>Use&nbsp;&nbsp;<i className="fa fa-picture-o" aria-hidden="true" />&nbsp;&nbsp;to open a image editor and add into the content.</li>
    <li>Use&nbsp;&nbsp;<i className="fa fa-arrows" aria-hidden="true" />&nbsp;&nbsp;to change the section order.</li>
    <li>Use&nbsp;&nbsp;<i className="fa fa-trash-o" aria-hidden="true" />&nbsp;&nbsp;to remove the section from the content.</li>
    <li>In text editor, use&nbsp;&nbsp;<i className="fa fa-link" aria-hidden="true" />&nbsp;&nbsp;to link to the url.</li>
  </ol>
);

const IconToMyDB = ({
  id, type, tooltipTitle = 'Link to My DB', isLogin = false, isCI = false, isPublished = true
}) => {

  const createLinkButton = (baseUrl, dt) => (
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="id_icon_tip">{tooltipTitle}</Tooltip>}>
      <Button
        className="animation-ring"
        variant="link"
        href={`${baseUrl}/${dt}/${type}/${id}`}
        target="_blank"
      >
        <i className={`icon-${type}`} />
      </Button>
    </OverlayTrigger>
  );

  if (isCI) {
    return createLinkButton('/mydb/collection', '103');
  }

  if (isLogin) {
    const dt = isPublished ? 'publication' : 'review';
    return createLinkButton('/mydb/scollection', dt);
  }

  return (<span className="wrap-ring"><i className={`icon-${type}`} /></span>);
};

IconToMyDB.propTypes = {
  id: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  tooltipTitle: PropTypes.string,
  isLogin: PropTypes.bool,
  isPublished: PropTypes.bool,
};

IconToMyDB.defaultProps = {
  tooltipTitle: 'Link to My DB',
  isLogin: false,
  isPublished: true,
};

const ChecklistPanel = ({
  checklist, isReviewer, review_info
}) => {
  const dglr = checklist?.glr?.status === true ? (<i className="fa fa-check-square-o" style={{ color: 'brown' }} />) : (<i className="fa fa-square-o" style={{ color: 'brown' }} />);
  const dtbl = checklist?.tbl?.status === true ? (<i className="fa fa-check-square-o" style={{ color: 'blue' }} />) : (<i className="fa fa-square-o" style={{ color: 'blue' }} />);
  const ddes = checklist?.des?.status === true ? (<i className="fa fa-check-square-o" style={{ color: 'orange' }} />) : (<i className="fa fa-square-o" style={{ color: 'orange' }} />);
  const dafm = checklist?.afm?.status === true ? (<i className="fa fa-check-square-o" style={{ color: 'green' }} />) : (<i className="fa fa-square-o" style={{ color: 'green' }} />);
  const dact = checklist?.act?.status === true ? (<i className="fa fa-check-square-o" style={{ color: 'purple' }} />) : (<i className="fa fa-square-o" style={{ color: 'purple' }} />);
  const dohd = checklist?.ohd?.status === true ? (<i className="fa fa-check-square-o" style={{ color: 'red' }} />) : (<i className="fa fa-square-o" style={{ color: 'red' }} />);


  if (isReviewer === true || review_info?.groupleader == true) {

    const leader_names = review_info?.leaders?.length > 0 ? review_info.leaders.map(u => u.name) : [];
    const leaders = leader_names.length > 0 ? `additional reviewer(s): ${leader_names.join(', ')}` : '';
    const isGL = review_info?.leaders?.length > 0 ? (<OverlayTrigger placement="bottom" overlay={<Tooltip id="id_icon_tip">group leader review</Tooltip>}>{dglr}</OverlayTrigger>) : '';
    return (
      <div>
        {isGL}&nbsp;
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="id_icon_tip">table values</Tooltip>}>{dtbl}</OverlayTrigger>&nbsp;
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="id_icon_tip">description</Tooltip>}>{ddes}</OverlayTrigger>&nbsp;
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="id_icon_tip">analysis format</Tooltip>}>{dafm}</OverlayTrigger>&nbsp;
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="id_icon_tip">analysis content</Tooltip>}>{dact}</OverlayTrigger>&nbsp;
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="id_icon_tip">on hold</Tooltip>}>{dohd}</OverlayTrigger>&nbsp;
        &nbsp;{leaders}
      </div>
    );
  }
  return (<div />);
};

ChecklistPanel.propTypes = {
  checklist: PropTypes.object,
  isReviewer: PropTypes.bool,
};

ChecklistPanel.defaultProps = {
  checklist: {},
  isReviewer: false
};

const MoveEmbargoedBundle = (element, onMoveClick) => {
  return (
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="moveEmbargo">Move to another embargoed bundle</Tooltip>}>
      <Button size="sm" onClick={() => onMoveClick(element)}><i className="fa fa-exchange" aria-hidden="true" /></Button>
    </OverlayTrigger>
  );
};

const ElAspect = (e, onClick, user = null, isOwner, currentElement = null, onMoveClick) => {
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
          <i className={`icon-${e.type.toLowerCase()}`} />{schemeOnly ? <SchemeWord /> : ''}&nbsp;{e.title}
        </span>
        &nbsp;By&nbsp;{e.published_by}&nbsp;at&nbsp;
        {getFormattedISODateTime(e.submit_at)}&nbsp;{user?.type === RepoConst.U_TYPE.ANONYMOUS ? '' : StateLabel(e.state)}
        &nbsp;{user !== null && !isOwner ? '' : MoveEmbargoedBundle(e, onMoveClick)}
        <div>
          <SVGView svg={e.svg} type={e.type} className="molecule-mid" />
        </div>
      </td>
    </tr>
  );
};

const ClosePanel = ({ element }) => (
  <div>
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="closeReaction">Close</Tooltip>}
    >
      <Button
        variant="outline-dark"
        size="xsm"
        className="float-end"
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
    review_info,
    onShow,
    field,
    review,
    orgInfo
  } = props;

  if (!canComment) return '';
  return (
    <span>
      <RepoCommentBtn
        field={field}
        review={review}
        review_info={review_info}
        orgInfo={orgInfo}
        onShow={() => onShow(true, field, orgInfo)}
      />&nbsp;
    </span>
  );
};

CommentBtn.propTypes = {
  canComment: PropTypes.bool.isRequired,
  review: PropTypes.object.isRequired,
  review_info: PropTypes.object,
  onShow: PropTypes.func.isRequired,
  field: PropTypes.string.isRequired,
  orgInfo: PropTypes.string.isRequired
};

CommentBtn.defaultProps = {
  review_info: {}
};

const Doi = (props) => {
  const {
    type, id, doi, isPublished, concept, pid, zipUrl, chemotionZipUrl
  } = props;

  let data = '';
  const title = (concept ? `${type} concept DOI:` : `${type} DOI:`).replace(/(^\w)/g, m => m.toUpperCase());
  if (isPublished) {
    data = (
      <>
        <Button key={`${type}-jumbtn-${id}`} variant="link" onClick={() => { window.location = `https://dx.doi.org/${doi}`; }}>
          {doi}
        </Button>
        <ClipboardCopyBtn text={`https://dx.doi.org/${doi}`} />
        <DownloadMetadataBtn type={type} id={id} concept={concept} />
        <DownloadZipBtn zipUrl={zipUrl} chemotionZipUrl={chemotionZipUrl} publicationId={id} />
        {!concept && <RdfBtn type={type} id={id} concept={concept} info={{ pid: pid, doi: doi }} />}
      </>
    );
  } else {
    data = (
      <>
        {doi?.full_doi}&nbsp;<ClipboardCopyBtn text={`https://dx.doi.org/${doi?.full_doi}`} />
      </>
    );
  }

  return (
    <div>
      <span className="fw-bold">{title}&nbsp;</span>
      {data}
    </div>
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
  concept: PropTypes.bool,
  pid: PropTypes.number,
  zipUrl: PropTypes.string,
};

const resolvePubUrl = (doi, publicationId) => {
  if (doi) return `https://dx.doi.org/${doi}`;
  if (publicationId && typeof window !== 'undefined') {
    return `${window.location.origin}/pid/${publicationId}`;
  }
  return '';
};

const PubQRCode = ({ doi, publicationId, size }) => {
  const url = resolvePubUrl(doi, publicationId);
  if (!url) return null;
  return (
    <OverlayTrigger
      placement="left"
      overlay={<Tooltip id={`pub-qr-${publicationId || doi}`}>Scan to open: {url}</Tooltip>}
    >
      <span
        className="pub-qr-code d-inline-flex align-items-center"
        style={{
          padding: 4,
          background: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          flex: '0 0 auto',
        }}
      >
        <QRCode value={url} size={size} bordered={false} />
      </span>
    </OverlayTrigger>
  );
};

PubQRCode.propTypes = {
  doi: PropTypes.string,
  publicationId: PropTypes.number,
  size: PropTypes.number,
};

PubQRCode.defaultProps = {
  doi: '',
  publicationId: null,
  size: 56,
};

export {
  SchemeWord,
  HomeFeature,
  DateFormatYMDLong,
  DateFormatDMYTime,
  EditorTips,
  IconToMyDB,
  ChecklistPanel,
  ElAspect,
  ClosePanel,
  CommentBtn,
  Doi,
  PubQRCode,
};
