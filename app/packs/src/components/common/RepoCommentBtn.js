import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { CommentComponent } from '../../libHome/RepoReviewCommon';

const RepoCommentBtn = (props) => {
  const {
    field, orgInfo, onShow, reviewLevel, review, isSubmitter
  } = props;

  const history = review?.history || [];
  const current = (history && history.slice(-1).pop()) || {};

  const hasComment = (current.comments && field in current.comments) || false;
  const comment = CommentComponent(field, history) || '';

  const isEditable = ((reviewLevel === 3 && current.state === 'pending') || (isSubmitter === true && current.state === 'reviewed')) || false;

  if (isEditable === false) {
    return <span>{comment}</span>;
  }

  return (
    <span>
      <Button
        bsStyle={hasComment ? 'success' : 'default'}
        bsSize="xsmall"
        onClick={() => onShow(true, field, orgInfo)}
      >
        <i className="fa fa-comment" />
      </Button>
      {comment}
    </span>
  );
};

RepoCommentBtn.propTypes = {
  onShow: PropTypes.func.isRequired,
  review: PropTypes.object,
  comments: PropTypes.object,
  field: PropTypes.string,
  isSubmitter: PropTypes.bool,
  orgInfo: PropTypes.string,
  state: PropTypes.string,
  reviewLevel: PropTypes.number,
  textAreaAttr: PropTypes.object
};

RepoCommentBtn.defaultProps = {
  review: {},
  comments: null,
  isSubmitter: false,
  field: '',
  orgInfo: '',
  state: '',
  reviewLevel: 0,
  submitter: ''
};

export default RepoCommentBtn;
