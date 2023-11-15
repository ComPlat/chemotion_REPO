import Aviator from 'aviator';
import alt from 'src/stores/alt/alt';
import EmbargoActions from 'src/stores/alt/repo/actions/EmbargoActions';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';

class EmbargoStore {
  constructor() {
    this.selectEmbargoId;
    this.bundles = [];
    this.selectType;
    this.selectState;
    this.searchType;
    this.searchValue;
    this.review_info == {};
    this.element = null;
    // this.elements = [];

    this.bindListeners({
      handleEmbargoMove: EmbargoActions.moveEmbargo,
      handleEmbargoAssign: EmbargoActions.assignEmbargo,
      handleEmbargoRelease: [EmbargoActions.releaseEmbargo, EmbargoActions.deleteEmbargo],
      handleFetchBundles: EmbargoActions.fetchEmbargoBundle,
      handleDisplayEmbargoElement: EmbargoActions.displayReviewEmbargo,
      handleGetEmbargoElements: EmbargoActions.getEmbargoElements,
      handleGetEmbargoElement: EmbargoActions.getEmbargoElement,
      handleClose: PublicActions.close,
    });
  }

  handleClose({ deleteEl }) {
    this.setState({ currentElement: null });
  }

  handleDisplayEmbargoElement(result) {
    const publication = result?.element?.publication || {};
    if (result?.element?.review_info?.review_level === 0) {
      Aviator.navigate('/home/');
    } else {
      const elementType = (result.element.sample ? 'sample' : 'reaction');
      this.setState({
        selectEmbargo: result.element.selectEmbargo,
        guestPage: 'embargo',
        elementType,
        queryId: result.id,
        currentElement: result.element,
        review: publication?.review || {},
        review_info: result.element?.review_info
      });
      Aviator.navigate(`/embargo/${elementType}/${result.id}`, { silent: true });
    }
  }

  handleGetEmbargoElement(results) {
    this.setState({ element: results })
  }


  handleEmbargoRelease(result) {
    EmbargoActions.fetchEmbargoBundle();
  }

  handleEmbargoAssign(result) {
    if (result.error) {
      alert(result.error);
    } else {
      alert(result.message);
      // refresh embargo list
      EmbargoActions.getEmbargoBundle();
      // refresh element list
      PublicActions.getElements(
        this.selectType, this.selectState, this.searchType,
        this.searchValue, this.page, this.perPage
      );
    }
  }

  handleEmbargoMove(results) {
    const { col_id, is_new_embargo, new_embargo, message } = results.result;
    if (is_new_embargo === true) {
      this.bundles.push(new_embargo);
    }
    alert(message);
    EmbargoActions.getEmbargoElements(col_id);
  }


  handleRefreshEmbargoBundles(result) {
    const cols = result.repository;
    const { current_user } = result;
    const bundles = [];
    if (cols && cols.length > 0) {
      cols.forEach((col) => {
        bundles.push(col);
      });
    }
    this.setState({ bundles, current_user });
  }
  handleFetchBundles(result) {
    const bundles = result.repository || [];
    // eslint-disable-next-line camelcase
    const { current_user } = result;
    this.setState({
      guestPage: 'embargo', bundles, current_user, elements: [], element: null
    });
  }

  handleGetEmbargoElements(results) {
    const { elements, current_user, embargo_id, embargo } = results;
    this.setState({
      selectEmbargoId: embargo_id,
      selectEmbargo: embargo,
      elements,
      element: null,
      currentUser: current_user
    });
  }
}

export default alt.createStore(EmbargoStore, 'EmbargoStore');
