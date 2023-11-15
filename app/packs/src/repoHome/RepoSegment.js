import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { LayerPlain } from 'chem-generic-ui-viewer';
import { ToggleIndicator } from 'src/repoHome/RepoCommon';

const listSegment = (props) => {
  const [toggle, setToggle] = useState(true);
  return (
    <span key={`_repo_sample_sg.id_${props.id}`}>
      <ToggleIndicator onClick={() => setToggle(!toggle)} name={props.klass_label} indicatorStyle={toggle ? 'down' : 'right'} />
      {
        toggle ?
          <LayerPlain
            layers={props.properties.layers}
            options={props.properties.select_options || {}}
            id={props.idx}
          /> : <div />
      }
    </span>
  );
};

const RepoSegment = (props) => {
  const { segments } = props;
  if (segments.length < 1) return null;
  return <div className="generic_segments_repo">{segments.map((s, idx) => listSegment({ ...s, idx }))}</div>;
};

RepoSegment.propTypes = { segments: PropTypes.oneOfType([PropTypes.array]) };
RepoSegment.defaultProps = { segments: [] };

export default RepoSegment;
