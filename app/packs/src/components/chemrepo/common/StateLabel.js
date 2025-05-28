import React from 'react';
import { Label } from 'react-bootstrap';
import RepoConst from 'src/components/chemrepo/common/RepoConst';

const StateLabel = state => {
  const stateStyle =
    {
      [RepoConst.P_STATE.REVIEWED]: 'info',
      [RepoConst.P_STATE.PENDING]: 'warning',
      [RepoConst.P_STATE.ACCEPTED]: 'success',
    }[state] || 'default';

  return <Label bsStyle={stateStyle}>{state}</Label>;
};

const StateLabelDetail = ({ state }) => {
  return (
    [
      RepoConst.P_STATE.REVIEWED,
      RepoConst.P_STATE.PENDING,
      RepoConst.P_STATE.ACCEPTED,
    ].includes(state) && StateLabel(state)
  );
};

export default StateLabel;
export { StateLabelDetail };
