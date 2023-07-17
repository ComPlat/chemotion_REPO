import React from 'react';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';

const SvgViewPan = (path, extra = null) => (
  <div className="preview-table" style={{ cursor: 'row-resize' }}>
    {extra}
    <SvgFileZoomPan svgPath={path} duration={300} resize />
  </div>
);

export default SvgViewPan;
