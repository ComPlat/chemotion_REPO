import React from 'react';
import PropTypes from 'prop-types';

function PublicAnchor(props) {
  const { doi, isPublished } = props;
  if (!isPublished || typeof doi !== 'string') return null;
  const anchorId = doi?.split('/').pop() || '';
  return <span id={anchorId} />;
}

PublicAnchor.propTypes = {
  doi: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  isPublished: PropTypes.bool.isRequired,
};

export default PublicAnchor;
