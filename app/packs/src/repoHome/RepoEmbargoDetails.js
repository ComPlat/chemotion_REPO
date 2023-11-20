import React, { Component } from 'react';
import EmbargoStore from 'src/stores/alt/repo/stores/EmbargoStore';
import RepoReactionDetails from 'src/repoHome/RepoReactionDetails';
import RepoSampleDetails from 'src/repoHome/RepoSampleDetails';

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
    const { elementType } = this.state;
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
            showComment={false}
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
            review_info={this.state.review_info}
            showComment={false}
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
