import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReviewStore from 'src/stores/alt/repo/stores/ReviewStore';
import ReviewActions from 'src/stores/alt/repo/actions/ReviewActions';
import RepoReactionDetails from 'src/repoHome/RepoReactionDetails';

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
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleReviewUpdate(review) {
    this.setState({ review });
  }

  render() {
    const { reaction, review_info } = this.state;
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
