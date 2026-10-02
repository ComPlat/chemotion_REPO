import React, { useState } from 'react';
import { Card, Collapse } from 'react-bootstrap';
import { ToggleIndicator } from 'src/repo/repoHome/RepoCommon';
import { MARegisteredTooltip } from 'src/repo/chemrepo/ma/MAComs';
import { MADataModal, MARequestModal } from 'src/repo/chemrepo/ma/MAModals';

const MAPanel = (_props) => {
  const {
    allowRequest, compNum, elementId, isEditable, isLogin, data, saveCallback, xvialCom
  } = _props;
  const [expanded, setExpanded] = useState(true);

  const hasData = !!(data && data !== '');
  if (!isLogin && !hasData) return null;
  if (isLogin && !hasData && !isEditable) return null;
  const information = allowRequest && hasData ? <MARegisteredTooltip /> : null;

  return (
    <>
      <span>
        <ToggleIndicator onClick={() => setExpanded(!expanded)} name="Material" indicatorStyle={expanded ? 'down' : 'right'} />
        {information}&nbsp;
        <MADataModal isEditable={isEditable} data={data} elementId={elementId} saveCallback={saveCallback} xvialCom={xvialCom} />
      </span>
      <Card style={{ border: 'none' }} id="collapsible-panel-ma-panel">
        <Collapse in={expanded}>
          <Card.Body style={{ backgroundColor: '#f5f5f5', padding: '4' }}>
            <b>Sample Registration Number in Molecule Archive:</b> {compNum} <br />
            <b>Request a sample:</b> <MARequestModal allowRequest={allowRequest} data={data} elementId={elementId} isLogin={isLogin} />
          </Card.Body>
        </Collapse>
      </Card>
    </>
  );
};

export default MAPanel;
