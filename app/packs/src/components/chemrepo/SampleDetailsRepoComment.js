import React, { Component } from 'react';
import PropTypes from 'prop-types';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ReviewStore from 'src/stores/alt/repo/stores/ReviewStore';
import RepoSampleDetails from 'src/repoHome/RepoSampleDetails';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';

export default class SampleDetailsRepoComment extends Component {
  constructor(props) {
    super(props);

    this.state = {
      element: null,
      review_info: {}
    };
    this.onStoreChange = this.onStoreChange.bind(this);
    this.handleReviewUpdate = this.handleReviewUpdate.bind(this);
  }

  componentDidMount() {
    ReviewStore.listen(this.onStoreChange);
    LoadingActions.start();
    ReviewActions.fetchSample(this.props.sampleId);
  }

  componentWillUnmount() {
    ReviewStore.unlisten(this.onStoreChange);
  }

  onStoreChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleReviewUpdate(review) {
    this.setState({ review });
  }

  render() {
    const { element, review_info } = this.state;
    return element && element.sample && element.publication ?
      (
        <RepoSampleDetails
          element={element}
          canComment
          review_info={review_info}
          onReviewUpdate={this.handleReviewUpdate}
          review={this.state.review || {}}
          canClose={false}
          buttons={['Comments']}
        />) : <div>No Publication found</div>;
  }
}

SampleDetailsRepoComment.propTypes = {
  sampleId: PropTypes.number.isRequired,
};
