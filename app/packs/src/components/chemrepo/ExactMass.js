/* eslint-disable react/destructuring-assignment */
import React from 'react';
import RepoConst from 'src/components/chemrepo/common/RepoConst';

function FormatEM(em) {
  if (em) {
    return (
      <span>
        {em.toFixed(6)} g&sdot;mol<sup>-1</sup>
      </span>
    );
  }
  return null;
}

function ExactMass(sample, molecule) {
  const { decoupled = false, molecular_mass: molecularMass } = sample ?? {};
  const { inchikey = '', exact_molecular_weight: exactMolecularWeight } =
    molecule ?? {};
  const mass =
    decoupled && inchikey !== RepoConst.INCHIKEY_DUMMY
      ? molecularMass
      : exactMolecularWeight;
  return FormatEM(mass);
}

export default ExactMass;
