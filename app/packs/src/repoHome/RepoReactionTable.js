/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Table, Panel, Button, ButtonGroup } from 'react-bootstrap';
import Sample from 'src/models/Sample';
import { ToggleIndicator } from 'src/repoHome/RepoCommon';

function ReactionTable({
  reaction,
  toggle,
  show,
  isPublic = true,
  isReview = false,
}) {
  let schemes = [];
  let sumSolvents = 0.0;
  const showIndicator = show ? 'down' : 'right';

  const schemeOnly =
    (reaction &&
      reaction.publication &&
      reaction.publication.taggable_data &&
      reaction.publication.taggable_data.scheme_only === true) ||
    false;

  if (isPublic) {
    ({ schemes } = reaction);
  } else {
    reaction.starting_materials.forEach((s) => {
      const ns = new Sample(s);
      ns.mat_group = 'starting_materials';
      schemes.push(ns);
    });
    reaction.reactants.forEach((s) => {
      const ns = new Sample(s);
      ns.mat_group = 'reactants';
      schemes.push(ns);
    });
    reaction.products.forEach((s) => {
      const ns = new Sample(s);
      ns.mat_group = 'products';
      schemes.push(ns);
    });
    reaction.solvents.forEach((s) => {
      const ns = new Sample(s);
      sumSolvents += ns.amount_l;
      ns.mat_group = 'solvents';
      schemes.push(ns);
    });
  }

  const hasConversionRate = () => {
    let productSwitch = 'y';
    schemes.forEach((scheme) => {
      if (scheme.mat_group === 'products' && scheme.conversion_rate !== null) {
        productSwitch = 'c';
      }
    });
    return productSwitch;
  };

  const [showSwitch, setSwitch] = useState(hasConversionRate);

  const materialCalc = (target, multi, precision) => {
    return target ? (target * multi).toFixed(precision) : ' - ';
  };

  const equivYield = (s, _sumSolvents = 1.0) => {
    let val = 0;
    switch (s.mat_group) {
      case 'products':
        if (showSwitch === 'y') {
          if (schemeOnly === true) {
            val = `${materialCalc(s.scheme_yield * 100, 1, 0).toString()}%`;
          } else {
            val = `${materialCalc(s.equivalent * 100, 1, 0).toString()}%`;
          }
        } else {
          val = `${materialCalc(s.conversion_rate, 1, 4).toString()}%`;
        }
        break;
      case 'solvents':
        if (isPublic) {
          val = `${materialCalc(s.equivalent * 100, 1, 0).toString()}%`;
        } else {
          val = `${materialCalc(
            (s.amount_l / _sumSolvents) * 100,
            1,
            1
          ).toString()}%`;
        }
        break;
      default:
        val = materialCalc(s.equivalent, 1, 3);
    }
    return val;
  };

  const rows = (samples, _isReview = false) => {
    let currentType = '';
    return typeof samples !== 'undefined'
      ? samples.map((sample, i) => {
          const matType =
            sample.mat_group &&
            sample.mat_group[0].toUpperCase() +
              sample.mat_group.replace('_', ' ').slice(1);
          const rLabel = (sample.short_label || '').concat(
            '   ',
            sample.name || ''
          );
          const useName = isPublic
            ? sample.molecule_iupac_name ||
              sample.iupac_name ||
              sample.sum_formular
            : sample.molecule_iupac_name;
          let label = _isReview ? (
            <span>
              {rLabel}
              <br />
              {useName}
            </span>
          ) : (
            useName
          );
          if (sample.mat_group === 'solvents') label = sample.external_label;
          let title = null;
          if (currentType !== sample.mat_group) {
            currentType = sample.mat_group;
            title =
              currentType === 'products' ? (
                <tr>
                  <td colSpan="6">
                    <b>{matType}</b>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <ButtonGroup className="btn-product">
                      <Button
                        bsSize="xsmall"
                        active={showSwitch === 'y'}
                        className={showSwitch === 'y' ? 'on' : 'off'}
                        onClick={() => {
                          setSwitch('y');
                        }}
                      >
                        Yield
                      </Button>
                      <Button
                        bsSize="xsmall"
                        active={showSwitch === 'c'}
                        className={showSwitch === 'c' ? 'on' : 'off'}
                        onClick={() => {
                          setSwitch('c');
                        }}
                      >
                        Conv.
                      </Button>
                    </ButtonGroup>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="7">
                    <b>{matType}</b>
                  </td>
                </tr>
              );
          }
          return (
            <tbody key={i}>
              {title}
              <tr>
                <td style={{ width: '26%' }}>{label}</td>
                <td style={{ width: '12%' }}>
                  {isPublic
                    ? sample.sum_formular
                    : sample.molecule.sum_formular}
                </td>
                <td style={{ width: '14%', textAlign: 'center' }}>
                  {sample.mat_group === 'solvents'
                    ? ' '
                    : isPublic
                      ? sample.dmv
                      : !sample.has_molarity && !sample.has_density
                        ? '- / -'
                        : sample.has_density
                          ? +sample.density + ' / - '
                          : ' - / ' +
                            sample.molarity_value +
                            sample.molarity_unit}
                </td>
                <td style={{ width: '12%', textAlign: 'center' }}>
                  {sample.mat_group === 'solvents'
                    ? ' - '
                    : materialCalc(sample.amount_g, 1000, 3)}
                </td>
                <td style={{ width: '12%', textAlign: 'center' }}>
                  {materialCalc(sample.amount_l, 1000, 3)}
                </td>
                <td style={{ width: '12%', textAlign: 'center' }}>
                  {sample.mat_group === 'solvents'
                    ? ' - '
                    : materialCalc(sample.amount_mol, 1000, 3)}
                </td>
                <td style={{ width: '12%', textAlign: 'center' }}>
                  {equivYield(sample, sumSolvents)}
                </td>
              </tr>
            </tbody>
          );
        })
      : null;
  };
  const table = (dataRows) => (
    <Table responsive>
      <thead>
        <tr>
          <th>IUPAC</th>
          <th>Formula</th>
          <th style={{ textAlign: 'center' }}>Density/Molarity</th>
          <th style={{ textAlign: 'center' }}>Amount [mg]</th>
          <th style={{ textAlign: 'center' }}>Volume [mL]</th>
          <th style={{ textAlign: 'center' }}>Amount [mmol]</th>
          <th style={{ textAlign: 'center' }}>Equiv</th>
        </tr>
      </thead>
      {dataRows}
    </Table>
  );

  return (
    <span>
      <ToggleIndicator
        onClick={toggle}
        name="Reaction Table"
        indicatorStyle={showIndicator}
      />
      <Panel
        style={{ border: 'none' }}
        id="collapsible-panel-scheme"
        expanded={show}
        defaultExpanded={show}
        onToggle={() => {}}
      >
        <Panel.Collapse>
          <Panel.Body style={{ fontSize: '90%', paddingBottom: 'unset' }}>
            <div>{table(rows(schemes, isReview))}</div>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </span>
  );
}

ReactionTable.propTypes = {
  reaction: PropTypes.object.isRequired,
  toggle: PropTypes.func,
  show: PropTypes.bool,
  isPublic: PropTypes.bool,
  isReview: PropTypes.bool,
};

ReactionTable.defaultProps = {
  toggle: () => {},
  show: false,
  isPublic: true,
  isReview: false,
};

export default ReactionTable;
