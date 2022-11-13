import React, { Component } from 'react';
import PublicStore from '../components/stores/PublicStore';
import EmbargoStore from '../components/stores/EmbargoStore';
import ReviewStore from '../components/stores/ReviewStore';
import RepoReactionDetails from './RepoReactionDetails';
import RepoSampleDetails from './RepoSampleDetails';

export default class RepoEmbargoDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    };

    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onStoreChange);
    EmbargoStore.listen(this.onStoreChange);
    // ReviewStore.listen(this.onStoreChange);
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onStoreChange);
    EmbargoStore.listen(this.onStoreChange);
    // ReviewStore.listen(this.onStoreChange);
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
      case 'reaction':
        return (
          <RepoReactionDetails
            reaction={currentElement.reaction}
            canComment
            reviewLevel={this.state.reviewLevel}
            isSubmitter={this.state.isSubmitter}
            btnAction={this.state.btnAction}
            isReview={false}
            review={this.state.review}
          />);
      case 'sample':
        return (
          <RepoSampleDetails
            element={currentElement}
            canComment
            btnAction={this.state.btnAction}
            reviewLevel={this.state.reviewLevel}
            isSubmitter={this.state.isSubmitter}
            review={this.state.review}
          />);
      default: return <span />;
    }
  }

  render() {
    return (
      <div style={{ border: 'none' }}>
        {this.switchTypeRender()}
      </div>);
  }
}
