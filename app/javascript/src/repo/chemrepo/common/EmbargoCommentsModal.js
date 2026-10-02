/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import {
  Modal,
  Button,
  ButtonToolbar,
  Table,
  Badge,
  Form,
} from 'react-bootstrap';

export default class EmbargoCommentsModal extends React.Component {
  constructor(props) {
    super(props);
    this.summaryInput = React.createRef();
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
        <Modal show={showModal} onHide={onCloseFn} size="xl" centered>
          <Modal.Header closeButton>
            <Modal.Title>
              Embargo: {label}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ height: '50vh', overflow: 'auto' }}>
            <div>
              Leave a comment:
              <Form.Control
                as="textarea"
                style={{ height: '120px', overflow: 'auto', whiteSpace: 'pre' }}
                ref={this.summaryInput}
              />
              <br />
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
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-light py-1 justify-content-start">
            <Button variant="secondary" onClick={onCloseFn}>Close</Button>
            <Button variant="primary" onClick={() => this.onSave(this.summaryInput.current?.value)}>
              Save
            </Button>
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
