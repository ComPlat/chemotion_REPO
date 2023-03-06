/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Col, Modal, PanelGroup, Panel, Nav, NavItem } from 'react-bootstrap';
import { ReactNglViewer } from 'react-nglviewer';

export default class RepoMolViewerListModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: null,
      activeKey: 1
    };

    this.list = this.list.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.handleFile = this.handleFile.bind(this);
  }

  handleSelect(e, activeKey) {
    e.stopPropagation();
    this.setState({ activeKey });
  }

  handleFile(e, attachment, ds) {
    e.stopPropagation();
    this.setState({ selected: { ...attachment, dsName: ds.name } });
  }

  list() {
    const { datasetContainer } = this.props;
    const { selected, activeKey } = this.state;
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
              <Panel key={ds.id} eventKey={ds.id} onClick={e => this.handleSelect(e, ds.id)}>
                <Panel.Heading>
                  <Panel.Title toggle>{`Dataset: ${ds.name}`}</Panel.Title>
                </Panel.Heading>
                <Panel.Body style={{ padding: '0px' }} collapsible>
                  <Nav bsStyle="pills" stacked activeKey={activeKey}>
                    {
                      attachments.map(attachment => (
                        <NavItem key={attachment.id} eventKey={attachment.id} active={attachment.id === selected?.id} onClick={e => this.handleFile(e, attachment, ds)}>
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
  }

  handleModal(e) {
    if (e) e.stopPropagation();
    const { handleModalOpen } = this.props;
    handleModalOpen();
  }

  render() {
    const {
      show, isPublic, datasetContainer
    } = this.props;
    let { selected } = this.state;
    if (!selected) {
      const ds = datasetContainer[0];
      const file = (ds?.attachments?.length > 0 && ds?.attachments[0]) || {};
      selected = { ...file, dsName: ds.name };
    }

    const filePath = isPublic ?
      `${window.location.origin}/api/v1/public/download/attachment?id=${selected?.id}`
      : `${window.location.origin}/api/v1/attachments/${selected?.id}`;

    if (show) {
      return (
        <Modal backdrop="static" animation dialogClassName="file-viewer-modal" show={show} onHide={e => this.handleModal(e)}>
          <Modal.Header onClick={e => e.stopPropagation()} closeButton>
            <Modal.Title>Dataset: {selected.dsName} / File: {selected?.filename}</Modal.Title>
          </Modal.Header>
          <Modal.Body onClick={e => e.stopPropagation()}>
            <Col md={2} sm={2} lg={2}>
              {this.list()}
            </Col>
            <Col md={10} sm={10} lg={10}>
              <div style={{ width: '100%', height: 'calc(100vh - 260px)' }}>
                <ReactNglViewer fileName={selected?.filename} filePath={filePath} />
              </div>
            </Col>
          </Modal.Body>
        </Modal>
      );
    }
    return <span />;
  }
}

RepoMolViewerListModal.propTypes = {
  datasetContainer: PropTypes.array.isRequired,
  isPublic: PropTypes.bool.isRequired,
  show: PropTypes.bool.isRequired,
  handleModalOpen: PropTypes.func.isRequired,
};
