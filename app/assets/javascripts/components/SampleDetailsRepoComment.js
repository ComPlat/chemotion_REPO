import React, { Component } from 'react';
import PropTypes from 'prop-types';
import RepositoryFetcher from './fetchers/RepositoryFetcher';
import LoadingActions from './actions/LoadingActions';
import PublicStore from '../components/stores/PublicStore';
import RepoSampleDetails from '../libHome/RepoSampleDetails';

export default class SampleDetailsRepoComment extends Component {
  constructor(props) {
    super(props);

    this.state = {
      element: null,
      reviewLevel: 0
    };
    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onStoreChange);
    LoadingActions.start();
    RepositoryFetcher.fetchSample(this.props.sampleId, false)
      .then((data) => {
        LoadingActions.stop();
        // refer to PublicStore.handleDisplayReviewSample
        if (data.sample && data.reviewLevel === 0) {
          console.log(data);
        } else {
          const publication = data.publication || {};
          this.setState({
            element: data,
            historyInfo: (publication.review && publication.review.history) || [],
            reviewLevel: data.reviewLevel
          });
        }
      }).catch((errorMessage) => {
        console.log(`SampleDetailsRepoComment_${errorMessage}`);
        LoadingActions.stop();
      });
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onStoreChange);
  }

  onStoreChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  render() {
    const { element } = this.state;
    return element && element.sample && element.publication ?
      (
        <RepoSampleDetails
          element={element}
          canComment
          reviewLevel={this.state.reviewLevel}
          history={this.state.historyInfo ? this.state.historyInfo : {}}
          canClose={false}
          buttons={['Comments']}
        />) : <div>No Publication found</div>;
  }
}

SampleDetailsRepoComment.propTypes = {
  sampleId: PropTypes.number.isRequired,
};
