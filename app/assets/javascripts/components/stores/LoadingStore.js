import alt from '../alt';
import LoadingActions from '../actions/LoadingActions';
import ReportActions from '../actions/ReportActions';
import ElementActions from '../actions/ElementActions';
import InboxActions from '../actions/InboxActions';
import RepositoryActions from '../actions/RepositoryActions';
import PublicActions from '../actions/PublicActions';

class LoadingStore {
  constructor() {
    this.loading = false;

    this.bindListeners({
      handleStart: LoadingActions.start,
      handleStop:
        [
          LoadingActions.stop,
          ReportActions.clone,
          ReportActions.updateCheckedTags,
          ReportActions.loadRreview,
          ElementActions.createSampleForReaction,
          ElementActions.updateSampleForReaction,
          ElementActions.updateSampleForWellplate,
          ElementActions.createSample,
          ElementActions.updateSample,
          ElementActions.createReaction,
          ElementActions.updateReaction,
          ElementActions.createResearchPlan,
          ElementActions.updateResearchPlan,
          InboxActions.fetchInbox,
          RepositoryActions.reviewPublish,
          PublicActions.updateComment,
          PublicActions.reviewPublish,
        ],
    });
  }

  handleStart() {
    this.setState({ loading: true });
  }

  handleStop() {
    this.setState({ loading: false });
  }
}

export default alt.createStore(LoadingStore, 'LoadingStore');
