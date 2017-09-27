import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ButtonToolbar, FormControl, Table } from 'react-bootstrap';

const renderComments = (comments, submitter = '') => {
  let commentsTbl = null;
  if (comments && Object.keys(comments).length > 0) {
    commentsTbl = Object.keys(comments).map((key, idx) => {
      const info = comments[key];
      return (
        <tr key={key}>
          <td style={{ width: '3%' }}>{idx + 1}</td>
          <td style={{ width: '13%' }}>{key}</td>
          <td style={{ width: '28%' }}>{info.origInfo}</td>
          <td style={{ width: '28%' }}>{info.comment}</td>
          <td style={{ width: '28%' }}>{info.feedback}</td>
        </tr>
      );
    });
  }

  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th width="3%">#</th>
          <th width="13%">Column</th>
          <th width="28%">Information</th>
          <th width="28%">Review Comments</th>
          <th width="28%">{submitter} Feedback</th>
        </tr>
      </thead>
      <tbody>
        {commentsTbl}
      </tbody>
    </Table>
  );
};

export default class RepoReviewModal extends React.Component {
  render() {
    const {
      show, elementId, action, onSubmit, onHide, summary, feedback, state, reviewLevel, submitter,
      comments
    } = this.props;

    const isEditable = ((reviewLevel === 3 && state === 'pending') || (reviewLevel === 2 && state === 'reviewed')) || false;

    let title = action;
    if (reviewLevel === 2 && action === 'Decline') {
      title = 'Withdraw';
    } else if (reviewLevel === 3 && action === 'Decline') {
      title = 'Reject';
    }

    if (show) {
      return (
        <div>
          <Modal
            show
            onHide={() => onHide(false)}
            bsSize="large"
            backdrop="static"
          >
            <Modal.Header closeButton>
              <Modal.Title>
                {title}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div id="div-modal-body" style={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
                {renderComments(comments, submitter)}
                <br />
                Review Summary
                <FormControl
                  componentClass="textarea"
                  style={{ height: '120px', overflow: 'auto', whiteSpace: 'pre' }}
                  defaultValue={summary || ''}
                  readOnly={!isEditable || reviewLevel === 2}
                  disabled={!isEditable || reviewLevel === 2}
                  inputRef={(m) => { this.summaryInput = m; }}
                />
                <br />
                {submitter} Summary
                <FormControl
                  componentClass="textarea"
                  style={{ height: '120px', overflow: 'auto', whiteSpace: 'pre' }}
                  defaultValue={feedback || ''}
                  readOnly={!isEditable || reviewLevel === 3}
                  disabled={!isEditable || reviewLevel === 3}
                  inputRef={(m) => { this.feedbackInput = m; }}
                />
              </div>
              <br />
              <ButtonToolbar>
                <Button
                  bsStyle="warning"
                  onClick={() => onHide(false)}
                > Close
                </Button>
                <Button
                  bsStyle="primary"
                  disabled={!isEditable}
                  onClick={() =>
                    onSubmit(
                      elementId,
                      comments,
                      this.summaryInput.value,
                      this.feedbackInput.value,
                      action
                    )
                  }
                > {title}
                </Button>
              </ButtonToolbar>
            </Modal.Body>
          </Modal>
        </div>
      );
    }
    return <div />;
  }
}

RepoReviewModal.propTypes = {
  elementId: PropTypes.number.isRequired,
  action: PropTypes.string.isRequired,
  show: PropTypes.bool.isRequired,
  comments: PropTypes.object,
  summary: PropTypes.string,
  feedback: PropTypes.string,
  state: PropTypes.string,
  reviewLevel: PropTypes.number,
  submitter: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired
};

RepoReviewModal.defaultProps = {
  show: false,
  reviewLevel: 0,
  summary: '',
  feedback: '',
  submitter: '',
  state: ''
};
