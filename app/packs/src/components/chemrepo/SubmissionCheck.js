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
      <Button className="btn-unified" bsSize="small" style={{ width: '100%' }} onClick={() => setShow(true)}>Show Submission Data Check Result</Button>
    );
  }

  const style = { true: { color: 'green' }, false: { color: 'red' }, default: { color: 'black' } };
  failure = failure.filter(v => !v.value).map(v =>
    (<div key={`_submission_validate_${v.name}`} style={style[v.value]}><i className={`fa fa-${v.value ? 'check' : 'times'}-circle-o`} aria-hidden="true" />&nbsp;{v.message}</div>));
  const result = (
    <div
      className="news-box"
      style={{
        width: '100%', fontSize: 'unset', margin: 'unset', borderRadius: '5px'
      }}
    >
      <h4>Submission Data Check Result</h4>
      {failure}
    </div>
  );

  return result;
};

SubmissionCheck.propTypes = {
  validates: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.bool,
    message: PropTypes.string,
  })).isRequired,
};

export default SubmissionCheck;
