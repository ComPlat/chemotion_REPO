import React from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import HelpInfo from 'src/repo/others/HelpInfo';

const OrcidIcon = ({ orcid }) => {
  if (typeof orcid === 'undefined' || orcid === null) {
    return (<span />);
  }
  const handleOnClick = (e) => {
    e.stopPropagation();
  };

  return (
    <a href={`https://orcid.org/${orcid}`} target="_blank" rel="noopener noreferrer" onClick={handleOnClick}>
      <img src="/images/wild_card/ORCIDiD_iconvector.svg" className="orcid-logo" alt="ORCID iD" title="ORCID iD" />
    </a>
  );
};

OrcidIcon.propTypes = {
  orcid: PropTypes.string
};

OrcidIcon.defaultProps = {
  orcid: null
};

const RorLink = ({ rorId }) => {
  if (!rorId) return null;

  const handleOnClick = (e) => {
    e.stopPropagation();
  };

  return (
    <a href={`https://ror.org/${rorId}`} target="_blank" rel="noopener noreferrer" onClick={handleOnClick} title={`ROR ID: ${rorId}`}>
      <img src="/images/ror-icon-rgb.svg" className="ror-logo" alt="ROR ID" style={{ height: '16px', marginLeft: '3px' }} />
    </a>
  );
};

RorLink.propTypes = {
  rorId: PropTypes.string
};

RorLink.defaultProps = {
  rorId: null
};

const AuthorList = ({ creators, affiliationMap, contributor, affiliations }) => {
  // Process the contributor's affiliations if provided
  const combinedAffiliationMap = { ...affiliationMap };

  if (contributor && contributor.affiliationIds && contributor.affiliationIds.length > 0) {
    // Build a reverse lookup: affiliation text -> existing index
    const textToIndex = {};
    if (affiliations) {
      Object.keys(combinedAffiliationMap).forEach((id) => {
        const text = affiliations[id];
        if (text) {
          textToIndex[text] = combinedAffiliationMap[id];
        }
      });
    }

    // Get the highest existing index in the affiliationMap
    const maxIndex = Object.values(combinedAffiliationMap).length > 0
      ? Math.max(...Object.values(combinedAffiliationMap))
      : 0;

    // Add contributor affiliations to the map with new indices
    let newCount = 0;
    contributor.affiliationIds.forEach((affId, idx) => {
      if (!combinedAffiliationMap[affId]) {
        const affText = contributor.affiliations && contributor.affiliations[idx];
        if (affText && textToIndex[affText]) {
          combinedAffiliationMap[affId] = textToIndex[affText];
        } else {
          newCount += 1;
          combinedAffiliationMap[affId] = maxIndex + newCount;
          if (affText) {
            textToIndex[affText] = maxIndex + newCount;
          }
        }
      }
    });
  }

  return (
    <span className="fw-bold fs-6">
      {creators.map(
        (creator, i) => (
          <span key={`auth_${creator.id}_${uuid.v4()}`}>
            {i === 0 ? null : ' - '}<OrcidIcon orcid={creator.ORCID} />{creator.name}
            <sup>
              {creator.affiliationIds && creator.affiliationIds.map(e => combinedAffiliationMap[e]).sort().join()}
            </sup>
          </span>
        )
      )}
    </span>
  );
};

AuthorList.propTypes = {
  creators: PropTypes.array,
  affiliationMap: PropTypes.object,
  contributor: PropTypes.object,
  affiliations: PropTypes.object,
};

AuthorList.defaultProps = {
  creators: [],
  affiliationMap: {},
  contributor: {},
  affiliations: {},
};

const ContributorInfo = ({ contributor, showHelp, affiliationMap }) => {
  if (!contributor.name) {
    return <div />;
  }

  // Get affiliation numbers directly from affiliationMap without separating by commas
  // so they appear directly after the name, e.g. "Name1,2".
  const affiliationNumbers = contributor.affiliationIds && contributor.affiliationIds.length > 0 ?
    <sup>{contributor.affiliationIds.map(id => affiliationMap[id]).sort().join(',')}</sup> : null;

  const contributorBlock = !showHelp ? (
    <div className="fw-bold fs-6">
      <span>Contributor: </span>
      <OrcidIcon orcid={contributor.ORCID} />
      {contributor.name}
      {affiliationNumbers}
    </div>
  ) : (
    <div className="fw-bold fs-6">
      <span>Contributor&nbsp;<HelpInfo source="contributor" place="right" />: </span>
      <OrcidIcon orcid={contributor.ORCID} />
      {contributor.name}
      {affiliationNumbers}
    </div>
  );

  return (
    <div>
      {contributorBlock}
    </div>
  );
};

ContributorInfo.propTypes = {
  contributor: PropTypes.object,
  showHelp: PropTypes.bool,
  affiliationMap: PropTypes.object
};

ContributorInfo.defaultProps = {
  contributor: {},
  showHelp: false,
  affiliationMap: {}
};

const AffiliationList = ({ affiliations, affiliationMap, rorMap }) => {
  const names = [];
  Object.keys(affiliationMap).forEach((affiliationId) => {
    const ind = affiliationMap[affiliationId];
    if (!names[ind]) {
      names[ind] = { text: affiliations[affiliationId], rorId: rorMap && rorMap[affiliationId] };
    } else if (!names[ind].rorId && rorMap && rorMap[affiliationId]) {
      names[ind].rorId = rorMap[affiliationId];
    }
  });

  return (
    <div className="mb-2">
      {names.map(
        (e, i) => {
          if (i === 0) return null;

          return (
            <div className="fs-6" key={'affil_'+i}>
              {i}. {e.text}
              {e.rorId && <RorLink rorId={e.rorId} />}
            </div>
          );
        }
      )}
    </div>
  );
};

AffiliationList.propTypes = {
  affiliations: PropTypes.object,
  affiliationMap: PropTypes.object,
  rorMap: PropTypes.object
};

AffiliationList.defaultProps = {
  affiliations: {},
  affiliationMap: {},
  rorMap: {}
};

export { OrcidIcon, RorLink, AuthorList, ContributorInfo, AffiliationList };
