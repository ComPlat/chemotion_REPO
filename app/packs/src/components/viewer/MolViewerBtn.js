/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import MolViewerModal from './MolViewerModal';
import PublicStore from 'src/stores/alt/repo/stores/PublicStore';
import UIStore from '../stores/UIStore';

export default class MolViewerBtn extends Component {
  constructor(props) {
    super(props);
    this.state = { show: false };
    this.handleModalOpen = this.handleModalOpen.bind(this);
  }

  handleModalOpen(e) {
    if (e) { e.stopPropagation(); }
    this.setState({ show: !this.state.show });
  }

  render() {
    const {
      disabled, fileContent, isPublic
    } = this.props;
    const config = UIStore.getState().moleculeViewer || PublicStore.getState().moleculeViewer;
    const { show } = this.state;
    if (isPublic && !config?.featureEnabled) return null;

    return (
      <>
        <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip_molviewer" style={{ pointerEvents: 'none' }}>Click to see structure in Viewer</Tooltip>}>
          <Button className="button-right" bsSize="xsmall" bsStyle="info" disabled={disabled} onClick={e => this.handleModalOpen(e)}>
            <i className="fa fa-cube" aria-hidden="true" />{' '}Viewer
          </Button>
        </OverlayTrigger>
        {
          show ?
            <MolViewerModal
              config={config}
              fileContent={fileContent}
              handleModalOpen={e => this.handleModalOpen(e)}
              isPublic={isPublic}
              show={show}
            /> : null
        }
      </>
    );
  }
}

MolViewerBtn.propTypes = {
  disabled: PropTypes.bool.isRequired,
  fileContent: PropTypes.string.isRequired,
  isPublic: PropTypes.bool.isRequired,
};
