/* eslint-disable react/forbid-prop-types */
import React from 'react';
import SVG from 'react-inlinesvg';
import { Popover, OverlayTrigger } from 'react-bootstrap';

const xvialTag = (element, hasXvial = null) => {
  const hasX = hasXvial || (element.xvial_count && element.xvial_count > 0);
  let hasXCom = hasX && (element.xvial_com && element.xvial_com !== 0);
  if (element.xvial_com === -1 || element.xvial_com === -2) {
    hasXCom = hasX;
  } else {
    hasXCom = (element.xvial_com > 0);
  }
  if (!hasX && !hasXCom) return (<span className="xvial-span xvial" style={{ border: 'unset', backgroundColor: 'unset' }}>-</span>);
  return (<span className={`xvial-span ${hasX ? 'xvial' : ''} ${hasXCom ? 'xvial-com' : ''}`}><i className="icon-xvial" /></span>);
};

const svgTag = (path, klassName, isPop, popW = '26vw') => {
  const popHover = (
    <Popover id="repo-pub-popover-svg" style={{ maxWidth: 'none', maxHeight: 'none' }}>
      <img src={path} alt="" style={{ height: '26vh', width: `${popW}` }} />
    </Popover>
  );
  return isPop ? (
    <OverlayTrigger trigger={['hover', 'focus']} placement="right" rootClose onHide={null} overlay={popHover}>
      <div><SVG src={path} className={`layout_svg_${klassName}`} key={path} /></div>
    </OverlayTrigger>
  ) : <SVG src={path} className={`layout_svg_${klassName}`} key={path} />;
};

export { xvialTag, svgTag };
