/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import {
  Modal,
  Button,
  ButtonToolbar,
  Table,
  Label,
  FormControl,
} from 'react-bootstrap';

export default class EmbargoCommentsModal extends React.Component {
  constructor(props) {
    super(props);
    this.onSave = this.onSave.bind(this);
  }

  componentDidMount() {}

  onSave(comment) {
    this.props.onSaveFn(comment);
  }

  render() {
    const { showModal, selectEmbargo, onCloseFn } = this.props;
    const review = selectEmbargo?.review || {};
    const label = selectEmbargo?.taggable_data?.label || '';
    const history = review?.history || [];
    const historyTbl = history.map((his, idx) => {
      if (idx === history.length - 1) return <div />;
      return (
        <tr key={uuid.v4()}>
          <td style={{ width: '5%' }}>{idx + 1}</td>
          <td style={{ width: '12%' }}>{his.timestamp}</td>
          <td style={{ width: '48%' }}>{his.comment}</td>
          <td style={{ width: '10%' }}>{his.username}</td>
        </tr>
      );
    });
    return (
      <span>
        <Modal show={showModal} onHide={onCloseFn} bsSize="large">
          <Modal.Header closeButton>
            <Modal.Title>
              <h4>
                <Label>{label}</Label>
              </h4>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ height: '50vh', overflow: 'auto' }}>
            <div>
              <div>
                <Table striped bordered>
                  <thead>
                    <tr>
                      <th width="5%">#</th>
                      <th width="12%">Date</th>
                      <th width="48%">Comment</th>
                      <th width="10%">From User</th>
                    </tr>
                  </thead>
                  <tbody key={uuid.v4()}>{historyTbl}</tbody>
                </Table>
              </div>
              <br />
              Comment:
              <FormControl
                componentClass="textarea"
                style={{ height: '120px', overflow: 'auto', whiteSpace: 'pre' }}
                inputRef={m => {
                  this.summaryInput = m;
                }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <ButtonToolbar>
              <Button bsStyle="warning" onClick={onCloseFn}>Close</Button>
              <Button bsStyle="primary" onClick={() => this.onSave(this.summaryInput?.value)}>
                Save
              </Button>
            </ButtonToolbar>
          </Modal.Footer>
        </Modal>
      </span>
    );
  }
}

EmbargoCommentsModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/require-default-props
  selectEmbargo: PropTypes.object,
  onSaveFn: PropTypes.func.isRequired,
  onCloseFn: PropTypes.func.isRequired,
};
