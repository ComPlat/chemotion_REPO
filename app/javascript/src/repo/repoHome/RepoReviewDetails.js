import React, { Component } from 'react';
import ReviewStore from 'src/repo/stores/ReviewStore';
import ReviewActions from 'src/repo/actions/ReviewActions';
import RepoReactionDetails from 'src/repo/repoHome/RepoReactionDetails';
import RepoSampleDetails from 'src/repo/repoHome/RepoSampleDetails';

export default class RepoReviewDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element,
      review: {},
      btnAction: '',
      review_info: {},
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
    const { currentElement, elementType, queryId } = this.state;
    if (typeof (currentElement) === 'undefined' || !currentElement) {
      return <span />;
    }
    switch (elementType) {
      case 'reaction':
        return (
          <RepoReactionDetails
            reaction={currentElement.reaction}
            canComment
            review_info={this.state.review_info}
            btnAction={this.state.btnAction}
            isReview={true}
            review={this.state.review}
            onRefresh={() => ReviewActions.displayReviewReaction(
              queryId ?? currentElement.reaction?.id,
            )}
          />);
      case 'sample':
        return (
          <RepoSampleDetails
            element={currentElement}
            canComment
            btnAction={this.state.btnAction}
            review_info={this.state.review_info}
            review={this.state.review}
            onRefresh={() => ReviewActions.displayReviewSample(
              queryId ?? currentElement.id,
            )}
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
