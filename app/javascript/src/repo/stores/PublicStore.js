import Aviator from 'aviator';
import alt from 'src/stores/alt/alt';
import PublicActions from 'src/repo/actions/PublicActions';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';
import { isNil } from 'lodash';

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
    this.topContributors = [];
    this.lastPublished;
    this.lastPublishedSample;
    this.guestPage = "";
    this.currentElement = null;
    this.queryId = -1;
    this.news = {};
    this.articles = [];
    this.howto = {};
    this.howtos = [];
    this.showReviewModal = false;
    this.showCommendModal = false;
    this.reviewData = {};
    this.u = {};

    this.bindListeners({
      handleInitialize: PublicActions.initialize,
      handleGetMolecules: PublicActions.getMolecules,
      handleGetReactions: PublicActions.getReactions,
      handleSearchMolecules: PublicActions.getSearchMolecules,
      handleSearchReactions: PublicActions.getSearchReactions,
      handlePublishedStatics: PublicActions.publishedStatics,
      handleTopContributors: PublicActions.topContributors,
      handleLastPublished: PublicActions.lastPublished,
      handleLastPublishedSample: PublicActions.lastPublishedSample,
      handleOpenRepositoryPage: PublicActions.openRepositoryPage,
      handleDisplayDataset: PublicActions.displayDataset,
      handleDisplayMolecule: PublicActions.displayMolecule,
      handleDisplayReaction: PublicActions.displayReaction,
      handleReceiveSearchresult: PublicActions.fetchBasedOnSearchSelectionAndCollection,
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
      handlePublicSearch: PublicActions.publicSearch,
      handleSetSearchParams: PublicActions.setSearchParams,
      // Use in REPO
      handleFetchOlsChmo: PublicActions.fetchOlsChmo,
    });
  }

  handleInitialize(result) {
    this.setState(result);
  }

  handleRefreshPubElements(type) {
    const pageType = type.split('=');
    PublicActions[`get${pageType[0]}`]({ page: this.page, perPage: this.perPage, listType: pageType[1] });
  }

  handleClose() {
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
    if (!results || !results.molecules) return;
    const {
      molecules, page, pages, perPage, totalElements, listType, archiveFacets,
    } = results;
    this.setState({
      molecules,
      page,
      pages,
      perPage,
      totalElements,
      listType,
      archiveFacets,
      guestPage: 'publications',
    });
  }

  handleGetReactions(results) {
    if (!results || !results.reactions) return;
    const {
      reactions, page, pages, perPage
    } = results;
    const listType = (reactions && reactions[0] && reactions[0].taggable_data.scheme_only ? 'scheme' : 'reaction') || 'reaction';

    // update the currentElements versions if it was loaded before
    if (this.currentElement !== null) {
      const currentElement = { ...this.currentElement };
      this.setState({ currentElement });
    }

    this.setState({
      reactions, page, pages, perPage, listType, guestPage: 'publications'
    });
  }

  handleSearchMolecules(results) {
    if (!results || !results.molecules) return;
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
    if (!results || !results.reactions) return;
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

  handlePublicSearch(results) {
    this.setState({
      guestPage: 'publications',
      listType: results.listType || 'reaction',
      currentElement: null,
      elementType: null,
      searchOptions: results.searchOptions,
      advType: results.advType || 'Authors',
      advFlag: results.advFlag || true,
      advValue: results.advValue || [],
      defaultSearchValue: results.defaultSearchValue || '',
      isSearch: results.isSearch || false,
      selection: results.selection || {},
    });
    Aviator.navigate('/publications', { silent: true });
  }

  handlePublishedStatics(publishedStatics) {
    if (publishedStatics) {
      this.setState({ publishedStatics });
    }
  }

  handleTopContributors(topContributors) {
    this.setState({ topContributors: topContributors || [] });
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

    // initially, show only the last versions
    moleculeList.moleculeData.published_samples.forEach((sample) => {
      if (moleculeList.anchor === 'undefined') {
        // show the latest versions
        sample.show = isNil(sample.new_version) || isNil(
          moleculeList.moleculeData.published_samples.find((s) => s.sample_id == sample.new_version)
        )
      } else {
        // show the version given by the anchor
        sample.show = sample.doi.endsWith(moleculeList.anchor)
      }
    });

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
        this.reactions.forEach((reaction) => {
          if (reaction.id == reactionList.id) {
            reaction.show = true
          } else if (reactionList.reactionData?.versions?.some(version => version.id === reaction.id)) {
            reaction.show = false
          }
        })

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

  handleReceiveSearchresult(result) {
    if (result?.publicMolecules) {
      this.setState({ ...result.publicMolecules });
    }
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

  handleSetSearchParams(params) {
    this.setState(params);
  }

  // Use in REPO
  handleFetchOlsChmo(result) {
    this.setState({ chmos: result.ols_terms });
  }

  handleSelectSampleVersion(version) {
    Aviator.navigate(`/publications/molecules/${version.molecule_id.to_s}#${version.suffix}`, { silent: true });
  }
}

export default alt.createStore(PublicStore, 'PublicStore');
