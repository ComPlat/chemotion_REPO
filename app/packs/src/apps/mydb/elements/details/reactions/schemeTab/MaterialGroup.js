import React from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon, Tooltip, OverlayTrigger } from 'react-bootstrap';
import VirtualizedSelect from 'react-virtualized-select';
import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';
import MaterialCalculations from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialCalculations';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import Molecule from 'src/models/Molecule';
import Reaction from 'src/models/Reaction';
import { defaultMultiSolventsSmilesOptions } from 'src/components/staticDropdownOptions/options';
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';
import { reagents_kombi } from 'src/components/staticDropdownOptions/reagents_kombi';
import { permitOn } from 'src/components/common/uis';
import HelpInfo from 'src/components/common/HelpInfo';
import ToggleButton from 'src/components/common/ToggleButton';

const MaterialGroup = ({
  materials, materialGroup, deleteMaterial, onChange,
  showLoadingColumn, reaction, addDefaultSolvent, headIndex,
  dropMaterial, dropSample, switchEquiv, lockEquivColumn, displayYieldField,
  switchYield
}) => {
  const contents = [];
  let index = headIndex;
  if (materials && materials.length > 0) {
    materials.forEach((material) => {
      index += 1;
      contents.push((
        <Material
          reaction={reaction}
          onChange={onChange}
          key={material.id}
          material={material}
          materialGroup={materialGroup}
          showLoadingColumn={showLoadingColumn}
          deleteMaterial={m => deleteMaterial(m, materialGroup)}
          index={index}
          dropMaterial={dropMaterial}
          dropSample={dropSample}
          lockEquivColumn={lockEquivColumn}
          displayYieldField={displayYieldField}
        />
      ));

      if (materialGroup === 'products' &&
        material.adjusted_loading &&
        material.error_mass) {
        contents.push((
          <MaterialCalculations
            material={material}
            materialGroup={materialGroup}
            index={index}
          />
        ));
      }
    });
  }

  if (materialGroup === 'solvents' ||
    materialGroup === 'purification_solvents') {
    return (
      <SolventsMaterialGroup
        contents={contents}
        materialGroup={materialGroup}
        reaction={reaction}
        addDefaultSolvent={addDefaultSolvent}
      />
    );
  }

  return (
    <GeneralMaterialGroup
      contents={contents}
      materialGroup={materialGroup}
      showLoadingColumn={showLoadingColumn}
      reaction={reaction}
      addDefaultSolvent={addDefaultSolvent}
      switchEquiv={switchEquiv}
      lockEquivColumn={lockEquivColumn}
      displayYieldField={displayYieldField}
      switchYield={switchYield}
    />
  );
};

const switchEquivTooltip = () => (
  <Tooltip id="assign_button">Lock/unlock Equiv <br /> for target amounts</Tooltip>
);

const SwitchEquivButton = (lockEquivColumn, switchEquiv) => {
  return (
    <OverlayTrigger placement="top" overlay={switchEquivTooltip()} >
      <Button
        id="lock_equiv_column_btn"
        bsSize="xsmall"
        bsStyle={lockEquivColumn ? 'warning' : 'default'}
        onClick={switchEquiv}
      >
        <i className={lockEquivColumn ? 'fa fa-lock' : 'fa fa-unlock'} />
      </Button>
    </OverlayTrigger>
  );
};

function GeneralMaterialGroup({
  contents, materialGroup, showLoadingColumn, reaction, addDefaultSolvent,
  switchEquiv, lockEquivColumn, displayYieldField, switchYield
}) {
  const isReactants = materialGroup === 'reactants';
  let headers = {
    ref: 'Ref',
    group: 'Starting materials',
    show_label: 'L/S',
    tr: 'T/R',
    mass: 'Mass',
    reaction_coefficient: 'Coef',
    amount: 'Amount',
    loading: 'Loading',
    concn: 'Conc',
    vol: 'Vol',
    eq: 'Equiv'
  };

  const reagentList = [];
  let reagentDd = <span />;
  const createReagentForReaction = (event) => {
    const smi = event.value;
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        const molecule = new Molecule(result);
        molecule.density = molecule.density || 0;
        addDefaultSolvent(molecule, null, materialGroup, event.label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  if (isReactants) {
    headers = { group: 'Reactants' };
    Object.keys(reagents_kombi).forEach((x) => {
      reagentList.push({
        label: x,
        value: reagents_kombi[x]
      });
    });
    reagentDd = (
      <VirtualizedSelect
        disabled={!permitOn(reaction)}
        className="reagents-select"
        name="Reagents"
        multi={false}
        options={reagentList}
        placeholder="Reagents"
        onChange={createReagentForReaction}
      />
    );
  }

  const yieldConversionRateFields = () => {
    const conversionText = 'Click to switch to conversion field.'
    + ' The conversion will not be displayed as part of the reaction scheme';
    const yieldText = 'Click to switch to yield field.'
    + ' The yield will be displayed as part of the reaction scheme';
    let conversionOrYield = displayYieldField;
    if (displayYieldField || displayYieldField === null) {
      conversionOrYield = true;
    }
    return (
      <div>
        <ToggleButton
          isToggledInitial={conversionOrYield}
          onToggle={switchYield}
          onLabel="Yield"
          offLabel="Conv."
          onColor="transparent"
          offColor="transparent"
          tooltipOn={conversionText}
          tooltipOff={yieldText}
          fontSize="14px"
          fontWeight="bold"
        />
      </div>
    );
  };

  if (materialGroup === 'products') {
    headers.group = 'Products';
    headers.eq = yieldConversionRateFields();
  }

  const refTHead = (materialGroup !== 'products') ? headers.ref : null;
  /**
   * Add a (not yet persisted) sample to a material group
   * of the given reaction
   */
  const addSampleButton = (
    <Button
      disabled={!permitOn(reaction)}
      bsStyle="success"
      bsSize="xs"
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
    >
      <Glyphicon glyph="plus" />
    </Button>
  );

  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <colgroup>
          <col style={{ width: '4%' }} />
          <col style={{ width: showLoadingColumn ? '8%' : '15%' }} />
          <col style={{ width: '4%' }} />
          <col style={{ width: '2%' }} />
          <col style={{ width: '2%' }} />
          <col style={{ width: showLoadingColumn ? '3%' : '4%' }} />
          <col style={{ width: showLoadingColumn ? '10%' : '11%' }} />
          {showLoadingColumn && <col style={{ width: '11%' }} />}
          <col style={{ width: showLoadingColumn ? '10%' : '11%' }} />
          <col style={{ width: showLoadingColumn ? '12%' : '13%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>{addSampleButton}</th>
            <th>{headers.group}</th>
            {isReactants && <th colSpan={showLoadingColumn ? 9 : 8}>{reagentDd}</th>}
            {!isReactants && <th>{refTHead}</th>}
            <th>{headers.show_label}</th>
            {!isReactants && <th style={{ padding: '2px 2px' }}>{headers.tr}</th>}
            {!isReactants
              && (
                <th style={{ padding: '2px 2px' }}>
                  <OverlayTrigger
                    placement="top"
                    overlay={
                      <Tooltip id="coefficientHeaderTitleReactionScheme">Coefficient</Tooltip>
                    }
                  >
                    <span>{headers.reaction_coefficient}</span>
                  </OverlayTrigger>
                </th>
              )}
            {!isReactants && <th>{headers.amount}</th>}
            {!isReactants && <th />}
            {!isReactants && <th />}
            {showLoadingColumn && !isReactants && <th>{headers.loading}</th>}
            {!isReactants && <th>{headers.concn}</th>}
            {!isReactants && <th>{headers.eq} {!isReactants && materialGroup !== 'products' && SwitchEquivButton(lockEquivColumn, switchEquiv)}</th> }
          </tr>
        </thead>
        {contents.map(item => item)}
      </table>
    </div>
  );
}


const SolventsMaterialGroup = ({
  contents, materialGroup, reaction, addDefaultSolvent
}) => {
  const addSampleButton = (
    <Button
      disabled={!permitOn(reaction)}
      bsStyle="success"
      bsSize="xs"
      onClick={() => ElementActions.addSampleToMaterialGroup({ reaction, materialGroup })}
    >
      <Glyphicon glyph="plus" />
    </Button>
  );

  const createDefaultSolventsForReaction = (event) => {
    const solvent = event.value;
    // MoleculesFetcher.fetchByMolfile(solvent.molfile)
    const smi = solvent.smiles;
    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        const molecule = new Molecule(result);
        const d = molecule.density;
        const solventDensity = solvent.density || 1;
        molecule.density = (d && d > 0) || solventDensity;
        addDefaultSolvent(molecule, null, materialGroup, solvent.external_label);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  const solventOptions = Object.keys(ionic_liquids).reduce(
    (solvents, ionicLiquid) => solvents.concat({
      label: ionicLiquid,
      value: {
        external_label: ionicLiquid,
        smiles: ionic_liquids[ionicLiquid],
        density: 1.0,
        drySolvent: false
      }
    }), defaultMultiSolventsSmilesOptions
  );

  return (
    <div>
      <table width="100%" className="reaction-scheme">
        <thead>
          <tr>
            <th width="4%">{addSampleButton}</th>
            <th width="21%" style={{ paddingRight: '10px' }}>
              <VirtualizedSelect
                disabled={!permitOn(reaction)}
                className="solvents-select"
                name="default solvents"
                multi={false}
                options={solventOptions}
                placeholder="Default solvents"
                onChange={createDefaultSolventsForReaction}
              />
            </th>
            <th width="2%" title="Dry Solvent">DS</th>
            <th width="4%">T/R</th>
            <th width="24%">Label</th>
            <th width="13%">Vol</th>
            <th width="13%">Vol ratio</th>
            <th width="3%" />
          </tr>
        </thead>
        <tbody>
          {contents.map(item => item)}
        </tbody>
      </table>
    </div>
  );
};

MaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  headIndex: PropTypes.number.isRequired,
  materials: PropTypes.arrayOf(PropTypes.shape).isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  addDefaultSolvent: PropTypes.func.isRequired,
  dropMaterial: PropTypes.func.isRequired,
  dropSample: PropTypes.func.isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool,
  displayYieldField: PropTypes.bool,
  switchYield: PropTypes.func.isRequired
};

GeneralMaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  showLoadingColumn: PropTypes.bool,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  addDefaultSolvent: PropTypes.func.isRequired,
  contents: PropTypes.arrayOf(PropTypes.shape).isRequired,
  switchEquiv: PropTypes.func.isRequired,
  lockEquivColumn: PropTypes.bool,
  displayYieldField: PropTypes.bool,
  switchYield: PropTypes.func.isRequired
};

SolventsMaterialGroup.propTypes = {
  materialGroup: PropTypes.string.isRequired,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  addDefaultSolvent: PropTypes.func.isRequired,
  contents: PropTypes.arrayOf(PropTypes.shape).isRequired
};

MaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: null
};

GeneralMaterialGroup.defaultProps = {
  showLoadingColumn: false,
  lockEquivColumn: false,
  displayYieldField: null
};


export { MaterialGroup, GeneralMaterialGroup, SolventsMaterialGroup };
