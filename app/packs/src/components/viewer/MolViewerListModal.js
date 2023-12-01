/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Col, Modal, PanelGroup, Panel, Nav, NavItem } from 'react-bootstrap';
import { MolViewer } from 'react-molviewer';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

const MolViewerListModal = (props) => {
  const {
    datasetContainer, handleModalOpen, isPublic, show
  } = props;

  const [activeKey, setActiveKey] = useState(1);
  const [selected, setSelected] = useState(() => {
    const ds = datasetContainer[0];
    const file = (ds?.attachments?.length > 0 && ds?.attachments[0]) || {};
    return { ...file, dsName: ds.name };
  });

  const handleFile = (e, attachment, ds) => {
    e.stopPropagation();
    setSelected({ ...attachment, dsName: ds.name });
  };

  const handleSelect = (e, key) => {
    e.stopPropagation();
    setActiveKey(key);
  };

  const list = () => {
    const defaultActiveKey = datasetContainer[0].id;
    return (
      <PanelGroup
        accordion
        id="accordion-controlled-example"
        defaultActiveKey={defaultActiveKey}
        style={{ width: '100%', height: 'calc(100vh - 200px)', overflow: 'auto' }}
      >
        {
          datasetContainer.map((ds) => {
            const { attachments } = ds;
            return (
              <Panel key={ds.id} eventKey={ds.id} onClick={e => handleSelect(e, ds.id)}>
                <Panel.Heading>
                  <Panel.Title toggle>{`Dataset: ${ds.name}`}</Panel.Title>
                </Panel.Heading>
                <Panel.Body style={{ padding: '0px' }} collapsible>
                  <Nav bsStyle="pills" stacked activeKey={activeKey}>
                    {
                      attachments.map(attachment => (
                        <NavItem
                          key={attachment.id}
                          eventKey={attachment.id}
                          active={attachment.id === selected?.id}
                          onClick={e => handleFile(e, attachment, ds)}
                        >
                          <i className="fa fa-file" aria-hidden="true" />&nbsp;{attachment.filename}
                        </NavItem>
                      ))
                    }
                  </Nav>
                </Panel.Body>
              </Panel>
            );
          })
        }
      </PanelGroup>
    );
  };

  if (show) {
    let modalBody = <Alert bsStyle="danger">This service is offline. Please contact your system administrator.</Alert>;
    if (selected?.id) {
      const viewer = (<MolViewer
        molContent={isPublic
          ? `${window.location.origin}/api/v1/public/download/attachment?id=${selected?.id}`
          : `${window.location.origin}/api/v1/attachments/${selected?.id}`}
        viewType={`file_${selected?.id}`}
        fnInit={() => LoadingActions.start()}
        fnCb={() => LoadingActions.stop()}
      />);
      modalBody = <div style={{ width: '100%', height: 'calc(100vh - 260px)' }}>{viewer}</div>;
    }
    return (
      <Modal backdrop="static" animation dialogClassName="file-viewer-modal" show={show} onHide={handleModalOpen}>
        <Modal.Header onClick={e => e.stopPropagation()} closeButton>
          <Modal.Title>
            Dataset: {selected.dsName} / File: {selected?.filename}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body onClick={e => e.stopPropagation()}>
          <Col md={2} sm={2} lg={2}>
            {list()}
          </Col>
          <Col md={10} sm={10} lg={10}>{modalBody}</Col>
        </Modal.Body>
      </Modal>
    );
  }
  return <span />;
};

MolViewerListModal.propTypes = {
  datasetContainer: PropTypes.array.isRequired,
  handleModalOpen: PropTypes.func.isRequired,
  isPublic: PropTypes.bool.isRequired,
  show: PropTypes.bool.isRequired,
};

export default MolViewerListModal;
