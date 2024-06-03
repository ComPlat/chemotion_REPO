/* eslint-disable react/forbid-prop-types */
import React from 'react';
import uuid from 'uuid';
import PropTypes from 'prop-types';
import { OverlayTrigger, Row, Col, Tooltip } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import Formula from 'src/components/common/Formula';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import RepoNavListTypes from 'src/repoHome/RepoNavListTypes';

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
          <div>ID</div><div className="item_xvial">{`CRS-${pubData}`}</div>
        </div>
      </OverlayTrigger>
      <div className="home_wrapper_item">
        <div>Embargo</div><div className="item_xvial">{molecule.embargo}</div>
      </div>
      <div className="home_wrapper_item">
        <div>Analyses</div><div className="item_xvial">{molecule.ana_cnt || 0}</div>
      </div>
    </Row>
  );
};

const RepoMoleculeArchive = (props) => {
  const {
    molecule, currentElement, isPubElement, advFlag, advType, advValue
  } = props;
  if (!molecule.xvial_count) return null;
  const listClass = (currentElement && currentElement.molecule && currentElement.molecule.id === molecule.id) ? 'list_focus_on' : 'list_focus_off';
  const svgPathSample = molecule.sample_svg_file
    ? `/images/samples/${molecule.sample_svg_file}`
    : `/images/molecules/${molecule.molecule_svg_file}`;
  const pubchemInfo = pubchemTag(molecule);
  return (
    <Col xs={12} sm={12} md={isPubElement === true ? 12 : 6} key={`list-molecule-${molecule.id}`} onClick={() => PublicActions.displayMolecule(molecule.id, '', advFlag, advType, advValue, RepoNavListTypes.MOLECULE_ARCHIVE)}>
      <div className={`home_archive ${listClass}`}>
        <div className="svg_border">
          <SVG src={svgPathSample} className="archive_svg_molecule" key={svgPathSample} />
        </div>
        <div className="content">
          <div className="info">
            <div className="border">
              <div className="dl">
                Formula
              </div>
              <div className="dr"><Formula formula={molecule.sum_formular} />
                {' '}
                <span className="repo-pub-list-icons">
                  {pubchemInfo ? <PubchemLabels element={pubchemTag(molecule)} /> : null }
                </span>
              </div>
            </div>
            <div className="border">
              <div className="dl">Provided by</div>
              <div className="dr">{molecule.xvial_archive[0]?.provided_by}</div>
            </div>
            <div className="border">
              <div className="dl">Group</div>
              <div className="dr">{molecule.xvial_archive[0]?.group || 'Stefan Bräse Group'}</div>
            </div>
          </div>
          <div>
            {infoTag(molecule)}
          </div>
        </div>
      </div>
    </Col>
  );
};

RepoMoleculeArchive.propTypes = {
  molecule: PropTypes.object.isRequired,
  currentElement: PropTypes.object,
  isPubElement: PropTypes.bool,
};

RepoMoleculeArchive.defaultProps = {
  isPubElement: false,
  currentElement: null
};

export default RepoMoleculeArchive;
