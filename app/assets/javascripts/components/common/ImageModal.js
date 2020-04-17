import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';
import { stopEvent } from '../utils/DomHelper';
import UserStore from '../stores/UserStore';

const defaultImageStyle = {
  style: {
    cursor: 'default'
  }
};

export default class ImageModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fetchSrc: props.popObject.src,
      showModal: false,
    };
    this.fetchImage = this.fetchImage.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
    this.handleImageError = this.handleImageError.bind(this);
  }

  componentDidMount() {
    if (this.props.popObject.fetchNeeded) {
      this.fetchImage();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.popObject.fetchNeeded) {
      if (this.props.popObject.fetchId !== prevProps.popObject.fetchId) {
        this.fetchImage();
      }
    }
  }

  fetchImage() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) {
      const fileSrc = ['/images/publications', this.props.popObject.fetchId, this.props.popObject.fetchFilename].join('/');
      this.setState({ fetchSrc: fileSrc });
    } else {
      AttachmentFetcher.fetchImageAttachment({ id: this.props.popObject.fetchId })
        .then((result) => {
          if (result != null) {
            this.setState({ fetchSrc: result });
          }
        });
    }
  }

  handleModalClose(e) {
    stopEvent(e);
    this.setState({ showModal: false });
  }

  handleModalShow(e) {
    stopEvent(e);
    this.setState({ showModal: true });
  }

  handleImageError() {
    this.setState({ fetchSrc: this.props.preivewObject.src });
  }

  render() {
    const { hasPop, preivewObject, popObject } = this.props;

    if (!hasPop) {
      return (<div className="preview-table"><img src={preivewObject.src} alt="" {...this.props.imageStyle || defaultImageStyle} /></div>);
    }

    return (
      <div>
        <div className="preview-table" onClick={this.handleModalShow}>
          <img src={preivewObject.src} alt="" style={{ cursor: 'pointer' }} />
        </div>
        <Modal show={this.state.showModal} onHide={this.handleModalClose} dialogClassName="noticeModal">
          <Modal.Header closeButton>
            <Modal.Title>{popObject.title}</Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ overflow: 'auto', position: 'relative' }}>
            <img
              src={this.state.fetchSrc}
              style={{
                display: 'block',
                maxHeight: '100%',
                maxWidth: '100%',
              }}
              alt=""
              onError={this.handleImageError}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={this.handleModalClose} className="pull-left">Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

ImageModal.propTypes = {
  imageStyle: PropTypes.object,
  hasPop: PropTypes.bool.isRequired,
  preivewObject: PropTypes.shape({
    src: PropTypes.string,
  }).isRequired,
  popObject: PropTypes.shape({
    title: PropTypes.string,
    src: PropTypes.string,
    fetchNeeded: PropTypes.bool,
    fetchId: PropTypes.number,
    fetchFilename: PropTypes.string,
  }).isRequired,
};
