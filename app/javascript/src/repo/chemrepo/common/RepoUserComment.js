import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip, Form } from 'react-bootstrap';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';

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
    const { id, isLogin, isPublished, title } = this.props;
    const defaultAttrs = {
      style: {
        height: '400px', overflow: 'auto', whiteSpace: 'pre'
      }
    };

    if (isPublished && isLogin) {
      return (
        <span>
          <OverlayTrigger placement="top" overlay={<Tooltip id="tt_metadata">Leave a comment about this data to the reviewers </Tooltip>}>
            <Button size="sm" onClick={() => this.setState({ modalShow: true })} variant="outline-dark">
              <i className="fa fa-envelope-o" />
            </Button>
          </OverlayTrigger>
          <Modal
            show={modalShow}
            onHide={() => this.setState({ modalShow: false })}
            centered
          >
            <Modal.Header closeButton>
              <Modal.Title>
                Comments for the reviewers
              </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ overflow: 'auto' }}>
              {title}
              <Form.Control
                as="textarea"
                {...defaultAttrs}
                ref={(m) => { this.commentInput = m; }}
              />
              <br />
              <ButtonToolbar>
                <Button
                  variant="warning"
                  onClick={() => this.setState({ modalShow: false })}
                > Close
                </Button>
                <Button
                  variant="primary"
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
  isPublished: PropTypes.bool.isRequired,
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
