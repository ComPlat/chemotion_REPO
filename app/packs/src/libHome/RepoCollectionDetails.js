import React, { Component } from 'react';
import EmbargoStore from '../components/stores/EmbargoStore';
import RepoReactionDetails from './RepoReactionDetails';
import RepoSampleDetails from './RepoSampleDetails';

export default class RepoCollectionDetails extends Component {
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
    const { element } = this.state;

    if (typeof (element) === 'undefined' || !element) {
      return <span />;
    }
    const elementType = element && element.elementType;

    switch (elementType) {
      case 'reaction': return <RepoReactionDetails isPublished reaction={element} />;
      case 'molecule': return <RepoSampleDetails isPublished element={element} />;
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
