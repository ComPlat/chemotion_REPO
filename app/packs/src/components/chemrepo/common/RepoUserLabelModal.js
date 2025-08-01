import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { ReviewUserLabels } from 'src/components/UserLabels';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';

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
            onClick={() => this.setState({ modalShow: true })}
            style={{ marginLeft: '5px' }}
          >
            <i className="fa fa-tags" />
          </Button>
        </OverlayTrigger>
        <Modal
          show={modalShow}
          onHide={() => this.setState({ modalShow: false })}
          dialogClassName="news-preview-dialog"
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
          <Modal.Footer>
            <ButtonToolbar>
              <Button
                bsStyle="warning"
                onClick={() => this.setState({ modalShow: false })}
              >
                Close
              </Button>
              <Button
                bsStyle="primary"
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
