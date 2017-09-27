import React from 'react';
import { Panel, Modal } from 'react-bootstrap';
import QuillViewer from '../../components/QuillViewer';

const NewsPreviewModal = ({ showModal, article, onClick }) => {
  return (
    <Modal animation show={showModal} dialogClassName="news-preview-dialog" onHide={() => onClick(false)}>
      <Modal.Body>
        <div>
          <div className="ribbon ribbon-top-right"><span>Preview</span></div>
          <Panel className="newseditor_review">
            <Panel.Heading>
              <span>{article.title}</span>
              <div className="news_author">
                <img src="/images/logo.png" alt="Preview" />&nbsp;
                &nbsp;Creator
                &nbsp;&nbsp;&nbsp;<i className="fa fa-pencil" aria-hidden="true" />&nbsp;Created Date
              </div>
              <br />
              <div className="heading_separator" />
            </Panel.Heading>
            <Panel.Body>
              <QuillViewer value={article.content} />
            </Panel.Body>
          </Panel>
          <div className="ribbon ribbon-bottom-left"><span>Preview</span></div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default NewsPreviewModal;
