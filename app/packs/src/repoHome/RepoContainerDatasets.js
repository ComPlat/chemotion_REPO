/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ListGroup, ListGroupItem, Well } from 'react-bootstrap';
import ContainerDatasetModal from 'src/components/container/ContainerDatasetModal';
import ContainerDatasetField from 'src/components/container/ContainerDatasetField';

export default class RepoContainerDatasets extends Component {
  constructor(props) {
    super(props);
    const { container } = props;
    this.state = {
      container,
      modal: {
        show: false,
        datasetContainer: {},
      },
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.container !== prevState.container) {
      return {
        container: nextProps.container,
      };
    }
    // Return null to indicate no change to state
    return null;
  }

  handleModalOpen(datasetContainer) {
    const { modal } = this.state;
    modal.datasetContainer = datasetContainer || {};
    modal.show = true;
    this.setState({ modal });
  }

  handleModalHide() {
    const { modal } = this.state;
    modal.show = false;
    modal.datasetContainer = {};
    this.setState({ modal });
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  render() {
    const { container, modal } = this.state;
    const { isPublic } = this.props;

    if (container.children.length > 0) {
      return (
        <div>
          <ListGroup style={{ marginBottom: 20 }}>
            {container.children.map(datasetContainer => {
              return (
                <ListGroupItem
                  key={`datasetContainer-${datasetContainer.id}`}
                  className="repo-analysis-listgroup"
                >
                  <ContainerDatasetField
                    datasetContainer={datasetContainer}
                    disabled
                    handleModalOpen={() =>
                      this.handleModalOpen(datasetContainer)
                    }
                    handleUndo={() => {}}
                    isPublic={isPublic}
                  />
                </ListGroupItem>
              );
            })}
          </ListGroup>
          <hr style={{ borderColor: '#ddd' }} />
          {modal.show && (
            <ContainerDatasetModal
              datasetContainer={modal.datasetContainer}
              disabled
              onChange={() => {}}
              onHide={() => this.handleModalHide()}
              readOnly
              show={modal.show}
            />
          )}
        </div>
      );
    }
    return (
      <div>
        <Well style={{ minHeight: 70, padding: 5, paddingBottom: 31 }}>
          <h5>There are currently no Datasets.</h5>
        </Well>
      </div>
    );
  }
}

RepoContainerDatasets.propTypes = {
  container: PropTypes.object.isRequired,
  isPublic: PropTypes.bool,
};

RepoContainerDatasets.defaultProps = { isPublic: true };
