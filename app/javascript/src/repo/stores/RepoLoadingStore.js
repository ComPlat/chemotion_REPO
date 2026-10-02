import alt from 'src/stores/alt/alt';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';
import PublicActions from 'src/repo/actions/PublicActions';
import ReviewActions from 'src/repo/actions/ReviewActions';
import EmbargoActions from 'src/repo/actions/EmbargoActions';
import RepositoryActions from 'src/repo/actions/RepositoryActions';

// Loader state for guest pages (publication search, review, embargo).
// Kept separate from the mydb LoadingStore so repo flows don't share a
// boolean with element CRUD/inbox/etc.
class RepoLoadingStore {
  constructor() {
    this.loading = false;
    this.state = { filePool: [] };

    this.bindListeners({
      handleStart: RepoLoadingActions.start,
      handleStop: [
        RepoLoadingActions.stop,
        PublicActions.getSearchReactions,
        PublicActions.getSearchMolecules,
        PublicActions.getReactions,
        PublicActions.getMolecules,
        PublicActions.displayMolecule,
        PublicActions.displayReaction,
        PublicActions.openRepositoryPage,
        ReviewActions.updateComment,
        ReviewActions.reviewPublish,
        ReviewActions.fetchSample,
        ReviewActions.displayReviewReaction,
        EmbargoActions.fetchEmbargoBundle,
        RepositoryActions.publishSample,
        RepositoryActions.publishReaction,
        RepositoryActions.reviewPublish,
      ],
      handleStartLoadingWithProgress: RepoLoadingActions.startLoadingWithProgress,
      handleStopLoadingWithProgress: RepoLoadingActions.stopLoadingWithProgress,
      handleUpdateLoadingProgress: RepoLoadingActions.updateLoadingProgress,
    });
  }

  handleStart() {
    this.setState({ loading: true });
  }

  handleStop() {
    this.setState({ loading: false });
  }

  handleStartLoadingWithProgress(filename) {
    let { filePool } = this.state;
    if (!filePool) {
      filePool = [{ filename, progress: 0 }];
    } else if (filePool.every((f) => f.filename !== filename)) {
      filePool.push({ filename, progress: 0 });
    }
    if (filePool.length > 0) {
      this.setState({ loadingWithProgress: true, filePool });
    }
  }

  handleStopLoadingWithProgress(filename) {
    const { filePool } = this.state;
    if (!filePool) return;

    const remaining = filePool.filter((f) => f.filename !== filename);
    if (remaining.length === 0) {
      this.setState({ loadingWithProgress: false, filePool: [] });
    } else {
      this.setState({ filePool: remaining });
    }
  }

  handleUpdateLoadingProgress({ filename, progress }) {
    const { filePool } = this.state;
    if (!filePool) return;

    const next = filePool.map((f) => (f.filename === filename ? { ...f, progress } : f));
    this.setState({ filePool: next });
  }
}

export default alt.createStore(RepoLoadingStore, 'RepoLoadingStore');
