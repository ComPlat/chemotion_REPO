import React from 'react';
import {
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import RepoMetadataModal from '../components/common/RepoMetadataModal';

const showButton = (btn, func, reviewLevel, pubState) => {
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
    case 'Review':
      btnBsStyle = 'info';
      btnIcon = 'fa fa-exchange';
      btnTooltip = 'Review publication, modification required for submittor';
      break;
    case 'Submit':
      btnBsStyle = 'info';
      btnIcon = 'fa fa-play';
      btnTooltip = 'Submit for publication';
      break;
    case 'Decline':
      btnBsStyle = 'default';
      btnIcon = 'fa fa-eject';
      if (reviewLevel === 2) {
        btnTooltip = 'Withdraw publication';
        title = 'Withdraw';
      } else if (reviewLevel === 3) {
        btnTooltip = 'Reject publication';
        title = 'Reject';
      }
      break;
    default:
      break;
  }
  return ((reviewLevel === 3 && pubState === 'pending' && btn !== 'Submit') || (reviewLevel === 2 && pubState === 'reviewed' && (btn === 'Submit' || btn === 'Decline'))) ? (
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

const showCommentButton = (btn, func, comments, summary, feedback) => {
  let hasComments = false;
  if (Object.keys(comments).length > 0
    || (summary && summary.length > 0)
    || (feedback && feedback.length > 0)) {
    hasComments = true;
  }
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
        props.buttons.filter(b => b === 'Comments').map(b =>
          showCommentButton(b, props.buttonFunc, props.comments, props.summary, props.feedback))
      }
      {
        props.buttons.filter(b => b !== 'Comments').map(b =>
          showButton(b, props.buttonFunc, props.reviewLevel, props.pubState))
      }
      <RepoMetadataModal
        elementId={props.element.id}
        elementType={props.element.elementType.toLowerCase()}
      />
    </ButtonToolbar>
  );

RepoReviewButtonBar.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number,
    elementType: PropTypes.string
  }).isRequired,
  buttons: PropTypes.arrayOf(PropTypes.string),
  buttonFunc: PropTypes.func,
  reviewLevel: PropTypes.number,
  pubState: PropTypes.string,
  comments: PropTypes.object,
  summary: PropTypes.string,
  feedback: PropTypes.string
};


RepoReviewButtonBar.defaultProps = {
  buttons: ['Decline', 'Comments', 'Review', 'Submit', 'Accept'],
  buttonFunc: () => { },
  reviewLevel: 0,
  pubState: '',
  comments: {},
  summary: '',
  feedback: ''
};

export default RepoReviewButtonBar;
