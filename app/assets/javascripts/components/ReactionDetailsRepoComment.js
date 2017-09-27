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
      pubState: '',
      submitter: ''
    };
    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onStoreChange);
    LoadingActions.start();
    RepositoryFetcher.fetchReaction(this.props.reactionId, false)
      .then((data) => {
        LoadingActions.stop();
        // refer to PublicStore.handleDisplayReviewReaction
        if (data.reaction && data.reaction.reviewLevel === 0) {
          console.log(data);
        } else {
          let comments = {};
          let summary = '';
          let feedback = '';
          let pubState = '';

          if (data.reaction && data.reaction.publication) {
            const { publication } = data.reaction;
            pubState = publication.state;

            if (publication.review) {
              const pr = publication.review;
              comments = pr.comments ? pr.comments : {};
              summary = pr.summary ? pr.summary : '';
              feedback = pr.feedback ? pr.feedback : '';
            }
          }
          this.setState({
            reaction: data.reaction,
            reviewLevel: data.reviewLevel,
            commentInfo: comments,
            summaryInfo: summary,
            feedbackInfo: feedback,
            pubState,
            submitter: data.pub_name,
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

  render() {
    const { reaction } = this.state;
    return reaction && reaction.publication ?
      (
        <RepoReactionDetails
          reaction={reaction}
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

ReactionDetailsRepoComment.propTypes = {
  reactionId: PropTypes.number.isRequired,
};
