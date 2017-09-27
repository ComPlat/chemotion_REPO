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
      reviewLevel: 0,
      pubState: '',
      submitter: ''
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
          let comments = {};
          let summary = '';
          let feedback = '';
          let pubState = '';

          if (data.sample && data.publication) {
            const { publication } = data;
            pubState = publication.state;

            if (publication.review) {
              const pr = publication.review;
              comments = pr.comments ? pr.comments : {};
              summary = pr.summary ? pr.summary : '';
              feedback = pr.feedback ? pr.feedback : '';
            }
          }
          this.setState({
            element: data,
            commentInfo: comments,
            summaryInfo: summary,
            feedbackInfo: feedback,
            submitter: data.pub_name,
            reviewLevel: data.reviewLevel,
            pubState
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
          submitter={this.state.submitter}
          pubState={this.state.pubState}
          comments={this.state.commentInfo ? this.state.commentInfo : {}}
          summary={this.state.summaryInfo ? this.state.summaryInfo : ''}
          feedback={this.state.feedbackInfo ? this.state.feedbackInfo : ''}
          canClose={false}
          buttons={['Comments']}
        />) : <div>No Publication found</div>;
  }
}

SampleDetailsRepoComment.propTypes = {
  sampleId: PropTypes.number.isRequired,
};
