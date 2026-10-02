import React from 'react';
import { Row, Col, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import Formula from 'src/repo/others/Formula';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import ChemotionTag from 'src/repo/chemrepo/ChemotionTag';
import MolViewerBtn from 'src/components/viewer/MolViewerBtn';
import RepoConst from 'src/repo/chemrepo/common/RepoConst';
import zoomSvg from 'src/repo/chemrepo/svg-utils';
import { ClipboardCopyLink, ClipboardCopyBtn } from './clipboard';

const hideInfo = _molecule => ((_molecule?.inchikey === RepoConst.INCHIKEY_DUMMY) ? { display: 'none' } : {});

const SampleExactMW = (em) => {
  if (em) {
    return (<span>{em.toFixed(6)} g&sdot;mol<sup>-1</sup></span>);
  }
  return '';
};

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

const MoleculeInfo = ({ molecule, sample_svg_file = '', hasXvial = false, children }) => {
  let svgPath = `/images/molecules/${molecule.molecule_svg_file}`;
  if (sample_svg_file && sample_svg_file != '') {
    svgPath = `/images/samples/${sample_svg_file}`;
  }
  const tagData = molecule.tag && molecule.tag.taggable_data;
  const pubchemInfo = {
    pubchem_tag: { pubchem_cid: tagData && tagData.pubchem_cid }
  };
  const nameOrFormula = molecule.iupac_name && molecule.iupac_name !== ''
    ? <div className="fs-5 fw-normal"><b>IUPAC Name: </b> {molecule.iupac_name} (<Formula formula={molecule.sum_formular} />)</div>
    : <div className="fs-5 fw-normal"><b>Formula: </b> <Formula formula={molecule.sum_formular} /></div>;
  const registedCompoundTooltip = (
    <div>
      To check availability, please click the "Request a sample" button (<i className="fa fa-envelope-o" />) below to contact the Compound Platform team.
    </div>
  );
  return (
    <Row>
      <Col sm={4} md={4} lg={4}>
        {zoomSvg(svgPath, <MolViewerBtn isPublic fileContent={molecule.molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n'} disabled={false} viewType={`mol_mol_${molecule.id}`} />)}
      </Col>
      <Col sm={8} md={8} lg={8}>
      <div>
        {children}
        <div className="repo-registed-compound-desc">
          This information is based on the molecular structure shown on the left side. For a decoupled sample, please refer to its individual details.
        </div>
        {nameOrFormula}
        <br />
        <span style={hideInfo(molecule)}>
          <div className="mb-1 fw-normal"><b>Canonical SMILES: </b> <ClipboardCopyLink text={molecule.cano_smiles} /></div>
          <div className="mb-1 fw-normal"><b>InChI: </b> <ClipboardCopyLink text={molecule.inchistring} /></div>
          <div className="mb-1 fw-normal"><b>InChIKey: </b> <ClipboardCopyLink text={molecule.inchikey} /></div>
          <div className="mb-1 fw-normal"><b>Exact Mass: </b> {SampleExactMW(molecule.exact_molecular_weight)}</div>
        </span>
        {
          hasXvial ?
            <div className="repo-registed-compound-desc">
              A physical sample of this molecule was registered to the Molecule Archive of the
              Compound Platform&nbsp;
              <OverlayTrigger trigger={['hover', 'focus']} rootClose placement="top" overlay={<Tooltip id="registed_compound_tooltip" className="left_tooltip bs_tooltip">{registedCompoundTooltip}</Tooltip>}>
                <i className="fa fa-info-circle" aria-hidden="true" />
              </OverlayTrigger>
            </div> : null
        }
        <h5>
          <b>Crosslinks: </b>
          &nbsp;&nbsp;
          <PubchemLabels element={pubchemInfo} />
          <ChemotionTag tagData={tagData} />
        </h5>
      </div>
      </Col>
    </Row>
  );
};

const SidToPubChem = ({ sid }) => {
  let labelStyle = {
    marginLeft: '2px',
    marginRight: '2px',
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
};

const ChemotionId = props => (
  <div className="d-flex align-items-center">
    <b className="fw-bold">{props.type?.replace(/^\w/, c => c.toUpperCase())} ID:&nbsp;</b>
    <Button key={`reaction-jumbtn-${props.id}`} variant="link" onClick={() => { window.location = `/pid/${props.id}`; }}>
      {props.type === 'reaction' ? 'CRR' : 'CRS'}-{props.id}
    </Button><ClipboardCopyBtn text={`https://www.chemotion-repository.net/pid/${props.id}`} />
  </div>
);
ChemotionId.propTypes = {
  id: PropTypes.number.isRequired,
  type: PropTypes.oneOf(['sample', 'reaction']).isRequired
};

export { hideInfo, SampleExactMW, ElementIcon, AnalysesTypeJoinLabel, MoleculeInfo, SidToPubChem, ChemotionId };
