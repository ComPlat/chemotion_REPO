/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import uuid from 'uuid';
import SVG from 'react-inlinesvg';
import PropTypes from 'prop-types';
import { Popover, OverlayTrigger, Row, Col, Tooltip } from 'react-bootstrap';
import { ElStateLabel } from './RepoCommon';
import PublicActions from '../components/actions/PublicActions';
import Formula from '../components/common/Formula';
import PubchemLabels from '../components/PubchemLabels';

const xvialTag = (element, hasXvial = null) => {
  const hasX = hasXvial || (element.xvial_count && element.xvial_count > 0);
  let hasXCom = hasX && (element.xvial_com && element.xvial_com !== 0);
  if (element.xvial_com === -1 || element.xvial_com === -2) {
    hasXCom = hasX;
  } else {
    hasXCom = (element.xvial_com > 0);
  }
  if (!hasX && !hasXCom) return (<span className="xvial-span xvial" style={{ border: 'unset' }}>-</span>);
  return (<span className={`xvial-span ${hasX ? 'xvial' : ''} ${hasXCom ? 'xvial-com' : ''}`}><i className="icon-xvial" /></span>);
};

const svgTag = (path, klassName, isPubElement) => {
  console.log(isPubElement);
  const popHover = (
    <Popover id="repo-pub-popover-svg" style={{ maxWidth: 'none', maxHeight: 'none' }}>
      <img src={path} alt="" style={{ height: '26vh', width: '26vw' }} />
    </Popover>
  );
  return (
    <OverlayTrigger trigger={['hover', 'focus']} placement="right" rootClose onHide={null} overlay={popHover}>
      <div><SVG src={path} className={klassName} key={path} /></div>
    </OverlayTrigger>
  );
};


const pubchemTag = (molecule) => {
  if (molecule && molecule.tag &&
    molecule.tag.taggable_data && molecule.tag.taggable_data.pubchem_cid) {
    return {
      pubchem_tag: { pubchem_cid: molecule.tag.taggable_data.pubchem_cid }
    };
  }
  return false;
};

const infoTag = (molecule) => {
  const pubData = (molecule && molecule.pub_id) || '';

  return (
    <Row key={`list-reaction-info-${molecule.id}`} className="home_wrapper">
      <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()} className="left_tooltip bs_tooltip">Chemotion-Repository unique ID</Tooltip>}>
        <div className="home_wrapper_item">
          <div>ID</div><div>{`CRS-${pubData}`}</div>
        </div>
      </OverlayTrigger>
      <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()} className="left_tooltip bs_tooltip">an embargo bundle contains publications which has been published at the same time</Tooltip>}>
        <div className="home_wrapper_item">
          <div>Embargo</div><div>{molecule.embargo}</div>
        </div>
      </OverlayTrigger>
      <div className="home_wrapper_item">
        <div>Author</div><div>{molecule.author_name}</div>
      </div>
      <div className="home_wrapper_item">
        <div>Analyses</div><div>{molecule.ana_cnt || 0}</div>
      </div>
      <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()} className="left_tooltip bs_tooltip">When the X-Vial icon available, a physical sample of this molecule was registered to the Molecule Archive of the Compound Platform and can be requested from there</Tooltip>}>
        <div className="home_wrapper_item">
          <div>X-Vial</div><div className="item_xvial">{xvialTag(molecule)}</div>
        </div>
      </OverlayTrigger>
    </Row>
  );
};

export default class RepoMoleculeList extends Component {
  constructor(props) {
      super(props);
  }

  componentDidMount() {
  }

  render() {
    const {
      molecule, currentElement, isPubElement, advFlag, advType, advValue
    } = this.props;
    console.log(molecule);
    console.log(advFlag);
    console.log(advType);
    console.log(advValue);
    const listClass = (currentElement !== null && currentElement && currentElement.id === molecule.id) ? 'list_focus_on' : 'list_focus_off';

    const svgPathSample = molecule.sample_svg_file
      ? `/images/samples/${molecule.sample_svg_file}`
      : `/images/molecules/${molecule.molecule_svg_file}`;

    const pubchemInfo = pubchemTag(molecule);


    return (
      <Col md={isPubElement === true ? 12 : 6} key={`list-molecule-${molecule.id}`} onClick={() => PublicActions.displayMolecule(molecule.id, advFlag, advType, advValue)}>
        <div className={`home_reaction ${listClass}`}>
          <Row key={`list-reaction-svg-${molecule.id}`}>
            <Col md={2}>
              {svgTag(svgPathSample, 'molecule', isPubElement)}
            </Col>
            <Col md={10}>
              <Row><Formula formula={molecule.sum_formular} /></Row>
              <Row>
                {molecule.iupac_name}
                <span className="repo-pub-list-icons">{pubchemInfo ? <PubchemLabels element={pubchemTag(molecule)} /> : null }</span>
              </Row>
            </Col>
          </Row>
          {infoTag(molecule)}
        </div>
      </Col>
    );
  }
}


RepoMoleculeList.propTypes = {
  molecule: PropTypes.object.isRequired,
  currentElement: PropTypes.object,
  isPubElement: PropTypes.bool,
};


RepoMoleculeList.defaultProps = {
  isPubElement: false,
  currentElement: null
};
