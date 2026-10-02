import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';

const CollectionLabel = (props) => {
  const { label } = props;

  if (typeof (label) === 'string' && (label.startsWith('Reviewing') || label.startsWith('Element To Review') || label.startsWith('Reviewed'))) {
    const ls = label.split(',');
    if (ls.length >= 3) {
      const sicon = ls[1].substr(1) === '0' ? '' : <i className="icon-sample"> {ls[1].substr(1)} &nbsp; </i>;
      const ricon = ls[2].substr(1) === '0' ? '' : <i className="icon-reaction"> {ls[2].substr(1)} &nbsp;  </i>;
      return label.startsWith('Reviewing') ?
        (
          <span className="tree-view_title" style={{ color: 'red' }}>
            {ls[0]} &nbsp; {sicon} {ricon}
          </span>
        ) :
        (
          <span className="tree-view_title">
            {ls[0]} &nbsp; {sicon} {ricon}
          </span>
        );
    }
  }
  return (<span className="tree-view_title">{label}</span>);
}

const CollectionDesc = (props) => {
  let { label } = props;
  if (typeof label !== 'string') return null;
  if (label.match(/Reviewing/)) {
    label = 'Reviewing';
  } else if (label.match(/Element To Review/)) {
    label = 'Element To Review';
  } else if (label.match(/Reviewed/)) {
    label = 'Reviewed';
  }

  const descs = {
    Chemotion: 'Collection of all the samples and reactions, with analytical datasets, published on the Chemotion-Repository.',
    'Scheme-only reactions': 'Collections of published scheme-only reactions (no associated analytical data).',
    'My Published Elements': 'Collection of the published samples and reactions you submitted. The samples/reactions that were embargoed are placed in sub-folders.',
    'Pending Publications': 'Collection of the samples and reactions you have submitted and are currently being reviewed.',
    'New Versions': 'Collection of samples and reactions which are new versions of already published elements before resubmission.',
    Reviewing: 'Collection of the samples and reactions that have been reviewed by a reviewer and needs revision from your side.',
    'Element To Review': 'Collection of the samples and reactions that currently have to be reviewed.',
    'Embargo Accepted': 'Collection of the samples and reactions that have been accepted under embargo.',
    Reviewed: 'Collection of the samples and reactions that were reviewed and sent back to the submitters for revision/corrections (Read-Only). Waiting for resubmission.',
    'Embargoed Publications': 'Collection under an embargo: the collection can only be released and its elements made public after all its elements have been accepted by a reviewer.'
  };
  const desc = descs[label];
  if (desc === undefined) return null;
  return (
    <div style={{ float: 'right' }}>
      <OverlayTrigger placement="right" overlay={<Tooltip id={uuid.v4()}>{desc}</Tooltip>}>
        <i className="fa fa-info-circle" />
      </OverlayTrigger>
    </div>
  );
};

export { CollectionLabel, CollectionDesc };
