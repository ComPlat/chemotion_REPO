import React, { Component } from 'react';
import PublicStore from 'src/stores/alt/repo/stores/PublicStore';
import { DatasetDetail } from './RepoCommon';
import RepoReactionDetails from './RepoReactionDetails';
import RepoSampleDetails from './RepoSampleDetails';

export default class RepoElementDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: PublicStore.getState().currentElement,
      elementType: PublicStore.getState().elementType
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
    const { currentElement, elementType, listType } = this.state;
    if (typeof (currentElement) === 'undefined' || !currentElement) {
      return <span />;
    }
    switch (elementType) {
      case 'dataset': return <DatasetDetail isPublished element={currentElement} />;
      case 'molecule': return (
        <RepoSampleDetails
          isPublished
          element={currentElement}
          review_info={this.state.review_info}
          review={this.state.review || {}}
          listType={listType}
        />);
      case 'reaction': return (
        <RepoReactionDetails
          isPublished
          reaction={currentElement}
          review_info={this.state.review_info}
          review={this.state.review || {}}
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
