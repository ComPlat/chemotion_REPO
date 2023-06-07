import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export const MALinkButton = () => (
  <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip_ma_link">Go to Molecule Archive</Tooltip>}>
    <Button bsStyle="link" bsSize="xsmall" onClick={() => { window.open('https://compound-platform.eu/home', '_blank'); }}>has a record as physically available material</Button>
  </OverlayTrigger>
);

const registedCompoundTooltip = (
  <div className="repo-xvial-info">
    For availability please use the below (<span className="env"><i className="fa fa-envelope-o" aria-hidden="true" /></span>) to contact the Compound Platform team. An explanation can be accessed via our Youtube channel&nbsp;
    <a rel="noopener noreferrer" target="_blank" href="https://www.youtube.com/channel/UCWBwk4ZSXwmDzFo_ZieBcAw?"><i className="fa fa-youtube-play youtube" /></a>
    &nbsp;or on our how-to pages
    <a rel="noopener noreferrer" target="_blank" href="https://www.chemotion-repository.net/home/howto/cf3ede44-b09a-400a-b0d4-b067735e4262"><img alt="chemotion_first" src="/favicon.ico" className="pubchem-logo" /></a>
  </div>
);

export const MARegisteredTooltip = () => (
  <OverlayTrigger trigger="click" rootClose placement="top" overlay={<Tooltip id="registed_compound_tooltip" className="left_tooltip bs_tooltip">{registedCompoundTooltip}</Tooltip>}>
    <a rel="noopener noreferrer"><i className="fa fa-info-circle" aria-hidden="true" /></a>
  </OverlayTrigger>
);
