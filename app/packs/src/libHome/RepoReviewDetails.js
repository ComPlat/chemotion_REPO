import React, { Component } from 'react';
import ReviewStore from '../components/stores/ReviewStore';
import RepoReactionDetails from './RepoReactionDetails';
import RepoSampleDetails from './RepoSampleDetails';

export default class RepoReviewDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element,
      review: {},
      btnAction: '',
      reviewLevel: 0,
      isSubmitter: false
    };

    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    ReviewStore.listen(this.onStoreChange);
  }

  componentWillUnmount() {
    ReviewStore.unlisten(this.onStoreChange);
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
            isReview={true}
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
      </div>
    );
  }
}
