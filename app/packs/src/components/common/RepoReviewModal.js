import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ButtonToolbar, FormControl, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';
import { isEmpty } from 'lodash';
import RepoReviewHisColumns from './RepoReviewHisColumns';
import RepoReviewTimeFormat from './RepoReviewTimeFormat';

export default class RepoReviewModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      idxDetail: -1
    };
    this.clickDetail = this.clickDetail.bind(this);
  }

  clickDetail(idxDetail) {
    if (this.state.idxDetail == idxDetail) {
      this.setState({ idxDetail: -1 });
    } else {
      this.setState({ idxDetail });
    }
  }

  renderComments() {
    const { idxDetail } = this.state;
    const { reviewLevel, history } = this.props;

    const curObj = (history && history.length > 0 && history.slice(-1).pop()) || {};

    //const isEditable = ((reviewLevel === 3 && curObj.state === 'pending') || (reviewLevel === 2 && curObj.state === 'reviewed')) || false;

    let historyTbl = null;

    if (history && history.length > 0) {
      historyTbl = history.map((his, idx) => (
        <tbody key={uuid.v4()}>
          <tr>
            <td style={{ width: '5%' }}>{idx + 1}</td>
            <td style={{ width: '5%' }}>
              <OverlayTrigger placement="top" overlay={<Tooltip id="comment_tooltip">view columns&#39; comments</Tooltip>}>
                <Button style={{ display: his.comments && isEmpty(his.comments) === false ? '' : 'none' }} bsSize="xsmall" onClick={() => this.clickDetail(idx)}><i className="fa fa-list" aria-hidden="true" /></Button>
              </OverlayTrigger>
            </td>
            <td style={{ width: '10%' }}>{his.action}</td>
            <td style={{ width: '12%' }}>{RepoReviewTimeFormat(his.timestamp)}</td>
            <td style={{ width: '48%' }}>{his.comment}</td>
            <td style={{ width: '10%' }}>{his.username}</td>
          </tr>
          {
            (idxDetail === idx && his.comments && isEmpty(his.comments) === false) ?
            (<tr><td colSpan={6} style={{ width: '100%' }}><RepoReviewHisColumns comments={his.comments} /></td></tr>) : null
          }
        </tbody>
      ));
    }

    return (
      <div>
        <div >
          <Table striped bordered>
            <thead>
              <tr>
                <th width="5%">#</th>
                <th width="5%">Detail</th>
                <th width="10%">Action</th>
                <th width="12%">Date</th>
                <th width="48%">Comment</th>
                <th width="10%">From User</th>
              </tr>
            </thead>
            {historyTbl}
          </Table>
        </div>
        <br />
        Summary
        <FormControl
          componentClass="textarea"
          style={{ height: '120px', overflow: 'auto', whiteSpace: 'pre' }}
          defaultValue={curObj.comment || ''}
          inputRef={(m) => { this.summaryInput = m; }}
        />
      </div>
    );
  }

  render() {
    const {
      show, elementId, action, onSubmit, onHide, reviewLevel, history
    } = this.props;

    const currComment = (history && history.length > 0 && history.slice(-1).pop()) || {}
    const isEditable = ((reviewLevel === 3 && currComment.state === 'pending') || (reviewLevel === 2 && currComment.state === 'reviewed')) || false;

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
            dialogClassName="structure-editor-modal"
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
              <div id="div-modal-body" style={{ height: 'calc(100vh - 300px)', maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
                {this.renderComments()}

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
                      this.summaryInput.value,
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
  history: PropTypes.array,
  reviewLevel: PropTypes.number,
  onSubmit: PropTypes.func.isRequired,
  onHide: PropTypes.func.isRequired
};

RepoReviewModal.defaultProps = {
  show: false,
  reviewLevel: 0,
  history: []
};
