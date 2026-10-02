import React from 'react';
import { Card, Modal } from 'react-bootstrap';
import Quill2Viewer from 'src/repo/others/Quill2Viewer';

const NewsPreviewModal = ({ showModal, article, onClick }) => {
  return (
    <Modal animation show={showModal} dialogClassName="news-preview-dialog" onHide={() => onClick(false)}>
      <Modal.Body>
        <div>
          <div className="ribbon ribbon-top-right"><span>Preview</span></div>
          <Card className="newseditor_review">
            <Card.Header>
              <span>{article.title}</span>
              <div className="news_author">
                <img src="/images/logo.png" alt="Preview" />&nbsp;
                &nbsp;Creator
                &nbsp;&nbsp;&nbsp;<i className="fa fa-pencil" aria-hidden="true" />&nbsp;Created Date
              </div>
              <br />
              <div className="heading_separator" />
            </Card.Header>
            <Card.Body>
              <Quill2Viewer value={article.content} />
            </Card.Body>
          </Card>
          <div className="ribbon ribbon-bottom-left"><span>Preview</span></div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default NewsPreviewModal;
