import Aviator from 'aviator';
import alt from '../alt';
import PublicActions from '../actions/PublicActions';
import UIActions from '../actions/UIActions';
import RepoNavListTypes from '../../libHome/RepoNavListTypes';

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
    // this.bundles = [];
    this.showReviewModal = false;
    this.reviewData = {};

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
      handleReceiveSearchresult: PublicActions.fetchBasedOnSearchSelectionAndCollection,
      handleClearSearchSelection: [UIActions.selectCollection, UIActions.selectSyncCollection],
      handleClose: PublicActions.close,
      handleArticles: PublicActions.articles,
      handleEditArticle: PublicActions.editArticle,
      handleDisplayArticle: PublicActions.displayArticle,
      handleHowTos: PublicActions.howtos,
      handleEditHowTo: PublicActions.editHowTo,
      handleDisplayHowTo: PublicActions.displayHowTo,
      handleGetElements: PublicActions.getElements,
      handleRefreshPubElements: PublicActions.refreshPubElements,
      handleDisplayCollection: PublicActions.displayCollection,

    });
  }

  handleRefreshPubElements(type) {
    const pageType = type.split('=');
    PublicActions[`get${pageType[0]}`]({ page: this.page, perPage: this.perPage, listType: pageType[1] });
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
      molecules, page, pages, perPage, listType
    } = results;
    this.setState({
      molecules, page, pages, perPage, listType, guestPage: 'publications'
    });
  }

  handleGetReactions(results) {
    const {
      reactions, page, pages, perPage
    } = results;
    const listType = (reactions && reactions[0] && reactions[0].taggable_data.scheme_only ? 'scheme' : 'reaction') || 'reaction';
    this.setState({
      reactions, page, pages, perPage, listType, guestPage: 'publications'
    });
  }

  handleSearchMolecules(results) {
    const {
      molecules, page, perPage, totalElements, listType
    } = results;
    let { pages } = results;
    if (totalElements && perPage) {
      pages = Math.ceil(totalElements / perPage);
    }
    this.setState({
      molecules, page, pages, perPage, listType
    });
  }

  handleSearchReactions(results) {
    const {
      reactions, page, perPage, totalElements, listType
    } = results;
    let { pages } = results;
    if (totalElements && perPage) {
      pages = Math.ceil(totalElements / perPage);
    }
    this.setState({
      reactions, page, pages, perPage, listType
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
    const pageType = page.split('=');
    this.setState({
      guestPage: pageType[0], currentElement: null, listType: pageType[1], elementType: null
    });
  }

  handleDisplayDataset(result) {
    this.setState({
      guestPage: 'dataset',
      elementType: 'dataset',
      queryId: result.id,
      currentElement: result.dataset
    });
    Aviator.navigate(`/publications/datasets/${result.id}`, { silent: true });
  }

  handleDisplayMolecule(moleculeList) {
    let cb = () => PublicActions.getMolecules({ listType: moleculeList.listType });

    if (this.molecules.length > 0) {
      cb = () => {};
      this.setState({ molecules: this.molecules });
    }

    this.setState({
      guestPage: 'publications',
      elementType: 'molecule',
      queryId: moleculeList.id,
      currentElement: moleculeList.moleculeData,
      listType: moleculeList.listType
    }, cb());
    const suf = (moleculeList.anchor && moleculeList.anchor !== 'undefined') ? `#${moleculeList.anchor}` : '';
    Aviator.navigate(`/publications/molecules/${moleculeList.id}${suf}`, { silent: true });
  }

  handleDisplayReaction(reactionList) {
    const listType = reactionList.reactionData.publication.taggable_data.scheme_only ?
      RepoNavListTypes.SCHEME : RepoNavListTypes.REACTION;
    let cb = () => PublicActions.getReactions();

    if (this.reactions.length > 0) {
      cb = () => {};
      this.setState({ reactions: this.reactions });
    }
    this.setState({
      guestPage: 'publications',
      elementType: 'reaction',
      queryId: reactionList.id,
      currentElement: reactionList.reactionData,
      listType
    }, cb());
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


  handleDisplayCollection(collectionList) {
    this.setState({
      guestPage: 'collection',
      elementType: 'collection',
      queryId: collectionList.id,
      selectEmbargo: collectionList.colData && collectionList.colData.col
    });
    Aviator.navigate(`/publications/collections/${collectionList.id}`, { silent: true });
  }


  handleGetElements(results) {
    const {
      elements, page, perPage, pages, selectType, selectState, searchType, searchValue
    } = results;
    this.setState({
      elements, page, perPage, pages, selectType, selectState, searchType, searchValue
    });
  }


  handleUnitsSystem(result) {
    this.setState({ unitsSystem: result });
  }

  handleUnitsSystem(result) {
    this.setState({ unitsSystem: result });
  }
}

export default alt.createStore(PublicStore, 'PublicStore');
