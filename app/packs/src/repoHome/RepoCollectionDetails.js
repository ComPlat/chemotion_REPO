import React, { Component } from 'react';
import RepoReactionDetails from 'src/repoHome/RepoReactionDetails';
import RepoSampleDetails from 'src/repoHome/RepoSampleDetails';

export default class RepoCollectionDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      element: props.element
    };
    this.loadSVG = this.loadSVG.bind(this);
  }

  componentDidMount() {
    const { element } = this.state;
    if (element) {
      this.loadSVG(element);
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.element !== prevProps.element) {
      this.loadSVG(this.props.element);
    }
  }

  loadSVG(element) {
    this.setState({ element });
  }

  switchTypeRender() {
    const { element } = this.props;
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
