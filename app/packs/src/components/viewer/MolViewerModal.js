/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, ProgressBar } from 'react-bootstrap';
import { MolViewer } from 'react-molviewer';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';

const MolViewerModal = (props) => {
  const {
    fileContent, title, handleModalOpen, viewType, show
  } = props;

  const [newContent, setNewContent] = useState(fileContent);
  const [progress, setProgress] = useState(0);

  const updateNewContent = (data) => {
    setNewContent(new Blob([data], { type: 'text/plain' }));
  };

  const convertMolfile = () => {
    const intervalId = setInterval(() => {
      setProgress((preProgress) => {
        if (preProgress >= 90) {
          clearInterval(intervalId);
          return 100;
        }
        return preProgress + 10;
      });
    }, 1000);
    const params = {
      data: { mol: fileContent },
    };
    PublicFetcher.convertMolfile(params).then((result) => {
      updateNewContent(result);
    }).catch(() => {
      updateNewContent(fileContent);
    }).finally(() => {
      setProgress(100);
      clearInterval(intervalId);
    });
  };

  useEffect(() => {
    convertMolfile();
    setProgress(0);
  }, []);

  if (show) {
    const viewer = (<MolViewer
      molContent={newContent}
      viewType={viewType}
      fnInit={() => LoadingActions.start()}
      fnCb={() => LoadingActions.stop()}
    />);
    return (
      <Modal animation dialogClassName="structure-viewer-modal" show={show} onHide={handleModalOpen}>
        <Modal.Header closeButton>
          <Modal.Title>
            {title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {
            progress >= 100 ?
              <div style={{ width: '100%', height: 'calc(100vh - 260px)' }}>{viewer}</div>
              :
              <ProgressBar active now={progress} label="processing" />
          }
        </Modal.Body>
      </Modal>
    );
  }
  return <span />;
};

MolViewerModal.propTypes = {
  fileContent: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  handleModalOpen: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  title: PropTypes.string,
  viewType: PropTypes.string.isRequired,
};

MolViewerModal.defaultProps = { title: 'Structure Viewer' };

export default MolViewerModal;
