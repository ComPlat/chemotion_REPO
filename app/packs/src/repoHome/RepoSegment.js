import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { LayerPlain } from 'chem-generic-ui-viewer';
import { ToggleIndicator } from 'src/repoHome/RepoCommon';

const listSegment = props => {
  const [toggle, setToggle] = useState(true);
  const data = toggle ? (
    <LayerPlain
      layers={props.properties.layers}
      options={props.properties.select_options || {}}
      id={props.idx}
      isPublic={props.isPublic}
    />
  ) : (
    <div />
  );
  return (
    <span key={`_repo_sample_sg.id_${props.id}`}>
      <ToggleIndicator
        onClick={() => setToggle(!toggle)}
        name={props.klass_label}
        indicatorStyle={toggle ? 'down' : 'right'}
      />
      {data}
    </span>
  );
};

function RepoSegment(props) {
  const { segments, isPublic } = props;
  if (segments.length < 1) return null;
  return (
    <div className="generic_segments_repo">
      {segments.map((s, idx) => listSegment({ ...s, idx, isPublic }))}
    </div>
  );
}

RepoSegment.propTypes = {
  segments: PropTypes.oneOfType([PropTypes.array]),
  isPublic: PropTypes.bool,
};
RepoSegment.defaultProps = { segments: [], isPublic: false };

export default RepoSegment;
