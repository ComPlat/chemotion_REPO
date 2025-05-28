import alt from 'src/stores/alt/alt';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';

class GasPhaseReactionStore {
  constructor() {
    this.state = {
      catalystReferenceMolValue: null,
      reactionVesselSizeValue: null,
    };

    this.bindListeners({
      setCatalystReferenceMole: this.setCatalystReferenceMole,
      setReactionVesselSize: this.setReactionVesselSize,
      resetStore: this.resetStore,
    });
    this.bindActions(GasPhaseReactionActions);
  }

  setCatalystReferenceMole(value) {
    this.setState({
      catalystReferenceMolValue: value,
    });
  }

  setReactionVesselSize(value) {
    this.setState({
      reactionVesselSizeValue: value,
    });
  }

  // REPO: Added to fix the dispatching during another dispatch issue in ReactionDetailsScheme
  resetStore() {
    this.setState({
      catalystReferenceMolValue: null,
      reactionVesselSizeValue: null,
    });
  }
}

export default alt.createStore(GasPhaseReactionStore, 'GasPhaseReactionStore');
