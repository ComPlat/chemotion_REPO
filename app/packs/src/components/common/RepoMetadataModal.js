import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ButtonToolbar, OverlayTrigger, Tooltip, Label } from 'react-bootstrap';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';

export default class RepoMetadataModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalShow: false,
      metadata: []
    };
    this.loadMetadata = this.loadMetadata.bind(this);
  }

  componentDidMount() {
    this.loadMetadata();
  }

  loadMetadata() {
    const { elementId, elementType } = this.props;
    RepositoryFetcher.previewMetadata(elementId, elementType).then((result) => {
      this.setState({ metadata: result.metadata });
    });
  }

  render() {
    const { modalShow, metadata } = this.state;
    const { elementId, elementType } = this.props;
    return (
      <div>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tt_metadata">Preview/Download Metadata</Tooltip>}
        >
          <Button
            onClick={() => this.setState({ modalShow: true })}
            style={{ marginLeft: '5px' }}
          >
            <i className="fa fa-file-code-o" />&nbsp;
            Metadata
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
                <Label>
                  {elementType.charAt(0).toUpperCase().concat(elementType.slice(1).toLowerCase())}
                </Label>
              </h4>
            </div>
            <div style={{
              maxHeight: '50vh',
              overflow: 'auto',
              whiteSpace: 'pre',
              backgroundColor: 'black',
              color: 'white',
              fontFamily: 'monospace'
            }}
            >
              {metadata && metadata.length > 0 ? metadata.find(mt => mt.element_type === elementType.charAt(0).toUpperCase().concat(elementType.slice(1).toLowerCase())).metadata_xml : ''}
            </div>
            <br />
            <ButtonToolbar>
              <Button
                bsStyle="warning"
                onClick={() => this.setState({ modalShow: false })}
              > Close
              </Button>
              <Button
                bsStyle="primary"
                onClick={() => RepositoryFetcher.zipPreviewMetadata(elementId, elementType)}
              > Download
              </Button>
            </ButtonToolbar>
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

RepoMetadataModal.propTypes = {
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired
};
