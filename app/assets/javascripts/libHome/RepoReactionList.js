import React, { Component } from 'react';
import SVG from 'react-inlinesvg';
import PropTypes from 'prop-types';
import { Popover, OverlayTrigger, Row, Col } from 'react-bootstrap';
import { ElStateLabel } from './RepoCommon';
import PublicActions from '../components/actions/PublicActions';

const xvialTag = (element, hasXvial = null) => {
  const hasX = hasXvial || (element.xvial_count && element.xvial_count > 0);
  let hasXCom = hasX && (element.xvial_com && element.xvial_com !== 0);
  if (element.xvial_com === -1 || element.xvial_com === -2) {
    hasXCom = hasX;
  } else {
    hasXCom = (element.xvial_com > 0);
  }
  return (<span className={`xvial-span ${hasX ? 'xvial' : ''} ${hasXCom ? 'xvial-com' : ''}`}><i className="icon-xvial" /></span>);
};

const svgTag = (path, klassName, isPubElement) => {
  const popHover = (
    <Popover id="repo-pub-popover-svg" style={{ maxWidth: 'none', maxHeight: 'none' }}>
      <img src={path} alt="" style={{ height: '26vh', width: '52vw' }} />
    </Popover>
  );
  return isPubElement ? (
    <OverlayTrigger trigger={['hover', 'focus']} placement="right" rootClose onHide={null} overlay={popHover}>
      <div><SVG src={path} className={klassName} key={path} /></div>
    </OverlayTrigger>
  ) : <SVG src={path} className={klassName} key={path} />;
};


const infoTag = (reaction, schemeOnly) => {
  const pubData = (reaction && reaction.pub_id) || '';
  const taggData = (reaction && reaction.taggable_data) || {};

  let authorInfo = '';
  if (taggData && taggData.creators && taggData.creators.length > 0) {
    authorInfo = (<div className="home_wrapper_item"><div>Author</div><div>{taggData.creators[0] && taggData.creators[0].name}</div></div>);
  } else if (taggData && taggData.contributors) {
    authorInfo = (<div className="home_wrapper_item"><div>Contributor</div><div>{taggData.contributors.name}</div></div>);
  } else {
    authorInfo = (<div className="home_wrapper_item"><div>Author</div><div /></div>);
  }

  return (
    <div key={`list-reaction-info-${reaction.id}`} className="home_wrapper">
      <div className="home_wrapper_item">
        <div>ID</div><div>{`CRR-${pubData}`}</div>
      </div>
      <div className="home_wrapper_item">
        <div>Embargo Bundle</div><div>{ElStateLabel(reaction.embargo)}</div>
      </div>
      {authorInfo}
      <div className="home_wrapper_item">
        <div>Analyses</div><div>{reaction.ana_cnt || 0}</div>
      </div>
      <div className="home_wrapper_item">
        <div>X-Vial</div><div>{xvialTag(reaction)}</div>
      </div>
    </div>
  );
}

export default class RepoReactionList extends Component {
  constructor(props) {
      super(props);
  }

  componentDidMount() {
  }

  render() {
    const { element, currentElement, isPubElement, schemeOnly } = this.props;
    const listClass = (currentElement !== null && currentElement && currentElement.id === element.id) ? 'list_focus_on' : 'list_focus_off';
    console.log(element.id);
    return (
      <Col md={isPubElement === true ? 12 : 6} style={{ border: '1px solid' }} key={`list-reaction-${element.id}`} className={listClass} onClick={() => PublicActions.displayReaction(element.id)} >
        <Row key={`list-reaction-svg-${element.id}`} className={listClass}>
          <Col md={12}>
            {svgTag(element.svgPath, 'reaction', isPubElement)}
          </Col>
        </Row>
        {infoTag(element, schemeOnly)}
      </Col>
    );
  }
}


RepoReactionList.propTypes = {
  element: PropTypes.object.isRequired,
  currentElement: PropTypes.object,
  isPubElement: PropTypes.bool,
  schemeOnly: PropTypes.bool
}


RepoReactionList.defaultProps = {
  isPubElement: false,
  schemeOnly: false,
  currentElement: null
}