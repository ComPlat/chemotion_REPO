/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';

const SvgPath = (svg, type) => {
  if (svg && svg !== '***') {
    return type === 'Reaction'
      ? `/images/reactions/${svg}`
      : `/images/samples/${svg}`;
  }
  return 'images/wild_card/no_image_180.svg';
};

function SVGView({ svg, type, className }) {
  return <SVG src={SvgPath(svg, type)} className={className} key={svg} />;
}

SVGView.propTypes = {
  className: PropTypes.string.isRequired,
  svg: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

export default SVGView;
