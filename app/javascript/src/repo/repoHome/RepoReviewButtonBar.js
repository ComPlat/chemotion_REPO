import React from 'react';
import {
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import RepoMetadataModal from 'src/repo/chemrepo/common/RepoMetadataModal';
import RepoReviewAuthorsModal from 'src/repo/chemrepo/common/RepoReviewAuthorsModal';
import RepoUserLabelModal from 'src/repo/chemrepo/common/RepoUserLabelModal';

const showButton = (btn, func, pubState, review_info) => {
  let title = btn;
  let btnBsStyle = '';
  let btnIcon = '';
  let btnTooltip = '';

  switch (btn) {
    case 'Accept':
      btnBsStyle = 'primary';
      btnIcon = 'fa fa-paper-plane';
      btnTooltip = 'Accept publication';
      break;
    case 'Approve':
      btnBsStyle = 'primary';
      btnIcon = 'fa fa-paper-plane';
      btnTooltip = 'Accept publication by group leader';
      break;
    case 'Review':
      btnBsStyle = 'info';
      btnIcon = 'fa fa-exchange';
      btnTooltip = 'Review publication, modification required for submitter';
      break;
    case 'Submit':
      btnBsStyle = 'info';
      btnIcon = 'fa fa-play';
      btnTooltip = 'Submit for publication';
      break;
    case 'Decline':
      btnBsStyle = 'outline-dark';
      btnIcon = 'fa fa-eject';
      if (review_info?.review_level === 2) {
        btnTooltip = 'Withdraw publication';
        title = 'Withdraw';
      } else if (review_info?.review_level === 3) {
        btnTooltip = 'Reject publication';
        title = 'Reject';
      }
      break;
    case 'Revert':
      btnBsStyle = 'outline-dark';
      btnIcon = 'fa fa-undo';
      btnTooltip = 'Revert publication from Accepted to Pending state';
      break;
    default:
      break;
  }

  const isReviewer = review_info?.review_level === 3;
  const isSubmitter = review_info?.submitter === true;
  const isGroupLeader = review_info?.groupleader === true && review_info?.preapproved !== true;

  let shouldShow = false;
  if (isGroupLeader) {
    shouldShow = pubState === 'pending' && btn !== 'Submit' && btn !== 'Revert' && btn !== 'Accept' && btn !== 'Decline';
  } else if (isReviewer) {
    shouldShow = (pubState === 'pending' && (btn === 'Decline' || btn === 'Review' || btn === 'Accept'))
      || (pubState === 'accepted' && btn === 'Revert');
  } else if (isSubmitter) {
    shouldShow = pubState === 'reviewed' && (btn === 'Submit' || btn === 'Decline');
  }

  return shouldShow ? (
    <OverlayTrigger
      key={`ot_${title}`}
      placement="top"
      overlay={<Tooltip id={btn}>{btnTooltip}</Tooltip>}
    >
      <Button
        variant={btnBsStyle}
        size="xsm"
        onClick={() => func(true, btn)}
      >
        <i className={btnIcon} />&nbsp;{title}
      </Button>
    </OverlayTrigger>
  ) : null;
};

const showCommentButton = (btn, func, currComment) => {
  const hasComments = (currComment && currComment.comment && currComment.comment.length > 0) || false;
  return (
    <OverlayTrigger
      key="ot_comments"
      placement="top"
      overlay={<Tooltip id="showComments">Show/Add Comments</Tooltip>}
    >
      <Button
        variant={hasComments ? 'success' : 'outline-dark'}
        size="xsm"
        onClick={() => func(true, btn)}
      >
        <i className="fa fa-comments" />&nbsp;
        Comments
      </Button>
    </OverlayTrigger>
  );
};

function RepoReviewButtonBar(props) {
  let authorModel = '';

  if (props?.review_info?.groupleader !== true) {
    authorModel = (
      <RepoReviewAuthorsModal
        element={props.element}
        isEmbargo={false}
        leaders={props.review_info?.leaders || []}
        schemeOnly={props.schemeOnly}
        taggData={props.taggData}
      />
    );
  }

  return (<ButtonToolbar className="d-flex gap-2" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
      {
        props.showComment === true && props.buttons.filter(b => b === 'Comments').map(b =>
          showCommentButton(b, props.buttonFunc, (props.currComment)))
      }
      {
        props.showComment === true && props.buttons.filter(b => b !== 'Comments').map(b =>
          showButton(b, props.buttonFunc, props.pubState, props.review_info))
      }
      {props.canClose === true && authorModel}
      <RepoMetadataModal
        elementId={props.element.id}
        elementType={props.element.elementType.toLowerCase()}
      />
      {props.canClose === true && <RepoUserLabelModal element={props.element} />}
    </ButtonToolbar>)
};

RepoReviewButtonBar.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number,
    elementType: PropTypes.string,
    user_labels: PropTypes.arrayOf(PropTypes.number)
  }).isRequired,
  buttons: PropTypes.arrayOf(PropTypes.string),
  buttonFunc: PropTypes.func,
  review_info: PropTypes.object,
  showComment: PropTypes.bool,
  canClose: PropTypes.bool,
  schemeOnly: PropTypes.bool,
  pubState: PropTypes.string,
  currComment: PropTypes.object,
  taggData: PropTypes.object
};


RepoReviewButtonBar.defaultProps = {
  buttons: ['Decline', 'Comments', 'Review', 'Submit', 'Accept', 'Revert'],
  buttonFunc: () => { },
  review_info: {},
  showComment: true,
  schemeOnly: false,
  pubState: '',
  currComment: {},
  taggData: {},
};

export default RepoReviewButtonBar;
