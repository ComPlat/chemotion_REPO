/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, Modal, ProgressBar } from 'react-bootstrap';
import { ReactNglViewer } from 'react-nglviewer';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';
import MolViewer from 'src/components/viewer/MolViewer';
import MolViewerSet from 'src/components/viewer/MolViewerSet';

const MolViewerModal = (props) => {
  const {
    config, fileContent, show, title, handleModalOpen
  } = props;

  const [newContent, setNewContent] = useState(fileContent);
  const [progress, setProgress] = useState(null);
  const [switchViewer, setSwitchViewer] =
    useState(config.viewerEndpoint ? MolViewerSet.JSMOL : MolViewerSet.NGL);

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
    setProgress(0);
    convertMolfile();
  }, []);

  if (show) {
    const viewer = switchViewer === MolViewerSet.NGL ?
      <ReactNglViewer fileName={`${title}.mol`} filePath={newContent} /> :
      (<MolViewer
        cliendId={config.viewerClientId}
        endpoint={config.viewerEndpoint}
        molContent={newContent}
      />);
    return (
      <Modal animation dialogClassName="structure-viewer-modal" show={show} onHide={handleModalOpen}>
        <Modal.Header closeButton>
          <Modal.Title>
            {title}
            <ButtonGroup bsSize="xsmall" className="button-right">
              <Button
                active={switchViewer === MolViewerSet.JSMOL}
                onClick={() => setSwitchViewer(MolViewerSet.JSMOL)}
                disabled={!config.viewerEndpoint}
              >
                JSmol Viewer
              </Button>
              <Button
                active={switchViewer === MolViewerSet.NGL}
                onClick={() => setSwitchViewer(MolViewerSet.NGL)}
              >
                NGL Viewer
              </Button>
            </ButtonGroup>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {
            (progress >= 100) ?
              <div style={{ width: '100%', height: 'calc(100vh - 260px)' }}>{viewer}</div> : <ProgressBar active now={progress} label={`${progress}%`} />
          }
        </Modal.Body>
      </Modal>
    );
  }
  return <span />;
};

MolViewerModal.propTypes = {
  config: PropTypes.object.isRequired,
  fileContent: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  handleModalOpen: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  title: PropTypes.string,
};

MolViewerModal.defaultProps = { title: 'Structure Viewer' };

export default MolViewerModal;
