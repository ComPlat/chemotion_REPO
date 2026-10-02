import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export const MALinkButton = () => (
  <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip_ma_link">Go to Molecule Archive</Tooltip>}>
    <Button variant="link" size="sm" onClick={() => { window.open('https://compound-platform.eu/home', '_blank'); }}>has a record as physically available material</Button>
  </OverlayTrigger>
);

const registedCompoundTooltip = (
  <div className="repo-xvial-info">
    For availability please use the below (<span className="env"><i className="fa fa-envelope-o" aria-hidden="true" /></span>) to contact the Compound Platform team.
  </div>
);

export const MARegisteredTooltip = () => (
  <OverlayTrigger trigger={['hover', 'focus']} rootClose placement="top" overlay={<Tooltip id="registed_compound_tooltip" className="left_tooltip bs_tooltip">{registedCompoundTooltip}</Tooltip>}>
    <span className="btn m-0 me-1 text-primary bg-white py-0 px-2"><i className="fa fa-info-circle" aria-hidden="true" /></span>
  </OverlayTrigger>
);
