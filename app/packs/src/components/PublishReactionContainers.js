import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  PanelGroup,
  Panel,
  Button,
} from 'react-bootstrap';
import ContainerComponent from './ContainerComponent';
import PrintCodeButton from './common/PrintCodeButton';
import Reaction from './models/Reaction';

export default class PublishReactionContainers extends Component {
  constructor(props) {
    super();
    const { reaction } = props;
    this.state = {
      reaction,
      activeContainer: 0
    };

    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      reaction: nextProps.reaction,
    });
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  render() {
    const {reaction, activeContainer} = this.state;
    const {readOnly} = this.props;

    let containerHeader = (container) => {
      const kind = container.extended_metadata['kind'] && container.extended_metadata['kind'] != '';
      const titleKind = kind ? (' - Type: ' + container.extended_metadata['kind']) : '';

      const status = container.extended_metadata['status'] && container.extended_metadata['status'] != '';
      const titleStatus = status ? (' - Status: ' + container.extended_metadata['status']) : '';

      return (
        <div style={{width: '100%'}}>
          {container.name}
          {titleKind}
          {titleStatus}
          <Button
            bsSize="xsmall"
            bsStyle="danger"
            className="button-right"
            disabled={readOnly}
            onClick={() => this.handleOnClickRemove(container)}
          >
            <i className="fa fa-trash" />
          </Button>
          <PrintCodeButton element={reaction} analyses={[container]} ident={container.id} />
        </div>
      )
    };

    let containerHeaderDeleted = (container) => {
      const kind = container.extended_metadata['kind'] && container.extended_metadata['kind'] != '';
      const titleKind = kind ? (' - Type: ' + container.extended_metadata['kind']) : '';

      const status = container.extended_metadata['status'] && container.extended_metadata['status'] != '';
      const titleStatus = status ? (' - Status: ' + container.extended_metadata['status']) : '';

      return (
        <div style={{width: '100%'}}>
          <strike>
            {container.name}
            {titleKind}
            {titleStatus}
          </strike>
          <Button className="pull-right" bsSize="xsmall" bsStyle="danger"
                  onClick={() => this.handleUndo(container)}>
            <i className="fa fa-undo"></i>
          </Button>
        </div>
      )
    };

    if (reaction.container != null && reaction.container.children) {
      const analyses_container = reaction.container.children.filter(element => (
        ~element.container_type.indexOf('analyses')
      ));

      if (analyses_container.length === 1 && analyses_container[0].children.length > 0) {
        return (
          <div>
            <PanelGroup defaultActiveKey={0} activeKey={activeContainer} accordion>
              {analyses_container[0].children.map((container, key) => {
                if (container.is_deleted) {
                  return (
                    <Panel
                      eventKey={key}
                      key={`reaction_container_deleted_${container.id}`}
                    >
                      <Panel.Heading>{containerHeaderDeleted(container)}</Panel.Heading>
                    </Panel>
                  );
                }

                return (
                  <Panel
                    eventKey={key}
                    key={`reaction_container_${container.id}`}
                    onClick={this.handleAccordionOpen.bind(this, key)}
                  >
                    <Panel.Heading>{containerHeader(container)}</Panel.Heading>
                    <Panel.Body collapsible>
                      <ContainerComponent
                        readOnly={readOnly}
                        container={container}
                        onChange={this.handleChange.bind(this, container)}
                      />
                    </Panel.Body>
                  </Panel>
                );
              })}
            </PanelGroup>
          </div>
        );
      }

      return (
        <div
          style={{ marginBottom: '10px' }}
          className="noAnalyses-warning"
        >
          There are currently no Analyses.
        </div>
      );
    }

    return (
      <div className="noAnalyses-warning">
        There are currently no Analyses.
      </div>
    );
  }
}

PublishReactionContainers.propTypes = {
  readOnly: PropTypes.bool.isRequired,
  reaction: PropTypes.instanceOf(Reaction).isRequired,
};
