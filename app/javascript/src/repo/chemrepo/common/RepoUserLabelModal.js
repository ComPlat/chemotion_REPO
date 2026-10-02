import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { ReviewUserLabels } from 'src/repo/others/ReviewUserLabels';
import ReviewActions from 'src/repo/actions/ReviewActions';

export default class RepoUserLabelModal extends React.Component {
  constructor(props) {
    super(props);
    const { element } = props;
    this.state = {
      modalShow: false,
      selectedIds: element.user_labels || [],
    };
    this.handleSelectLabels = this.handleSelectLabels.bind(this);
    this.handleSaveLabels = this.handleSaveLabels.bind(this);
  }

  handleSelectLabels(e, ids) {
    this.setState({ selectedIds: ids });
  }

  handleSaveLabels(e) {
    const { selectedIds } = this.state;
    ReviewActions.saveReviewLabel(e, selectedIds);
    this.setState({ modalShow: false });
  }

  render() {
    const { modalShow, selectedIds } = this.state;
    const { element } = this.props;

    return (
      <>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tt_metadata">Add/Remove User Labels</Tooltip>}
        >
          <Button
            variant="outline-dark"
            size="xsm"
            onClick={() => this.setState({ modalShow: true })}
          >
            <i className="fa fa-tags" />
          </Button>
        </OverlayTrigger>
        <Modal
          show={modalShow}
          onHide={() => this.setState({ modalShow: false })}
          size="lg"
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Please select Labels</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ position: 'relative' }}>
              <h4>
                <ReviewUserLabels
                  element={element}
                  selectedIds={selectedIds}
                  fnCb={this.handleSelectLabels}
                />
              </h4>
            </div>
          </Modal.Body>
          <Modal.Footer className="justify-content-start">
            <ButtonToolbar className="d-flex gap-2" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
              <Button
                variant="secondary"
                onClick={() => this.setState({ modalShow: false })}
              >
                Close
              </Button>
              <Button
                variant="warning"
                onClick={() => this.handleSaveLabels(element)}
              >
                Save
              </Button>
            </ButtonToolbar>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

RepoUserLabelModal.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number,
    elementType: PropTypes.string,
  }).isRequired,
};
