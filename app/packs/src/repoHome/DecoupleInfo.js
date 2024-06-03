/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import RepoConst from 'src/components/chemrepo/common/RepoConst';
import ExactMass from 'src/components/chemrepo/ExactMass';
import { ExactFormula } from 'src/components/common/Formula';

function DecoupleInfo({ sample, molecule }) {
  const { inchikey = '' } = molecule ?? {};
  if (!sample.decoupled || inchikey === RepoConst.INCHIKEY_DUMMY) return null;
  const em = ExactMass(sample, molecule);
  return (
    <>
      <h5>
        <b>Formula:&nbsp;</b>
        <ExactFormula sample={sample} molecule={molecule} />
      </h5>
      {em && (
        <h5>
          <b>Exact Mass:&nbsp;</b> {em}
        </h5>
      )}
    </>
  );
}

DecoupleInfo.propTypes = {
  sample: PropTypes.object.isRequired,
  molecule: PropTypes.object,
};

DecoupleInfo.defaultProps = {
  molecule: null,
};

export default DecoupleInfo;
