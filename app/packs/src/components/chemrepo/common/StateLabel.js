import React from 'react';
import { Label } from 'react-bootstrap';
import RepoConst from 'src/components/chemrepo/common/RepoConst';

function StateLabel(state) {
  const stateStyle =
    {
      [RepoConst.P_STATE.REVIEWED]: 'info',
      [RepoConst.P_STATE.PENDING]: 'warning',
      [RepoConst.P_STATE.ACCEPTED]: 'success',
    }[state] || 'default';

  return <Label bsStyle={stateStyle}>{state}</Label>;
}

export default StateLabel;
