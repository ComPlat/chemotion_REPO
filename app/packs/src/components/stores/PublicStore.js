import Aviator from 'aviator';
import alt from '../alt';
import PublicActions from '../actions/PublicActions';
import SearchActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';

class PublicStore {
  constructor() {
    this.molecules = [];
    this.reactions = [];
    this.page = 1;
    this.pages = 1;
    this.perPage = 10;
    this.selectType;
    this.selectState;
    this.searchType;
    this.searchValue;
    this.selectEmbargoId;
    this.publishedStatics = [];
    this.lastPublished;
    this.lastPublishedSample;
    this.guestPage = "";
    this.currentElement = null;
    this.queryId = -1;
    this.news = {};
    this.articles = [];
    this.howto = {};
    this.howtos = [];
    this.bundles = [];

    this.bindListeners({
      handleGetMolecules: PublicActions.getMolecules,
      handleGetReactions: PublicActions.getReactions,
      handleSearchMolecules: PublicActions.getSearchMolecules,
      handleSearchReactions: PublicActions.getSearchReactions,
      handlePublishedStatics: PublicActions.publishedStatics,
      handleLastPublished: PublicActions.lastPublished,
      handleLastPublishedSample: PublicActions.lastPublishedSample,
      handleOpenRepositoryPage: PublicActions.openRepositoryPage,
      handleDisplayDataset: PublicActions.displayDataset,
      handleDisplayMolecule: PublicActions.displayMolecule,
      handleDisplayReaction: PublicActions.displayReaction,
      handleDisplayCollection: PublicActions.displayCollection,
      handleReceiveSearchresult: SearchActions.fetchBasedOnSearchSelectionAndCollection,
      handleClearSearchSelection: [UIActions.selectCollection, UIActions.selectSyncCollection],
      handleClose: PublicActions.close,
      handleArticles: PublicActions.articles,
      handleEditArticle: PublicActions.editArticle,
      handleDisplayArticle: PublicActions.displayArticle,
      handleHowTos: PublicActions.howtos,
      handleEditHowTo: PublicActions.editHowTo,
      handleDisplayHowTo: PublicActions.displayHowTo,
      handleGetElements: PublicActions.getElements,
      handleGetEmbargoElements: PublicActions.getEmbargoElements,
      handleGetEmbargoElement: PublicActions.getEmbargoElement,
      handleDisplayReviewReaction: PublicActions.displayReviewReaction,
      handleDisplayReviewSample: PublicActions.displayReviewSample,
      handelReviewPublish: PublicActions.reviewPublish,
      handelUpdateComment: PublicActions.updateComment,
      handleFetchBundles: PublicActions.fetchEmbargoBundle,
      handleDisplayEmbargoElement: PublicActions.displayReviewEmbargo,
      handleEmbargoRelease: [PublicActions.releaseEmbargo, PublicActions.deleteEmbargo],
      handleEmbargoMove: PublicActions.moveEmbargo,
      handleEmbargoAssign: PublicActions.assignEmbargo,
      handleRefreshPubElements: PublicActions.refreshPubElements,
      handleRefreshEmbargoBundles: PublicActions.getEmbargoBundle,
    });
  }

  handleRefreshPubElements(type) {
    PublicActions[`get${type}`]({ page: this.page, perPage: this.perPage });
  }

  handleClose({ deleteEl }) {
    this.setState({
      currentElement: null
    });
    if (this.guestPage === 'embargo') {
      Aviator.navigate('/embargo', { silent: true });
    } else if (this.guestPage === 'review') {
      Aviator.navigate('/review', { silent: true });
    } else {
      Aviator.navigate('/publications', { silent: true });
    }
  }

  handleClearSearchSelection() {
    PublicActions.getMolecules.defer();
  }

  handleGetMolecules(results) {
    const {
      molecules, page, pages, perPage
    } = results;
    this.setState({
      molecules, page, pages, perPage
    });
  }

  handleGetReactions(results) {
    const {
      reactions, page, pages, perPage
    } = results;
    this.setState({
      reactions, page, pages, perPage
    });
  }

  handleSearchMolecules(results) {
    const {
      molecules, page, perPage, totalElements
    } = results;
    let { pages } = results;
    if (totalElements && perPage) {
      pages = Math.ceil(totalElements / perPage);
    }
    this.setState({
      molecules, page, pages, perPage
    });
  }

  handleSearchReactions(results) {
    const {
      reactions, page, perPage, totalElements
    } = results;
    let { pages } = results;
    if (totalElements && perPage) {
      pages = Math.ceil(totalElements / perPage);
    }
    this.setState({
      reactions, page, pages, perPage
    });
  }

  handlePublishedStatics(publishedStatics) {
    if (publishedStatics) {
      this.setState({ publishedStatics });
    }
  }

  handleLastPublished(lastPublished) {
    if (lastPublished) {
      this.setState({ lastPublished });
    }
  }

  handleLastPublishedSample(lastPublishedSample) {
    if (lastPublishedSample) {
      this.setState({ lastPublishedSample });
    }
  }

  handleOpenRepositoryPage(page) {
    this.setState({ guestPage: page, currentElement: null });
  }

  handleDisplayDataset(result) {
    this.setState({
      guestPage: 'publications',
      elementType: 'dataset',
      queryId: result.id,
      currentElement: result.dataset
    });
    Aviator.navigate(`/publications/datasets/${result.id}`, { silent: true });
  }

  handleDisplayMolecule(moleculeList) {
    this.setState({
      guestPage: 'publications',
      elementType: 'molecule',
      queryId: moleculeList.id,
      currentElement: moleculeList.moleculeData
    });
    const suf = (moleculeList.anchor && moleculeList.anchor !== 'undefined') ? `#${moleculeList.anchor}` : '';
    Aviator.navigate(`/publications/molecules/${moleculeList.id}${suf}`, { silent: true });
  }

  handleDisplayReaction(reactionList) {
    this.setState({
      guestPage: 'publications',
      elementType: 'reaction',
      queryId: reactionList.id,
      currentElement: reactionList.reactionData
    });
    Aviator.navigate(`/publications/reactions/${reactionList.id}`, { silent: true });
  }

  handleDisplayCollection(collectionList) {
    this.setState({
      guestPage: 'collection',
      elementType: 'collection',
      queryId: collectionList.id,
      selectEmbargo: collectionList.colData && collectionList.colData.col
    });
    Aviator.navigate(`/publications/collections/${collectionList.id}`, { silent: true });
  }

  handleReceiveSearchresult(result) {
    this.setState({ ...result.publicMolecules });
  }

  handleArticles(result) {
    this.setState({
      guestPage: 'newsroom',
      articles: result.data
    });
  }

  handleEditArticle(result) {
    const news = result.data;
    news.key = result.key;
    news.article = news.article ? news.article : [];
    this.setState({
      guestPage: 'newseditor',
      news,
    });
  }

  handleDisplayArticle(result) {
    const news = result.data;
    news.key = result.key;
    this.setState({
      guestPage: 'newsreader',
      news,
    });
  }

  handleHowTos(result) {
    this.setState({
      guestPage: 'howto',
      howtos: result.data
    });
  }

  handleEditHowTo(result) {
    const howto = result.data;
    howto.key = result.key;
    howto.article = howto.article ? howto.article : [];
    this.setState({
      guestPage: 'howtoeditor',
      howto,
    });
  }

  handleDisplayHowTo(result) {
    const howto = result.data;
    howto.key = result.key;
    this.setState({
      guestPage: 'howtoreader',
      howto,
    });
  }

  handleGetElements(results) {
    const {
      elements, page, perPage, pages, selectType, selectState, searchType, searchValue
    } = results;
    this.setState({
      elements, page, perPage, pages, selectType, selectState, searchType, searchValue
    });
  }

  handleGetEmbargoElements(results) {
    const { elements, current_user, embargo_id } = results;
    this.setState({
      selectEmbargoId: embargo_id,
      elements,
      currentElement: null,
      currentUser: current_user
    });
  }

  handleGetEmbargoElement(results) {
    this.setState({ currentElement: results })
  }

  handelUpdateComment(result) {
    this.setState({ historyInfo: result.history });
  }

  handelReviewPublish(results) {
    const his = results.history;

    this.setState({
      historyInfo: his,
    });

    PublicActions.getElements(this.selectType || 'All', this.selectState || 'pending', this.searchType || 'All', this.searchValue || '', this.page, this.perPage);
  }

  handleDisplayReviewReaction(result) {
    const publication = (result.element && result.element.reaction && result.element.reaction.publication) || {};

    if (result.element && result.element.reviewLevel === 0) {
      Aviator.navigate('/home');
    } else {
      this.setState({
        guestPage: 'review',
        elementType: 'reaction',
        queryId: result.id,
        currentElement: result.element,
        historyInfo: (publication && publication.review && publication.review.history) || [],
        reviewLevel: result.element.reviewLevel,
        isSubmitter: (result.element && result.element.isSubmitter) || false
      });
      Aviator.navigate(`/review/review_reaction/${result.id}`, { silent: true });
    }
  }

  handleDisplayReviewSample(result) {
    const publication = (result.element && result.element.publication) || {};

    if (result.element && result.element.reviewLevel === 0) {
      Aviator.navigate('/home');
    } else {
      this.setState({
        guestPage: 'review',
        elementType: 'sample',
        queryId: result.id,
        currentElement: result.element,
        historyInfo: (publication && publication.review && publication.review.history) || [],
        isSubmitter: (result.element && result.element.isSubmitter) || false,
        reviewLevel: result.element && result.element.reviewLevel,
      });
      Aviator.navigate(`/review/review_sample/${result.id}`, { silent: true });
    }
  }

  handleFetchBundles(result) {
    const bundles = result.repository || [];
    // eslint-disable-next-line camelcase
    const { current_user } = result;
    this.setState({
      bundles, current_user, elements: [], currentElement: null
    });
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

  handleDisplayEmbargoElement(result) {
    const publication = (result.element && result.element.publication) || {};

    if (result.element && result.element.reviewLevel === 0) {
      Aviator.navigate('/home/');
    } else {
      const elementType = (result.element.sample ? 'sample' : 'reaction');
      this.setState({
        guestPage: 'embargo',
        elementType,
        queryId: result.id,
        currentElement: result.element,
        historyInfo: (publication && publication.review && publication.review.history) || [],
        reviewLevel: result.element.reviewLevel
      });
      Aviator.navigate(`/embargo/${elementType}/${result.id}`, { silent: true });
    }
  }

  handleEmbargoRelease(result) {
    PublicActions.fetchEmbargoBundle();
  }

  handleEmbargoMove(results) {
    const { col_id, is_new_embargo, new_embargo, message } = results.result;
    if (is_new_embargo === true) {
      this.bundles.push(new_embargo);
    }
    alert(message);
    PublicActions.getEmbargoElements(col_id);
  }

  handleEmbargoAssign(result) {
    if (result.error) {
      alert(result.error);
    } else {
      alert(result.message);
      // refresh embargo list
      PublicActions.getEmbargoBundle();
      // refresh element list
      PublicActions.getElements(
        this.selectType, this.selectState, this.searchType,
        this.searchValue, this.page, this.perPage
      );
    }
  }
}

export default alt.createStore(PublicStore, 'PublicStore');
