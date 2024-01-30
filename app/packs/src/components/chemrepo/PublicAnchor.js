import React from 'react';
import PropTypes from 'prop-types';

const PublicAnchor = (props) => {
  const { doi, isPublished } = props;
  if (!isPublished || typeof doi !== 'string') return null;
  const doiSplit = doi.split('/');
  const anchorId = isNaN(doiSplit[doiSplit.length - 1]) ? doiSplit[doiSplit.length - 1]
                                                        : doiSplit.slice(-2).join('/');
  return <span id={anchorId || ''}></span>;
};

PublicAnchor.propTypes = {
  doi: PropTypes.string.isRequired,
  isPublished: PropTypes.bool.isRequired,
};

export default PublicAnchor;
