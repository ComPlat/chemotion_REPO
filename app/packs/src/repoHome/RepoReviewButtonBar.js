import React from 'react';
import {
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import RepoMetadataModal from 'src/components/chemrepo/common/RepoMetadataModal';
import RepoReviewAuthorsModal from 'src/components/chemrepo/common/RepoReviewAuthorsModal';

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
      btnBsStyle = 'default';
      btnIcon = 'fa fa-eject';
      if (review_info?.review_level === 2) {
        btnTooltip = 'Withdraw publication';
        title = 'Withdraw';
      } else if (review_info?.review_level === 3) {
        btnTooltip = 'Reject publication';
        title = 'Reject';
      }
      break;
    default:
      break;
  }
  return ((review_info?.review_level === 3 && pubState === 'pending' && btn !== 'Submit') ||
  (pubState === 'pending' && btn !== 'Submit' && review_info?.preapproved !== true && btn !== 'Accept' && btn !== 'Decline' && review_info?.groupleader === true) ||
  (review_info?.submitter === true && pubState === 'reviewed' && (btn === 'Submit' || btn === 'Decline'))) ? (
    <OverlayTrigger
      key={`ot_${title}`}
      placement="top"
      overlay={<Tooltip id={btn}>{btnTooltip}</Tooltip>}
    >
      <Button
        bsStyle={btnBsStyle}
        onClick={() => func(true, btn)}
      >
        <i className={btnIcon} />&nbsp;{title}
      </Button>
    </OverlayTrigger>
  ) : <span key={`span_${title}`} />;
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
        bsStyle={hasComments ? 'success' : 'default'}
        onClick={() => func(true, btn)}
      >
        <i className="fa fa-comments" />&nbsp;
        Comments
      </Button>
    </OverlayTrigger>
  );
};

const RepoReviewButtonBar = props =>
  (
    <ButtonToolbar>
      {
        props.showComment === true && props.buttons.filter(b => b === 'Comments').map(b =>
          showCommentButton(b, props.buttonFunc, (props.currComment)))
      }
      {
        props.showComment === true && props.buttons.filter(b => b !== 'Comments').map(b =>
          showButton(b, props.buttonFunc, props.currComment.state, props.review_info))
      }
      <RepoMetadataModal
        elementId={props.element.id}
        elementType={props.element.elementType.toLowerCase()}
      />
      <RepoReviewAuthorsModal element={props.element} review_info={props.review_info} schemeOnly={props.schemeOnly} taggData={props.taggData} />
    </ButtonToolbar>
  );

RepoReviewButtonBar.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number,
    elementType: PropTypes.string
  }).isRequired,
  buttons: PropTypes.arrayOf(PropTypes.string),
  buttonFunc: PropTypes.func,
  review_info: PropTypes.object,
  showComment: PropTypes.bool,
  schemeOnly: PropTypes.bool,
  currComment: PropTypes.object,
  taggData: PropTypes.object
};


RepoReviewButtonBar.defaultProps = {
  buttons: ['Decline', 'Comments', 'Review', 'Submit', 'Accept'],
  buttonFunc: () => { },
  review_info: {},
  showComment: true,
  schemeOnly: false,
  currComment: {},
  taggData: {}
};

export default RepoReviewButtonBar;
