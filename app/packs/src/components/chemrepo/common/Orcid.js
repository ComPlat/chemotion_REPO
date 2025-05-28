import React from 'react';
import PropTypes from 'prop-types';

function OrcidIcon({ orcid }) {
  if (typeof orcid === 'undefined' || orcid === null) {
    return null;
  }

  return (
    <a
      href={`https://orcid.org/${orcid}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      <img
        src="/images/wild_card/ORCIDiD_iconvector.svg"
        className="orcid-logo"
        alt="ORCID iD"
        title="ORCID iD"
      />
    </a>
  );
}

OrcidIcon.propTypes = { orcid: PropTypes.string };
OrcidIcon.defaultProps = { orcid: null };

export default OrcidIcon;
