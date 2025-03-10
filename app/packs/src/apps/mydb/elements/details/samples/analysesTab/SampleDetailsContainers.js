import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import Container from 'src/models/Container';
import UIStore from 'src/stores/alt/stores/UIStore';
import ArrayUtils from 'src/utilities/ArrayUtils';
import { reOrderArr } from 'src/utilities/DndControl';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';

import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';
import {
  RndNotAvailable, RndNoAnalyses,
  RndOrder, RndEdit
} from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersCom';

import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

export default class SampleDetailsContainers extends Component {
  constructor(props) {
    super();
    this.state = {
      activeAnalysis: UIStore.getState().sample.activeAnalysis,
      mode: 'edit',
    };
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.addButton = this.addButton.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleCommentTextChange = this.handleCommentTextChange.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.toggleAddToReport = this.toggleAddToReport.bind(this);
    this.toggleMode = this.toggleMode.bind(this);
    this.isEqCId = this.isEqCId.bind(this);
    this.indexedContainers = this.indexedContainers.bind(this);
    this.buildEmptyAnalyContainer = this.buildEmptyAnalyContainer.bind(this);
    this.sortedContainers = this.sortedContainers.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
    TextTemplateActions.fetchTextTemplates('sample');
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  onUIStoreChange(state) {
    if (state.sample.activeAnalysis !== this.state.activeAnalysis) {
      this.setState({ activeAnalysis: state.sample.activeAnalysis });
    }
  }

  handleChange(container) {
    const { sample } = this.props;
    // const analyses = sample.container.children.find(child => (
    //   child.container_type === 'analyses'
    // ));
    // analyses.children.map((child, ind) => {
    //   if (child.container_type === 'analysis' && child.id === container.id) {
    //     analyses.children[ind] = container;
    //   }
    //   return null;
    // });

    this.props.handleSampleChanged(sample);
  }

  handleCommentTextChange(e) {
    const { sample } = this.props;

    sample.container.description = e.target.value;

    this.handleChange(sample.container);
  }

  handleAdd() {
    const { sample } = this.props;
    const newContainer = this.buildEmptyAnalyContainer();

    const sortedConts = this.sortedContainers(sample);
    const newSortConts = [...sortedConts, newContainer];
    const newIndexedConts = this.indexedContainers(newSortConts);

    sample.analysesContainers()[0].children = newIndexedConts;
    this.props.setState(prevState => ({ ...prevState, sample }),
      this.handleAccordionOpen(newContainer.id),
    );
  }

  handleMove(source, target) {
    const { sample } = this.props;

    const sortedConts = this.sortedContainers(sample);
    const newSortConts = reOrderArr(source, target, this.isEqCId, sortedConts);
    const newIndexedConts = this.indexedContainers(newSortConts);

    sample.analysesContainers()[0].children = newIndexedConts;
    this.props.setState(prevState => ({ ...prevState, sample }));
  }

  sortedContainers(sample) {
    const containers = sample.analysesContainers()[0].children;
    return ArrayUtils.sortArrByIndex(containers);
  }

  buildEmptyAnalyContainer() {
    const newContainer = Container.buildEmpty();
    newContainer.container_type = "analysis";
    newContainer.extended_metadata.content = { ops: [{ insert: '\n' }] };
    return newContainer;
  }

  isEqCId(container, tagEl) {
    return container.id === tagEl.cId;
  }

  indexedContainers(containers) {
    return containers.map((c, i) => {
      const container = c;
      container.extended_metadata.index = i;
      return container;
    });
  }

  handleRemove(container) {
    const { sample } = this.props;
    container.is_deleted = true;

    this.props.setState(prevState => ({ ...prevState, sample }));
  }

  handleUndo(container) {
    const { sample } = this.props;
    container.is_deleted = false;

    this.props.setState(prevState => ({ ...prevState, sample }));
  }

  handleAccordionOpen(newKey) {
    this.setState((prevState) => {
      const prevKey = prevState.activeAnalysis;
      return {
        ...prevState,
        mode: 'edit',
        activeAnalysis: prevKey === newKey ? 0 : newKey,
      };
    });
  }

  addButton() {
    const { readOnly, sample } = this.props;
    if (readOnly) {
      return null;
    }
    return (
      <Button
        className="button-right"
        bsSize="xsmall"
        bsStyle="success"
        onClick={this.handleAdd}
        disabled={!sample.can_update}
      >
        <i className="fa fa-plus" />&nbsp;
        Add analysis
      </Button>
    );
  }

  toggleAddToReport(container) {
    if (this.props.publish) {
      // TODO: use null and true because the Boolean value is coerced into string: check why
      // container.extended_metadata.publish = container.extended_metadata.publish ? null : true;
      if (container.extended_metadata.publish && (container.extended_metadata.publish === true || container.extended_metadata.publish === 'true')) {
        container.extended_metadata.publish = false;
      } else {
        container.extended_metadata.publish = true;
      }
    } else {
      container.extended_metadata.report = !container.extended_metadata.report;
    }
    this.handleChange(container);
  }

  toggleMode() {
    const { mode } = this.state;
    if (mode === 'edit') {
      this.setState({ mode: 'order' });
    } else {
      this.setState({ mode: 'edit' });
    }
  }

  render() {
    const { activeAnalysis, mode } = this.state;
    const {
      readOnly, sample, handleSubmit, handleSampleChanged,
    } = this.props;
    const isDisabled = !sample.can_update;

    if (sample.container == null) return <RndNotAvailable />;

    const analyContainer = sample.analysesContainers();

    if (analyContainer.length === 1 && analyContainer[0].children.length > 0) {
      const orderContainers = ArrayUtils.sortArrByIndex(analyContainer[0].children);
      let content = null;

      if (mode === 'order') {
        content = (
          <RndOrder
            sample={sample}
            mode={mode}
            orderContainers={orderContainers}
            readOnly={readOnly}
            isDisabled={isDisabled}
            addButton={this.addButton}
            handleRemove={this.handleRemove}
            handleSubmit={handleSubmit}
            handleMove={this.handleMove}
            handleAccordionOpen={this.handleAccordionOpen}
            handleUndo={this.handleUndo}
            toggleAddToReport={this.toggleAddToReport}
            toggleMode={this.toggleMode}
            publish={this.props.publish}
          />
        );
      } else {
        content = (
          <RndEdit
            sample={sample}
            mode={mode}
            orderContainers={orderContainers}
            activeAnalysis={activeAnalysis}
            handleChange={this.handleChange}
            handleCommentTextChange={this.handleCommentTextChange}
            handleUndo={this.handleUndo}
            handleRemove={this.handleRemove}
            handleSubmit={handleSubmit}
            handleAccordionOpen={this.handleAccordionOpen}
            toggleAddToReport={this.toggleAddToReport}
            readOnly={readOnly}
            isDisabled={isDisabled}
            addButton={this.addButton}
            toggleMode={this.toggleMode}
            publish={this.props.publish}
            isReviewer={this.props.isReviewer || false}
          />
        );
      }

      return (
        <div>
          {content}
          <ViewSpectra
            sample={sample}
            handleSampleChanged={handleSampleChanged}
            handleSubmit={handleSubmit}
          />
          <NMRiumDisplayer
            sample={sample}
            handleSampleChanged={handleSampleChanged}
            handleSubmit={handleSubmit}
          />
        </div>
      );
    }
    return (
      <RndNoAnalyses
        addButton={this.addButton}
      />
    );
  }
}

SampleDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  sample: PropTypes.object.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  isReviewer: PropTypes.bool,
};

SampleDetailsContainers.defaultProps = {
  readOnly: false,
  isReviewer: false
}
