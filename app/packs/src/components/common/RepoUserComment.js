import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip, FormControl } from 'react-bootstrap';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';

export default class RepoUserComment extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalShow: false
    };
    this.sendEmail = this.sendEmail.bind(this);
  }

  sendEmail() {
    const { id, type, pageType, pageId } = this.props;
    RepositoryFetcher.userComment(id, type, pageId || id, pageType, this.commentInput.value)
      .then((result) => {
        this.setState({ modalShow: false });
      });
  }

  render() {
    const { modalShow } = this.state;
    const { id, isLogin, title } = this.props;
    const defaultAttrs = {
      style: {
        height: '400px', overflow: 'auto', whiteSpace: 'pre'
      }
    };

    if (isLogin) {
      return (
        <span>
          <OverlayTrigger placement="top" overlay={<Tooltip id="tt_metadata">Leave a comment about this data to the reviewers </Tooltip>}>
            <Button bsSize="xsmall" onClick={() => this.setState({ modalShow: true })}>
              <i className="fa fa-envelope-o" />
            </Button>
          </OverlayTrigger>
          <Modal
            show={modalShow}
            onHide={() => this.setState({ modalShow: false })}
            dialogClassName="pub-info-dialog"
          >
            <Modal.Header closeButton>
              <Modal.Title>
                Comments for the reviewers
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ overflow: 'auto' }}>
              {title}
              <FormControl
                componentClass="textarea"
                {...defaultAttrs}
                inputRef={(m) => { this.commentInput = m; }}
              />
              <br />
              <ButtonToolbar>
                <Button
                  bsStyle="warning"
                  onClick={() => this.setState({ modalShow: false })}
                > Close
                </Button>
                <Button
                  bsStyle="primary"
                  onClick={() => this.sendEmail()}
                > Send to Chemotion Reviewers
                </Button>
              </ButtonToolbar>
            </Modal.Body>
          </Modal>
        </span>
      );
    }
    return (<span />);
  }
}

RepoUserComment.propTypes = {
  id: PropTypes.number.isRequired,
  isLogin: PropTypes.bool,
  type: PropTypes.string,
  title: PropTypes.string,
  pageType: PropTypes.string,
  pageId: PropTypes.number
};

RepoUserComment.defaultProps = {
  isLogin: false,
  type: '',
  title: '',
  pageType: 'reactions',
  pageId: null
};
