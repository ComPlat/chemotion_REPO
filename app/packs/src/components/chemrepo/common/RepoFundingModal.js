import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { RepoStoreContext } from 'src/stores/RepoRootStore';
import FundingReferences from 'src/components/chemrepo/funding/FundingReferences';

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
    const { elementId, elementType } = this.props;
    const { showModal } = this.state;

    return (
      <>
        <Button
          bsStyle="default"
          onClick={this.handleShow}
          title="Add/Remove Funding References"
        >
          <i className="fa fa-trophy" />
        </Button>
        <Modal
          show={showModal}
          onHide={this.handleClose}
          dialogClassName="structure-viewer-modal"
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
        </Modal>
      </>
    );
  }
}

RepoFundingModal.contextType = RepoStoreContext;

RepoFundingModal.propTypes = {
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired,
};

export default observer(RepoFundingModal);
