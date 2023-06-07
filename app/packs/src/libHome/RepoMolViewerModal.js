/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import { ReactNglViewer } from 'react-nglviewer';

const RepoMolViewerModal = (props) => {
  const {
    fileContent, show, title, handleModalOpen
  } = props;
  const filePath = new Blob([fileContent], { type: 'text/plain' });
  if (show) {
    return (
      <Modal animation dialogClassName="structure-viewer-modal" show={show} onHide={() => handleModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ width: '100%', height: 'calc(100vh - 260px)' }}>
            <ReactNglViewer fileName={`${title}.mol`} filePath={filePath} />
          </div>
        </Modal.Body>
      </Modal>
    );
  }
  return <span />;
};

RepoMolViewerModal.propTypes = {
  fileContent: PropTypes.string.isRequired,
  show: PropTypes.bool.isRequired,
  handleModalOpen: PropTypes.func.isRequired,
  title: PropTypes.string,
};

RepoMolViewerModal.defaultProps = { title: 'Structure Viewer' };

export default RepoMolViewerModal;
