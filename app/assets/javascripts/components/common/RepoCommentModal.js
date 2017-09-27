import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ButtonToolbar, FormControl } from 'react-bootstrap';
import Draggable from 'react-draggable';
import RepoColumnHis from './RepoColumnHis';

export default class RepoCommentModal extends React.Component {
  render() {
    const {
      elementId, elementType, show, onHide, onUpdate, field, orgInfo,
      history, textAreaAttrs, reviewLevel
    } = this.props;

    const current = (history && history.length > 0 && history.slice(-1).pop()) || {};
    const comment = (current && current.comments && current.comments[`${field}`] && current.comments[`${field}`].comment) || '';

    const defaultAttrs = {
      style: {
        height: '100px', overflow: 'auto', whiteSpace: 'pre'
      }
    };

    const isEditable = ((reviewLevel === 3 && current.state === 'pending') || (reviewLevel === 2 && current.state === 'reviewed')) || false;
    if (show) {
      return (
        <div>
          <Draggable>
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
                <RepoColumnHis history={history} field={field} />
                <br />
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
          </Draggable>
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
  history: PropTypes.array,
  orgInfo: PropTypes.string,
  reviewLevel: PropTypes.number,
  onUpdate: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired
};

RepoCommentModal.defaultProps = {
  show: false,
  history: [],
  reviewLevel: 0,
  field: '',
  orgInfo: '',
};
