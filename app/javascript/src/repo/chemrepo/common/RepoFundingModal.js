import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { RepoStoreContext } from 'src/repo/stores/RepoRootStore';
import FundingReferences from 'src/repo/chemrepo/funding/FundingReferences';

class RepoFundingModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
    };
    this.handleShow = this.handleShow.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  handleShow() {
    this.setState({ showModal: true });
  }

  handleClose() {
    const { fundingStore } = this.context;
    fundingStore.triggerRefresh();
    this.setState({ showModal: false });
  }

  render() {
    const { elementId, elementType, compact } = this.props;
    const { showModal } = this.state;

    return (
      <>
        <Button
          variant="light"
          size="sm"
          onClick={this.handleShow}
          title="Add/Remove Funding References"
        >
          <i className={compact ? 'fa fa-trophy' : 'fa fa-trophy me-1'} />
          {!compact && 'Fundings'}
        </Button>
        <Modal
          centered
          show={showModal}
          onHide={this.handleClose}
          dialogClassName="funding-modal-dialog"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fa fa-trophy" />
              &nbsp;Funding References
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <FundingReferences
              elementId={elementId}
              elementType={elementType}
              isNew={false}
              readOnly={false}
            />
          </Modal.Body>
          <Modal.Footer className="justify-content-start">
            <Button variant="secondary" onClick={this.handleClose}>Close</Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

RepoFundingModal.contextType = RepoStoreContext;

RepoFundingModal.propTypes = {
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired,
  compact: PropTypes.bool,
};

RepoFundingModal.defaultProps = {
  compact: false,
};

export default observer(RepoFundingModal);
