import alt from 'src/stores/alt/alt';

class RepoLoadingActions {
  start() {
    return null;
  }

  stop() {
    return null;
  }

  startLoadingWithProgress(filename) {
    return filename;
  }

  stopLoadingWithProgress(filename) {
    return filename;
  }

  updateLoadingProgress(filename, progress) {
    return { filename, progress };
  }
}

export default alt.createActions(RepoLoadingActions);
