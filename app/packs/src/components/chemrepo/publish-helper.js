/* eslint-disable react/no-array-index-key */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import OrcidIcon from 'src/components/chemrepo/common/Orcid';

function UserAffInfo({ users, collaborations = [], parentId = 'author' }) {
  if (!users) {
    return null;
  }
  return users.map((a, aidx) => {
    const us = (collaborations || []).filter(c => c.id === a.value);
    const u = us?.length > 0 ? us[0] : {};
    const orcid = OrcidIcon({ orcid: u.orcid });
    const aff =
      u &&
      u.current_affiliations &&
      u.current_affiliations.map((af, afidx) => (
        <div key={`user-aff-${afidx}-${parentId}`}>
          {' '}
          -{af.department}, {af.organization}, {af.country}
        </div>
      ));
    return (
      <div key={`user-${aidx}-${parentId}`}>
        {orcid}
        {a.label}
        <br />
        {aff}
        <br />
      </div>
    );
  });
}

UserAffInfo.propTypes = {
  users: PropTypes.array.isRequired,
  collaborations: PropTypes.array,
  parentId: PropTypes.string,
};

UserAffInfo.defaultProps = {
  collaborations: [],
  parentId: 'author',
};

export default UserAffInfo;
