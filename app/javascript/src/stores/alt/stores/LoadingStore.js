import alt from 'src/stores/alt/alt';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import PredictionActions from 'src/stores/alt/actions/PredictionActions';
import RepositoryActions from 'src/repo/actions/RepositoryActions';


class LoadingStore {
  constructor() {
    this.loading = false;
    this.state = { filePool: [] };

    this.bindListeners({
      handleStart: LoadingActions.start,
      handleStop:
        [
          LoadingActions.stop,
          ReportActions.clone,
          ReportActions.updateCheckedTags,
          ReportActions.loadReview,
          ElementActions.createGenericEl,
          ElementActions.updateGenericEl,
          ElementActions.createSampleForReaction,
          ElementActions.updateSampleForReaction,
          ElementActions.updateSampleForWellplate,
          ElementActions.createSample,
          ElementActions.updateSample,
          ElementActions.createReaction,
          ElementActions.updateReaction,
          ElementActions.createResearchPlan,
          ElementActions.updateResearchPlan,
          ElementActions.createScreen,
          ElementActions.updateScreen,
          ElementActions.updateEmbeddedResearchPlan,
          ElementActions.createWellplate,
          ElementActions.updateWellplate,
          ElementActions.importWellplateSpreadsheet,
          ElementActions.createDeviceDescription,
          ElementActions.updateDeviceDescription,
          ElementActions.createVessel,
          ElementActions.createVesselTemplate,
          ElementActions.updateVessel,
          ElementActions.updateVesselTemplate,
          ElementActions.createSequenceBasedMacromoleculeSample,
          ElementActions.updateSequenceBasedMacromoleculeSample,
          ElementActions.storeMetadata,
          InboxActions.fetchInbox,
          InboxActions.fetchInboxContainer,
          InboxActions.fetchInboxUnsorted,
          PredictionActions.infer,
          // Resubmit-for-publication starts this mydb spinner via
          // LoadingActions.start() in ReactionDetails/SampleDetailsRepoHelper,
          // so its stop must live here too (fires on reviewPublish success and
          // error). The repo refactor moved this binding to RepoLoadingStore
          // but that store's spinner is never started on this path.
          RepositoryActions.reviewPublish,
        ],
      handleStartLoadingWithProgress: LoadingActions.startLoadingWithProgress,
      handleStopLoadingWithProgress: LoadingActions.stopLoadingWithProgress,
      handleUpdateLoadingProgress: LoadingActions.updateLoadingProgress,
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
      filePool = [{ filename: filename, progress: 0 }];
    }
    else {
      const filter = filePool.filter(value => value.filename === filename);
      if (filter.length === 0) {
        const value = { filename: filename, progress: 0 };
        filePool.push(value);
      }
    }

    if (filePool.length > 0) {
      this.setState({ loadingWithProgress: true, filePool: filePool });
    }
  }

  handleStopLoadingWithProgress(filename) {
    const { filePool } = this.state;
    if (filePool) {
      filePool.forEach((file, index, object) => {
        if (file.filename === filename) {
          object.splice(index, 1);
        }
      });

      if (filePool.length === 0) {
        this.setState({ loadingWithProgress: false, filePool: [] });
      }
      else {
        this.setState({ filePool: filePool });
      }
    }
  }

  handleUpdateLoadingProgress(value) {
    const { filePool } = this.state;
    if (filePool) {
      filePool.forEach(file => {
        if (file.filename === value.filename) {
          file.progress = value.progress;
        }
      });
      this.setState({ filePool: filePool });
    }
  }
}

export default alt.createStore(LoadingStore, 'LoadingStore');
