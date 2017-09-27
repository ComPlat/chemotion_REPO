import React, { Component } from 'react';
import PublicStore from '../components/stores/PublicStore';
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
      case 'reaction': return <RepoReactionDetails reaction={currentElement.reaction} />;
      case 'sample': return <RepoSampleDetails element={currentElement} />;
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
