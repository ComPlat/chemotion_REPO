import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip,
  Label,
} from 'react-bootstrap';
import { ReviewUserLabels } from 'src/components/UserLabels';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';

export default class RepoUserLabelModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalShow: false,
      selectedIds: this.props.element.user_labels || [],
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
      <div>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tt_metadata">Add/Remove user labels</Tooltip>}
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
          <Modal.Body style={{ overflow: 'auto' }}>
            <div>
              <h4>
                <ReviewUserLabels
                  element={element}
                  selectedIds={selectedIds}
                  fnCb={this.handleSelectLabels}
                />
              </h4>
            </div>
            <br />
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
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

RepoUserLabelModal.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number,
    elementType: PropTypes.string,
  }).isRequired,
};
