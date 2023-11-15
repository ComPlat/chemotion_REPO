import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, ButtonToolbar, Tooltip, FormControl } from 'react-bootstrap';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';

const UserCommentModal = (props) => {
  const {
    id, isLogin, isPublished, title, type, pageType, pageId
  } = props;
  const [modalShow, setModalShow] = useState(false);
  const commentInputRef = useRef(null);

  const sendEmail = () => {
    RepositoryFetcher.userComment(id, type, pageId || id, pageType, commentInputRef.current.value)
      .then(() => setModalShow(false));
  };

  const defaultAttrs = {
    style: {
      height: '400px', overflow: 'auto', whiteSpace: 'pre'
    }
  };

  if (isPublished && isLogin) {
    return (
      <>
        <OverlayTrigger placement="top" overlay={<Tooltip id="tt_metadata">Leave a comment about this data to the reviewers </Tooltip>}>
          <Button bsSize="xsmall" onClick={() => setModalShow(true)}>
            <i className="fa fa-envelope-o" />
          </Button>
        </OverlayTrigger>
        <Modal
          show={modalShow}
          onHide={() => setModalShow(false)}
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
              inputRef={commentInputRef}
            />
            <br />
            <ButtonToolbar>
              <Button
                bsStyle="warning"
                onClick={() => setModalShow(false)}
              > Close
              </Button>
              <Button
                bsStyle="primary"
                onClick={sendEmail}
              > Send to Chemotion Reviewers
              </Button>
            </ButtonToolbar>
          </Modal.Body>
        </Modal>
      </>
    );
  }

  return null;
};

UserCommentModal.propTypes = {
  id: PropTypes.number.isRequired,
  isLogin: PropTypes.bool,
  isPublished: PropTypes.bool.isRequired,
  type: PropTypes.string,
  title: PropTypes.string,
  pageType: PropTypes.string,
  pageId: PropTypes.number
};

UserCommentModal.defaultProps = {
  isLogin: false,
  type: '',
  title: '',
  pageType: 'reactions',
  pageId: null
};

export default UserCommentModal;
