/* eslint-disable react/forbid-prop-types */
import React from 'react';
import uuid from 'uuid';
import PropTypes from 'prop-types';
import { OverlayTrigger, Row, Col, Tooltip } from 'react-bootstrap';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import Formula from 'src/components/common/Formula';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import { xvialTag, svgTag } from 'src/repoHome/RepoPubCommon';
import { getFormattedISODate } from 'src/components/chemrepo/date-utils';
import { ExtIcon } from 'src/components/chemrepo/ExtIcon';

const pubchemTag = molecule => {
  if (molecule?.tag?.taggable_data?.pubchem_cid) {
    return {
      pubchem_tag: { pubchem_cid: molecule.tag.taggable_data.pubchem_cid },
    };
  }
  return false;
};

const infoTag = molecule => {
  const pubData = (molecule && molecule.pub_id) || '';
  return (
    <Row key={`list-reaction-info-${molecule.id}`} className="home_wrapper">
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={uuid.v4()} className="left_tooltip bs_tooltip">
            Chemotion-Repository unique ID
          </Tooltip>
        }
      >
        <div className="home_wrapper_item">
          <div>ID</div>
          <div className="item_xvial">{`CRS-${pubData}`}</div>
        </div>
      </OverlayTrigger>
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={uuid.v4()} className="left_tooltip bs_tooltip">
            an embargo bundle contains publications which have been published at
            the same time
          </Tooltip>
        }
      >
        <div className="home_wrapper_item">
          <div>Embargo</div>
          <div className="item_xvial">{molecule.embargo}</div>
        </div>
      </OverlayTrigger>
      <div className="home_wrapper_item">
        <div>Author</div>
        <div className="item_xvial">{molecule.author_name}</div>
      </div>
      <div className="home_wrapper_item">
        <div>Published on</div>
        <div className="item_xvial">
          {getFormattedISODate(molecule.published_at)}
        </div>
      </div>
      <div className="home_wrapper_item">
        <div>Analyses</div>
        <div className="item_xvial">{molecule.ana_cnt || 0}</div>
      </div>
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={uuid.v4()} className="left_tooltip bs_tooltip">
            When the X-Vial icon available, a physical sample of this molecule
            was registered to the Molecule Archive of the Compound Platform and
            can be requested from there
          </Tooltip>
        }
      >
        <div className="home_wrapper_item">
          <div>X-Vial</div>
          <div className="item_xvial">{xvialTag(molecule)}</div>
        </div>
      </OverlayTrigger>
    </Row>
  );
};

function RepoMoleculeList(props) {
  const { molecule, currentElement, isPubElement, advFlag, advType, advValue } =
    props;
  const listClass =
    currentElement?.molecule?.id === molecule.id
      ? 'list_focus_on'
      : 'list_focus_off';
  const svgPathSample = molecule.sample_svg_file
    ? `/images/samples/${molecule.sample_svg_file}`
    : `/images/molecules/${molecule.molecule_svg_file}`;
  const pubchemInfo = pubchemTag(molecule);
  return (
    <Col
      md={isPubElement === true ? 12 : 6}
      key={`list-molecule-${molecule.id}`}
      onClick={() => {
        LoadingActions.start();
        PublicActions.displayMolecule(
          molecule.id,
          '',
          advFlag,
          advType,
          advValue
        );
      }}
    >
      <div className={`home_reaction ${listClass}`}>
        <Row key={`list-reaction-svg-${molecule.id}`}>
          <Col md={2}>{svgTag(svgPathSample, 'molecule', true)}</Col>
          <Col md={10}>
            <Row>
              <Formula formula={molecule.sum_formular} />
              <span className="ext-icon-list">{ExtIcon(molecule.embargo)}</span>
            </Row>
            <Row>
              {molecule.iupac_name}
              <span className="repo-pub-list-icons">
                {pubchemInfo ? (
                  <PubchemLabels element={pubchemTag(molecule)} />
                ) : null}
              </span>
            </Row>
          </Col>
        </Row>
        {infoTag(molecule)}
      </div>
    </Col>
  );
}

RepoMoleculeList.propTypes = {
  molecule: PropTypes.object.isRequired,
  currentElement: PropTypes.object,
  isPubElement: PropTypes.bool,
  advFlag: PropTypes.bool.isRequired,
  advType: PropTypes.string.isRequired,
  advValue: PropTypes.array.isRequired,
};

RepoMoleculeList.defaultProps = { isPubElement: false, currentElement: null };

export default RepoMoleculeList;
