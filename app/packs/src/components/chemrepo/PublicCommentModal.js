import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip, FormControl } from 'react-bootstrap';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';
import PublicActions from '../actions/PublicActions';

export default class PublicCommentModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalShow: false
    };
    this.updateComment = this.updateComment.bind(this);
  }

  updateComment() {
    const {
      id, type, pageType, pageId
    } = this.props;
    RepositoryFetcher.reviewerComment(id, type, this.commentInput.value)
      .then(() => {
        this.setState({ modalShow: false });
        if (pageType === 'reactions') {
          PublicActions.displayReaction(pageId || id);
        } else {
          PublicActions.displayMolecule(pageId);
        }
      });
  }

  render() {
    const { modalShow } = this.state;
    const { isReviewer, userInfo, title } = this.props;
    const defaultAttrs = {
      style: {
        height: '400px', overflow: 'auto', whiteSpace: 'pre'
      }
    };

    let btnTbl = (<span />);
    let commentModal = (<span />);
    const style = {
      height: '20px', width: '20px', borderRadius: '50%', border: '1px'
    };
    const hasComment = userInfo !== '';

    if (hasComment === true) {
      btnTbl = (
        <OverlayTrigger placement="top" overlay={<Tooltip id="tt_metadata">Important information about this data</Tooltip>}>
          <Button bsSize="xsmall" bsStyle="warning" style={style} onClick={() => this.setState({ modalShow: true })}>
            <i className="fa fa-info" />
          </Button>
        </OverlayTrigger>
      );
    } else if (hasComment === false && isReviewer === true) {
      btnTbl = (
        <OverlayTrigger placement="top" overlay={<Tooltip id="tt_metadata">Important information about this data (edit)</Tooltip>}>
          <Button bsSize="xsmall" style={style} onClick={() => this.setState({ modalShow: true })}>
            <i className="fa fa-info" />
          </Button>
        </OverlayTrigger>
      );
    }

    if (isReviewer === true) {
      commentModal = (
        <Modal
          show={modalShow}
          onHide={() => this.setState({ modalShow: false })}
          dialogClassName="pub-info-dialog"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Note for {title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            <FormControl
              componentClass="textarea"
              defaultValue={userInfo || ''}
              {...defaultAttrs}
              inputRef={(m) => { this.commentInput = m; }}
            />
            <ButtonToolbar>
              <Button
                bsStyle="warning"
                onClick={() => this.setState({ modalShow: false })}
              > Close
              </Button>
              <Button
                bsStyle="primary"
                onClick={() => this.updateComment()}
              > Update
              </Button>
            </ButtonToolbar>
          </Modal.Body>
        </Modal>
      );
    } else {
      commentModal = (
        <Modal
          show={modalShow}
          onHide={() => this.setState({ modalShow: false })}
          dialogClassName="pub-info-dialog"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Note for {title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {userInfo}
          </Modal.Body>
        </Modal>
      );
    }
    return (
      <>{btnTbl}{commentModal}</>
    );
  }
}

PublicCommentModal.propTypes = {
  id: PropTypes.number.isRequired,
  userInfo: PropTypes.string,
  isReviewer: PropTypes.bool,
  type: PropTypes.string,
  pageId: PropTypes.number,
  pageType: PropTypes.string,
  title: PropTypes.string
};

PublicCommentModal.defaultProps = {
  isReviewer: false,
  type: '',
  pageId: null,
  pageType: 'reactions',
  userInfo: '',
  title: ''
};
