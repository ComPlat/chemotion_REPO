import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { CommentComponent } from '../../libHome/RepoReviewCommon';

const RepoCommentBtn = (props) => {
  const {
    field, orgInfo, onShow, comments, submitter, reviewLevel, state
  } = props;

  const hasComment = field in comments;
  let comment = (comments && comments[field]) ? CommentComponent(comments[field].comment, 'Reviewer: ', comments[field].feedback, `${submitter}: `) : <div />;

  if (hasComment === false) {
    comment = '';
  }
  const isEditable = ((reviewLevel === 3 && state === 'pending') || (reviewLevel === 2 && state === 'reviewed')) || false;

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
  comments: PropTypes.object,
  field: PropTypes.string,
  orgInfo: PropTypes.string,
  state: PropTypes.string,
  reviewLevel: PropTypes.number,
  submitter: PropTypes.string,
  textAreaAttr: PropTypes.object
};

RepoCommentBtn.defaultProps = {
  comments: null,
  field: '',
  orgInfo: '',
  state: '',
  reviewLevel: 0,
  submitter: ''
};

export default RepoCommentBtn;
