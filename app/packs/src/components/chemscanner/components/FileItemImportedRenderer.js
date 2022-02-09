import PropTypes from 'prop-types';
import React from 'react';

const FileItemImportedRenderer = ({ data }) => {
  const { type, isImported } = data;
  if (type.endsWith('Summary')) return <span />;

  let style;
  let icon;

  if (isImported) {
    style = { color: '#5cb85c' };
    icon = 'check-circle';
  } else {
    style = {};
    icon = 'check-circle-o';
  }

  return (
    <div style={{ paddingLeft: '30px' }}>
      <i style={style} className={`fa fa-${icon}`} />
    </div>
  );
};

FileItemImportedRenderer.propTypes = {
  data: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default FileItemImportedRenderer;
