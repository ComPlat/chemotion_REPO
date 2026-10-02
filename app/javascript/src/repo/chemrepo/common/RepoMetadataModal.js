import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  ButtonToolbar,
  OverlayTrigger,
  Tooltip,
  Badge,
} from 'react-bootstrap';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';

export default class RepoMetadataModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalShow: false,
      metadata: [],
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
      <>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id="tt_metadata">Preview/Download Metadata</Tooltip>
          }
        >
          <Button
            variant="outline-dark"
            size="xsm"
            onClick={() => this.setState({ modalShow: true })}
          >
            <i className="fa fa-file-code-o" />
          </Button>
        </OverlayTrigger>
        <Modal
          show={modalShow}
          onHide={() => this.setState({ modalShow: false })}
          size="lg"
          centered
        >
          <Modal.Body style={{ overflow: 'auto' }}>
            <div>
              <h4>
                <Badge bg="secondary">
                  {elementType
                    .charAt(0)
                    .toUpperCase()
                    .concat(elementType.slice(1).toLowerCase())}
                </Badge>
              </h4>
            </div>
            <div
              style={{
                maxHeight: '50vh',
                overflow: 'auto',
                whiteSpace: 'pre',
                backgroundColor: 'black',
                color: 'white',
                fontFamily: 'monospace',
              }}
            >
              {metadata && metadata.length > 0
                ? metadata.find(
                    (mt) =>
                      mt.element_type ===
                      elementType
                        .charAt(0)
                        .toUpperCase()
                        .concat(elementType.slice(1).toLowerCase()),
                  ).metadata_xml
                : ''}
            </div>
            <br />
          </Modal.Body>
          <Modal.Footer className="justify-content-start">
            <ButtonToolbar className="d-flex gap-2">
              <Button
                variant="secondary"
                onClick={() => this.setState({ modalShow: false })}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  RepositoryFetcher.zipPreviewMetadata(elementId, elementType)
                }
              >
                Download
              </Button>
            </ButtonToolbar>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

RepoMetadataModal.propTypes = {
  elementId: PropTypes.number.isRequired,
  elementType: PropTypes.string.isRequired,
};
