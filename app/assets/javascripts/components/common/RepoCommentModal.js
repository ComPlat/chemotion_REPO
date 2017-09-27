import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ButtonToolbar, FormControl } from 'react-bootstrap';

export default class RepoCommentModal extends React.Component {
  render() {
    const {
      elementId, elementType, show, onHide, onUpdate, field, orgInfo,
      commentObj, textAreaAttrs, state, reviewLevel
    } = this.props;

    const defaultAttrs = {
      style: {
        height: '100px', overflow: 'auto', whiteSpace: 'pre'
      }
    };
    let comment = '';
    if (typeof (commentObj) !== 'undefined') {
      if (reviewLevel === 2) {
        comment = commentObj.feedback;
      } else {
        comment = commentObj.comment;
      }
    }

    const isEditable = ((reviewLevel === 3 && state === 'pending') || (reviewLevel === 2 && state === 'reviewed')) || false;
    if (show) {
      return (
        <div>
          <Modal
            show
            onHide={() => onHide(false, field)}
            bsSize="large"
            backdrop="static"
          >
            <Modal.Header closeButton>
              <Modal.Title>
                Comment on: {field}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {orgInfo}
              <br />
              <FormControl
                componentClass="textarea"
                {...textAreaAttrs || defaultAttrs}
                defaultValue={comment || ''}
                inputRef={(m) => { this.commentInput = m; }}
              />
              <ButtonToolbar>
                <Button
                  onClick={() => onHide(false)}
                > Close
                </Button>
                <Button
                  bsStyle="primary"
                  disabled={!isEditable}
                  onClick={() =>
                    onUpdate(elementId, elementType, field, this.commentInput.value, orgInfo, true)}
                >
                  Update
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

RepoCommentModal.propTypes = {
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired,
  show: PropTypes.bool,
  field: PropTypes.string,
  commentObj: PropTypes.object,
  orgInfo: PropTypes.string,
  state: PropTypes.string,
  reviewLevel: PropTypes.number,
  submitter: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired
};

RepoCommentModal.defaultProps = {
  show: false,
  reviewLevel: 0,
  submitter: '',
  field: '',
  orgInfo: '',
  state: ''
};
