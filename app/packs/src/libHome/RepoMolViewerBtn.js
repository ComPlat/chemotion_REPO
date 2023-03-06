import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';
import RepoMolViewerModal from './RepoMolViewerModal';

const viewButtonTip = _short => <Tooltip id={uuid.v4()}>{_short}</Tooltip>;

export default class RepoMolViewerBtn extends Component {
  constructor(props) {
    super(props);
    this.state = { show: false };
    this.handleModalOpen = this.handleModalOpen.bind(this);
  }

  handleModalOpen(e) {
    if (e) { e.stopPropagation(); }
    const { show } = this.state;
    this.setState({ show: !show });
  }

  render() {
    const { fileContent, isPublic } = this.props;
    const { show } = this.state;

    const tooltip = viewButtonTip('Click to see structure in Viewer');

    return (
      <>
        <OverlayTrigger placement="top" overlay={tooltip}>
          <Button className="button-right" bsSize="xsmall" bsStyle="info" onClick={e => this.handleModalOpen(e, true)}>
            <i className="fa fa-cube" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        {
          show ?
            <RepoMolViewerModal
              fileContent={fileContent}
              handleModalOpen={e => this.handleModalOpen(e, false)}
              show={show}
              isPublic={isPublic}
            /> : null
        }
      </>
    );
  }
}

RepoMolViewerBtn.propTypes = {
  fileContent: PropTypes.string.isRequired,
  isPublic: PropTypes.bool.isRequired,
};
