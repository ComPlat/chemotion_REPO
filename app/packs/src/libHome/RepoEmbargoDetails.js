import React, { Component } from 'react';
import EmbargoStore from '../components/stores/EmbargoStore';
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
            reviewLevel={this.state.reviewLevel}
            isSubmitter={this.state.isSubmitter}
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
            reviewLevel={this.state.reviewLevel}
            isSubmitter={this.state.isSubmitter}
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
