/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { filter } from 'lodash';
import MolViewerListModal from './MolViewerListModal';
import ArrayUtils from '../../components/utils/ArrayUtils';
import PublicStore from 'src/stores/alt/repo/stores/PublicStore';
import UIStore from '../stores/UIStore';

export default class MolViewerListBtn extends Component {
  constructor(props) {
    super(props);
    this.state = { openModal: false };
    this.handleModalOpen = this.handleModalOpen.bind(this);
    this.renderBtn = this.renderBtn.bind(this);
  }

  handleModalOpen(e) {
    if (e) { e.stopPropagation(); }
    this.setState({ openModal: !this.state.openModal });
  }

  renderBtn(disabled) {
    const btnStyle = disabled ? 'default' : 'info';
    const tipDesc = disabled ? ' (Nothing to view)' : '';
    const onClick = disabled ? e => e.stopPropagation() : e => this.handleModalOpen(e);
    const className = this.props.isPublic ? '' : '';
    return (
      <OverlayTrigger
        placement="top"
        delayShow={500}
        overlay={<Tooltip id="_fast_create_btn">Click to view structure file in Viewer{tipDesc}</Tooltip>}
      >
        <Button bsSize="xs" bsStyle={btnStyle} className={className} onClick={onClick} disabled={this.props.disabled}>
          <i className="fa fa-cube" aria-hidden="true" />{' '}Viewer
        </Button>
      </OverlayTrigger>
    );
  }

  render() {
    const {
      container, el, isPublic
    } = this.props;
    const { openModal } = this.state;
    const config = UIStore.getState().moleculeViewer || PublicStore.getState().moleculeViewer;
    if (!el) return null;
    if (isPublic && !config?.featureEnabled) return null;

    if (container?.children?.length < 1) { return this.renderBtn(true); }

    let datasetContainer = ArrayUtils.sortArrByIndex(filter(container.children, o => o.container_type === 'dataset' && o.attachments.length > 0));
    if (datasetContainer?.length < 1) { return this.renderBtn(true); }

    datasetContainer = datasetContainer.map((dc) => {
      const ds = Object.assign({}, dc);
      const { attachments } = ds;
      ds.attachments = attachments.filter(attachment => ['cif', 'mmcif', 'mol', 'sdf', 'pdb', 'mol2'].includes(attachment.filename?.match(/\.([^.]+)$/)?.[1]?.toLowerCase()));
      if (ds.attachments.length > 0) return ds;
      return null;
    });

    datasetContainer = datasetContainer.filter(dc => dc !== null);
    if (datasetContainer?.length < 1) { return this.renderBtn(true); }
    return (
      <>
        {this.renderBtn(false)}
        {
          openModal ?
            <MolViewerListModal
              config={config}
              handleModalOpen={e => this.handleModalOpen(e)}
              show={openModal}
              title={el.short_label}
              datasetContainer={datasetContainer}
              isPublic={isPublic}
            /> : null
        }
      </>
    );
  }
}

MolViewerListBtn.propTypes = {
  container: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
  el: PropTypes.object.isRequired,
  isPublic: PropTypes.bool.isRequired,
};
