import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';
import { startsWith } from 'lodash';

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

const CommentComponent = (comment, title, feedback, feedbackTitle) => {
  const reviewer = (comment ?
    (
      <Alert bsStyle="danger" style={{ marginBottom: 'unset' }}>
        <strong>{title}</strong>
        <br />
        <div style={{ whiteSpace: 'pre-wrap' }}>{comment}</div>
      </Alert>
    )
    :
      <div />
  );
  const submitter = (feedback ?
    (
      <Alert bsStyle="warning" style={{ marginBottom: 'unset' }}>
        <strong>{feedbackTitle}</strong>
        <br />
        <div style={{ whiteSpace: 'pre-wrap' }}>{feedback}</div>
      </Alert>
    )
    :
      <div />
  );
  return (
    <span>
      {reviewer}
      {submitter}
    </span>
  );
};

const CommentDisplay = ({ elReview, commentKey }) => {
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
        return CommentComponent(elReview.summary, 'Review Summary', elReview.feedback, 'Submitter Summary');
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
          CommentComponent(
            elReview.comments[commentKey].comment, `Review Comment on ${commentKey}`,
            elReview.comments[commentKey].feedback, `Feedback on ${commentKey}`
          ) : <div />;
      default:
        return <div />;
    }
  }
  return <div />;
};

CommentDisplay.propTypes = {
  elReview: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  commentKey: PropTypes.string.isRequired
};

CommentDisplay.defaultProps = {
  elReview: null
};

export {
  AffiliationMap,
  CommentComponent,
  CommentDisplay
};
