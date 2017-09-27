import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';
import { startsWith } from 'lodash';
import moment from 'moment';
import RepoReviewTimeFormat from '../components/common/RepoReviewTimeFormat';

const AffiliationMap = (affiliationIds) => {
  const aId = [].concat.apply([], affiliationIds);
  const affiliationMap = {};
  let aCount = 0;
  aId.map((e) => {
    if (!affiliationMap[e]) {
      aCount += 1;
      affiliationMap[e] = aCount;
    }
  });
  return affiliationMap;
};

const CommentComponent = (field, history) => {
  const submitHis = history.filter(h => h.type === 'submit' && h.comments && h.comments[`${field}`] && h.comments[`${field}`].comment !== '');
  const reviewHis = history.filter(h => h.type === 'reviewed' && h.comments && h.comments[`${field}`] && h.comments[`${field}`].comment !== '');

  const current = (submitHis.length > 0) ? submitHis.pop() : null;
  const previous = (reviewHis.length > 0) ? reviewHis.pop() : null;
  const submitField = (current && current.comments && current.comments[`${field}`]) || {};
  const reviewField = (previous && previous.comments && previous.comments[`${field}`]) || {};

  let keep = true;
  let submitFieldTime = null;
  let reviewFieldTime = null;
  if (current && previous) {
    if (moment(submitField.timestamp, 'DD-MM-YYYY HH:mm:ss').isValid()) {
      submitFieldTime = moment(submitField.timestamp, 'DD-MM-YYYY HH:mm:ss');
    } else {
      submitFieldTime = new Date(submitField.timestamp);
    }

    if (moment(submitField.timestamp, 'DD-MM-YYYY HH:mm:ss').isValid()) {
      reviewFieldTime = moment(reviewField.timestamp, 'DD-MM-YYYY HH:mm:ss');
    } else {
      reviewFieldTime = new Date(reviewField.timestamp);
    }
    keep = reviewFieldTime > submitFieldTime;
  }

  const submitTbl = (current ?
    (
      <Alert bsStyle="danger" style={{ marginBottom: 'unset' }}>
        <strong>{submitField.username} ({RepoReviewTimeFormat(submitField.timestamp)})</strong>
        <br />
        <div style={{ whiteSpace: 'pre-wrap' }}>{submitField.comment}</div>
      </Alert>
    )
    :
      <div />
  );
  const reviewTbl = (previous ?
    (
      <Alert bsStyle="warning" style={{ marginBottom: 'unset' }}>
        <strong>{reviewField.username} ({RepoReviewTimeFormat(reviewField.timestamp)})</strong>
        <br />
        <div style={{ whiteSpace: 'pre-wrap' }}>{reviewField.comment}</div>
      </Alert>
    )
    :
      <div />
  );

  const tbl = keep ? (<span>{reviewTbl}{submitTbl}</span>) : (<span>{submitTbl}{reviewTbl}</span>);
  return tbl;
};

const CommentDisplay = ({ elReview, commentKey, history }) => {
  let objectKey = commentKey;
  if (startsWith(commentKey, 'Reaction_Analysis_')) {
    objectKey = 'Reaction Analysis';
  } else if (startsWith(commentKey, 'Product_Analysis_')) {
    objectKey = 'Product Analysis';
  } else if (startsWith(commentKey, 'Analysis_')) {
    objectKey = 'Analysis';
  }

  if (elReview) {
    switch (objectKey) {
      case 'Summary':
        return CommentComponent(elReview.comment, 'Review Summary', null);
      case 'Reference':
      case 'Reaction Table':
      case 'Description':
      case 'Additional information':
      case 'Properties':
      case 'TLC-Control':
      case 'Reaction Analysis':
      case 'Product Analysis':
      case 'Analysis':
        return (elReview.comments && elReview.comments[commentKey]) ?
          CommentComponent(objectKey, history) : <div />;
      default:
        return <div />;
    }
  }
  return <div />;
};

CommentDisplay.propTypes = {
  elReview: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  commentKey: PropTypes.string.isRequired,
  history: PropTypes.array
};

CommentDisplay.defaultProps = {
  elReview: null,
  history: []
};

export {
  AffiliationMap,
  CommentComponent,
  CommentDisplay
};
