import React, { Component } from 'react';
import EmbargoStore from 'src/repo/stores/EmbargoStore';
import EmbargoActions from 'src/repo/actions/EmbargoActions';
import RepoReactionDetails from 'src/repo/repoHome/RepoReactionDetails';
import RepoSampleDetails from 'src/repo/repoHome/RepoSampleDetails';

export default class RepoEmbargoDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    };

    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    EmbargoStore.listen(this.onStoreChange);
  }

  componentWillUnmount() {
    EmbargoStore.unlisten(this.onStoreChange);
  }

  onStoreChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  switchTypeRender() {
    const { elementType, queryId } = this.state;
    const { currentElement } = this.props;

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
            isReview={false}
            review={this.state.review}
            onRefresh={() => EmbargoActions.displayReviewEmbargo(
              'reaction',
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
            onRefresh={() => EmbargoActions.displayReviewEmbargo(
              'sample',
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
      </div>);
  }
}
