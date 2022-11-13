import Aviator from 'aviator';
import alt from '../alt';
import EmbargoActions from '../actions/EmbargoActions';
import ElementActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';

class EmbargoStore {
  constructor() {
    this.selectEmbargoId;
    this.bundles = [];
    this.selectType;
    this.selectState;
    this.searchType;
    this.searchValue;
    this.element = null;
    // this.elements = [];


    this.bindListeners({
      handleEmbargoMove: EmbargoActions.moveEmbargo,
      handleEmbargoAssign: EmbargoActions.assignEmbargo,
      handleEmbargoRelease: [EmbargoActions.releaseEmbargo, EmbargoActions.deleteEmbargo],
      handleFetchBundles: EmbargoActions.fetchEmbargoBundle,
      handledisplayEmbargo: EmbargoActions.displayEmbargo,
      handleRefreshEmbargoBundles: EmbargoActions.getEmbargoBundle,
      handleDisplayEmbargoElement: EmbargoActions.displayReviewEmbargo,
      handleGetEmbargoElements: EmbargoActions.getEmbargoElements,
      handleGetEmbargoElement: EmbargoActions.getEmbargoElement,
    });
  }

  handleDisplayEmbargoElement(result) {
    const publication = result?.element?.publication || {};

    if (result?.element?.reviewLevel === 0) {
      Aviator.navigate('/home/');
    } else {
      const elementType = (result.element.sample ? 'sample' : 'reaction');
      this.setState({
        guestPage: 'embargo',
        elementType,
        queryId: result.id,
        currentElement: result.element,
        review: publication?.review || {},
        reviewLevel: result.element.reviewLevel
      });
      Aviator.navigate(`/embargo/${elementType}/${result.id}`, { silent: true });
    }
  }

  handledisplayEmbargo(results) {
    console.log(results);
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
      bundles, current_user, elements: [], element: null
    });
  }

  handleGetEmbargoElements(results) {
    console.log(results);
    const { elements, current_user, embargo_id } = results;
    this.setState({
      selectEmbargoId: embargo_id,
      elements,
      element: null,
      currentUser: current_user
    });
  }
}

export default alt.createStore(EmbargoStore, 'EmbargoStore');
