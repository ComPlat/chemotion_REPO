import React from 'react';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { getFormattedISODate } from 'src/repo/chemrepo/date-utils';

const labelStyle = {
  display: 'inline-block',
  marginLeft: '5px',
  marginRight: '5px',
  borderColor: 'grey',
};

const ChemotionTag = ({ tagData, firstOnly = false }) => {
  const chemotionTag = tagData.chemotion;
  if (!chemotionTag) { return null; }
  const { chemotion_first, last_published_at, doi } = chemotionTag;
  if (firstOnly && !chemotion_first) { return null; }
  const formattedTime = getFormattedISODate(chemotion_first || last_published_at);
  const tooltipText = chemotion_first ? `Published First Here on ${formattedTime}`
    : `Last published on ${formattedTime}`;
  const first = chemotion_first ? <span>1<sup>st</sup></span> : null;

  return (
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="printCode">{tooltipText}</Tooltip>}>
      <a
        style={labelStyle}
        target="_blank"
        rel="noreferrer"
        href={`https://dx.doi.org/${doi}`}
      >
        <img alt="chemotion_first" src="/favicon.ico" className="pubchem-logo" />
        {first}
      </a>
    </OverlayTrigger>
  );
};

ChemotionTag.propTypes = {
  tagData: PropTypes.object,
};
ChemotionTag.defaultProps = {
  tagData: {},
};

export default ChemotionTag;
