import React, { Component } from 'react';
import { ListGroup, ListGroupItem, Well } from 'react-bootstrap';
import ContainerDatasetModal from '../components/ContainerDatasetModal';
import ContainerDatasetField from '../components/ContainerDatasetField';

export default class RepoContainerDatasets extends Component {
  constructor(props) {
    super(props);
    const { container } = props;
    this.state = {
      container,
      modal: {
        show: false,
        dataset_container: null
      }
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      container: nextProps.container
    });
  }

  handleModalOpen(datasetContainer) {
    const { modal } = this.state;
    modal.dataset_container = datasetContainer;
    modal.show = true;
    this.setState({ modal });
  }

  handleModalHide() {
    const { modal } = this.state;
    modal.show = false;
    modal.dataset_container = null;
    this.setState({ modal });
    // https://github.com/react-bootstrap/react-bootstrap/issues/1137
    document.body.className = document.body.className.replace('modal-open', '');
  }

  render() {
    const { container, modal } = this.state;

    if (container.children.length > 0) {
      return (
        <div>
          <ListGroup style={{ marginBottom: 20 }}>
            {container.children.map((datasetContainer) => {
              return (
                <ListGroupItem key={`datasetContainer-${datasetContainer.id}`} style={{ border: 'none', backgroundColor: 'transparent' }}>
                  <ContainerDatasetField
                    dataset_container={datasetContainer}
                    handleModalOpen={() => this.handleModalOpen(datasetContainer)}
                    disabled
                  />
                </ListGroupItem>
              );
            })}
          </ListGroup>
          <hr style={{ borderColor: '#ddd' }} />
          <ContainerDatasetModal
            onHide={() => this.handleModalHide()}
            show={modal.show}
            readOnly
            dataset_container={modal.dataset_container}
            disabled
          />
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
