import React from 'react';
import RepoSvgZoomHandler from 'src/components/chemrepo/common/RepoSvgZoomHandler';

const zoomSvg = (path, extra = null) => (
  <div>
    {extra}
    <RepoSvgZoomHandler svg={path} />
  </div>
);

export default zoomSvg;
