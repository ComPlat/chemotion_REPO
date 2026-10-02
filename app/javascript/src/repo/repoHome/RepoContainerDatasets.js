/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ListGroup, Card } from 'react-bootstrap';
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
    // react-bootstrap can leave 'modal-open' on <body> after hiding, which blocks page scrolling.
    document.body.className = document.body.className.replace('modal-open', '');
  }

  render() {
    const { container, modal } = this.state;
    const { isPublic, element } = this.props;
    const kind = container.extended_metadata && container.extended_metadata.kind;

    if (container.children.length > 0) {
      return (
        <div>
          <ListGroup style={{ marginBottom: 20 }}>
            {container.children.map(datasetContainer => {
              return (
                <ListGroup.Item
                  key={`datasetContainer-${datasetContainer.id}`}
                  className="repo-analysis-listgroup"
                >
                  <ContainerDatasetField
                    datasetContainer={datasetContainer}
                    kind={kind}
                    disabled
                    handleModalOpen={() =>
                      this.handleModalOpen(datasetContainer)
                    }
                    handleUndo={() => {}}
                    isPublic={isPublic}
                  />
                </ListGroup.Item>
              );
            })}
          </ListGroup>
          <hr style={{ borderColor: 'grey' }} />
          {modal.show && (
            <ContainerDatasetModal
              datasetContainer={modal.datasetContainer}
              rootContainer={this.props.rootContainer}
              kind={kind}
              element={element}
              disabled
              onChange={() => {}}
              onHide={() => this.handleModalHide()}
              readOnly
              show={modal.show}
              isPublic={isPublic} // for REPO
            />
          )}
        </div>
      );
    }
    return (
      <div>
        <Card style={{ minHeight: 70, padding: 5, paddingBottom: 31 }}>
          <h5>There are currently no Datasets.</h5>
        </Card>
      </div>
    );
  }
}

RepoContainerDatasets.propTypes = {
  container: PropTypes.object.isRequired,
  rootContainer: PropTypes.object,
  element: PropTypes.object,
  isPublic: PropTypes.bool,
};

RepoContainerDatasets.defaultProps = { isPublic: true, rootContainer: {}, element: {} };
