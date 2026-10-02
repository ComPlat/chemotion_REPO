import React, { useState } from 'react';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';

function RepoSvgZoomHandler({ svg }) {
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);

  const handleToggleZoom = () => {
    setIsZoomEnabled(prevState => !prevState); // Toggle the zoom state
  };

  return (
    <div
      role="presentation"
      onClick={handleToggleZoom}
      className={isZoomEnabled ? 'zoom_svg_on' : 'zoom_svg_off'}
    >
      <div>
        <SvgFileZoomPan svg={svg} duration={300} resize />
      </div>
      <p>
        {isZoomEnabled ? 'Click to disable zooming' : 'Click to enable zooming'}
      </p>
    </div>
  );
}

export default RepoSvgZoomHandler;
