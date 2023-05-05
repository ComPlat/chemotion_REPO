import React, { Component } from 'react';
import PropTypes from 'prop-types';
import RepositoryFetcher from './fetchers/RepositoryFetcher';
import LoadingActions from './actions/LoadingActions';
import ReviewStore from '../components/stores/ReviewStore';
import ReviewActions from '../components/actions/ReviewActions';
import RepoReactionDetails from '../libHome/RepoReactionDetails';

export default class ReactionDetailsRepoComment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      reaction: null
    };
    this.onStoreChange = this.onStoreChange.bind(this);
    this.handleReviewUpdate = this.handleReviewUpdate.bind(this);
  }

  componentDidMount() {
    ReviewStore.listen(this.onStoreChange);
    ReviewActions.displayReviewReaction(this.props.reactionId);
  }

  componentWillUnmount() {
    ReviewStore.unlisten(this.onStoreChange);
  }

  onStoreChange(state) {
    console.log(state);
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleReviewUpdate(review) {
    this.setState({ review });
  }

  render() {
    const { reaction } = this.state;
    return reaction && reaction.publication ?
      (
        <RepoReactionDetails
          reaction={reaction}
          canComment
          review_info={review_info}
          onReviewUpdate={this.handleReviewUpdate}
          review={this.state.review || {}}
          canClose={false}
          buttons={['Comments']}
        />) : <div>No Publication found</div>;
  }
}

ReactionDetailsRepoComment.propTypes = {
  reactionId: PropTypes.number.isRequired,
};
