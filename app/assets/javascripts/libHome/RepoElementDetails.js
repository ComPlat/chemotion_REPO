import React, { Component } from 'react';
import PublicStore from '../components/stores/PublicStore';
import { DatasetDetail } from './RepoCommon';
import RepoReactionDetails from './RepoReactionDetails';
import RepoSampleDetails from './RepoSampleDetails';

export default class RepoElementDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: {}
    };
    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onStoreChange);
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onStoreChange);
  }

  onStoreChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  switchTypeRender() {
    const { currentElement, elementType } = this.state;

    if (typeof (currentElement) === 'undefined' || !currentElement) {
      return <span />;
    }
    switch (elementType) {
      case 'dataset': return <DatasetDetail element={currentElement} />;
      case 'molecule': return (
        <RepoSampleDetails
          isPublished
          element={currentElement}
          reviewLevel={this.state.reviewLevel}
          isSubmitter={this.state.isSubmitter}
          history={this.state.historyInfo ? this.state.historyInfo : []}
        />);
      case 'reaction': return (
        <RepoReactionDetails
          isPublished
          reaction={currentElement}
          reviewLevel={this.state.reviewLevel}
          isSubmitter={this.state.isSubmitter}
          history={this.state.historyInfo ? this.state.historyInfo : []}
        />);
      default: return <span />;
    }
  }

  render() {
    return (
      <div style={{ border: 'none', maxHeight: '80%' }}>
        {this.switchTypeRender()}
      </div>
    );
  }
}
