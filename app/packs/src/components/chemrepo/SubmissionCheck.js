/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

const SubmissionCheck = (props) => {
  const { validates } = props;
  if (!validates) return null;

  let failure = validates.filter(v => !v.value);
  if (!failure || failure.length < 1) return null;

  const [show, setShow] = useState(true);

  if (!show) {
    return (
      <Button style={{ width: '100%' }} bsSize="small" onClick={() => setShow(true)}>Show Submission Check Result</Button>
    );
  }

  const style = { true: { color: 'green' }, false: { color: 'red' }, default: { color: 'black' } };
  const success = validates.filter(v => v.value).map(v => (
    <div key={`_submission_validate_${v.name}`}><span style={style[v.value]}><i className={`fa fa-${v.value ? 'check' : 'times'}-circle-o`} aria-hidden="true" /></span>&nbsp;{v.message}</div>
  ));
  failure = failure.filter(v => !v.value).map(v => (
    <div key={`_submission_validate_${v.name}`} style={style[v.value]}><i className={`fa fa-${v.value ? 'check' : 'times'}-circle-o`} aria-hidden="true" />&nbsp;{v.message}</div>
  ));
  let result = validates.map(v => (
    <div key={`_submission_validate_${v.name}`} style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}><span style={style.default}>{v.name}</span></div>
      <div style={{ flex: 1 }}>{v.value ? <span style={style[v.value]}><i className={`fa fa-${v.value ? 'check' : 'times'}-circle-o`} aria-hidden="true" /></span> : ' '}</div>
      <div style={{ flex: 1 }}>{v.value ? ' ' : <span style={style[v.value]}><i className={`fa fa-${v.value ? 'check' : 'times'}-circle-o`} aria-hidden="true" /></span>}</div>
      <div style={{ flex: 3 }}>{v.value ? ' ' : <span style={style[v.value]}>{v.message}</span>}</div>
    </div>
  ));
  result = (
    <div className="news-box" style={{ width: '100%', fontSize: 'unset', margin: 'unset', borderRadius: '5px' }}>
      <Button style={{ float: 'right' }} bsSize="small" onClick={() => setShow(false)}>Hide Submission Check Result</Button>
      {failure}
    </div>
  );
  // const result = (
  //   <>
  //     <h3>Submission Check</h3>
  //     <div style={{ display: 'flex' }}>
  //       <div style={{ flex: 1 }}>{success}</div>
  //       <div style={{ flex: 1 }}>{failure}</div>
  //     </div>
  //   </>
  // );

  return result;
};

SubmissionCheck.propTypes = {
  validates: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.string,
    message: PropTypes.string,
  })).isRequired,
};

export default SubmissionCheck;
