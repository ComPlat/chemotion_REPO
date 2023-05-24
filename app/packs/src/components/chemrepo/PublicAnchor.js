import React from 'react';
import PropTypes from 'prop-types';

const PublicAnchor = (props) => {
  const { doi, isPublished } = props;
  if (!isPublished || typeof doi !== 'string') return null;
  const anchorId = doi?.split('/').pop() || '';
  return <span id={anchorId}></span>;
};

PublicAnchor.propTypes = {
  doi: PropTypes.string.isRequired,
  isPublished: PropTypes.bool.isRequired,
};

export default PublicAnchor;
