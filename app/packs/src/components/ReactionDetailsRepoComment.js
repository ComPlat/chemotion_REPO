import React, { Component } from 'react';
import PropTypes from 'prop-types';
import RepositoryFetcher from './fetchers/RepositoryFetcher';
import LoadingActions from './actions/LoadingActions';
import PublicStore from '../components/stores/PublicStore';
import RepoReactionDetails from '../libHome/RepoReactionDetails';

export default class ReactionDetailsRepoComment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      reaction: null,
      reviewLevel: 0,
    };
    this.onStoreChange = this.onStoreChange.bind(this);
    this.handleReviewUpdate = this.handleReviewUpdate.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onStoreChange);
    LoadingActions.start();
    RepositoryFetcher.fetchReaction(this.props.reactionId, false)
      .then((data) => {
        LoadingActions.stop();
        if (data.reaction && data.reaction.reviewLevel === 0) {
          //console.log(data);
        } else {
          let review = {};
          if (data.reaction && data.reaction.publication) {
            const { publication } = data.reaction;
            review = publication.review || {};
          }
          this.setState({
            reaction: data.reaction,
            reviewLevel: data.reviewLevel,
            isSubmitter: data.isSubmitter || false,
            review,
          });
        }
      }).catch((errorMessage) => {
        console.log(`ReactionDetailsRepoComment_${errorMessage}`);
        LoadingActions.stop();
      });
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onStoreChange);
  }

  onStoreChange(state) {
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
          reviewLevel={this.state.reviewLevel}
          isSubmitter={this.state.isSubmitter}
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
