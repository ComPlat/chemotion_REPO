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
      handleDisplayReviewReaction: PublicActions.displayReviewReaction,
      handleDisplayReviewSample: PublicActions.displayReviewSample,
      handelReviewPublish: PublicActions.reviewPublish,
      handelUpdateComment: PublicActions.updateComment,
      handleFetchBundles: PublicActions.fetchEmbargoBundle,
      handleDisplayEmbargoElement: PublicActions.displayReviewEmbargo,
      handleEmbargoRelease: [PublicActions.releaseEmbargo, PublicActions.deleteEmbargo],
      handleEmbargoMove: PublicActions.moveEmbargo,
    });
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

  handleClearSearchSelection(){
    PublicActions.getMolecules.defer();
  }

  handleGetMolecules(results) {
    const { molecules, page, pages, perPage } = results;
    this.setState({ molecules, page, pages, perPage });
  }

  handleGetReactions(results) {
    const { reactions, page, pages, perPage } = results;
    this.setState({ reactions, page, pages, perPage });
  }

  handleSearchMolecules(results) {
    const { molecules, page, perPage, totalElements } = results;
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

  handleLastPublishedSample(lastPublishedSample){
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
    Aviator.navigate(`/publications/datasets/${result.id}`,
      { silent: true });
  }

  handleDisplayMolecule(moleculeList) {
    this.setState({
      guestPage: 'publications',
      elementType: 'molecule',
      queryId: moleculeList.id,
      currentElement: moleculeList.moleculeData
    });
    Aviator.navigate(`/publications/molecules/${moleculeList.id}`, { silent: true });
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
    const { elements, page, perPage, pages, selectType, selectState } = results;
    this.setState({ elements, page, perPage, pages, selectType, selectState });
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

  handelUpdateComment(result) {
    this.setState({ commentInfo: result.comments });
  }

  handelReviewPublish(results) {
    let newState = '';
    switch (results.action) {
      case 'Submit':
        newState = 'pending';
        break;
      case 'Review':
        newState = 'reviewed';
        break;
      case 'Accept':
        newState = 'completed';
        break;
      case 'Reject':
        newState = 'rejected';
        break;
      default:
        newState = 'pending';
    }

    if (results.action == 'Comments') {
      this.setState({
        commentInfo: results.comments,
        summaryInfo: results.summary,
        feedbackInfo: results.feedback
      });
      } else {
      this.setState({
        pubState: newState,
        commentInfo: results.comments,
        summaryInfo: results.summary,
        feedbackInfo: results.feedback
      });
      }

    PublicActions.getElements(this.selectType || 'All', this.selectState || 'pending', this.page, this.perPage);
  }

  handleDisplayReviewReaction(result) {
    let comments = {};
    let summary = '';
    let feedback = '';
    let pubState = '';

    if (result.element && result.element.reviewLevel === 0) {
      Aviator.navigate('/home');
    } else {
      if (result.element && result.element.reaction &&
        result.element.reaction.publication) {
        const { publication } = result.element.reaction;
        pubState = publication.state;

        if (publication.review) {
          const pr = publication.review;
          comments = pr.comments ? pr.comments : {};
          summary = pr.summary ? pr.summary : '';
          feedback = pr.feedback ? pr.feedback : '';
        }
      }

      this.setState({
        guestPage: 'review',
        elementType: 'reaction',
        queryId: result.id,
        currentElement: result.element,
        commentInfo: comments,
        summaryInfo: summary,
        feedbackInfo: feedback,
        submitter: result.element.pub_name,
        reviewLevel: result.element.reviewLevel,
        pubState
      });
      Aviator.navigate(`/review/review_reaction/${result.id}`, { silent: true });
    }
  }

  handleDisplayReviewSample(result) {
    let comments = {};
    let summary = '';
    let feedback = '';
    let pubState = '';
    if (result.element && result.element.reviewLevel === 0) {
      Aviator.navigate('/home');
    } else {
      if (result.element &&
        result.element.publication) {
        const { publication } = result.element;
        pubState = publication.state;

        if (publication.review) {
          const pr = publication.review;
          comments = pr.comments ? pr.comments : {};
          summary = pr.summary ? pr.summary : '';
          feedback = pr.feedback ? pr.feedback : '';
        }
      }
      this.setState({
        guestPage: 'review',
        elementType: 'sample',
        queryId: result.id,
        currentElement: result.element,
        commentInfo: comments,
        summaryInfo: summary,
        feedbackInfo: feedback,
        submitter: result.element.pub_name,
        reviewLevel: result.element.reviewLevel,
        pubState
      });
      Aviator.navigate(`/review/review_sample/${result.id}`, { silent: true });
    }
  }

  handleFetchBundles(result) {
    const cols = result.repository;
    const { current_user } = result;
    const bundles = [];
    if (cols && cols.length > 0) {
      cols.forEach((col) => {
        bundles.push({ value: col.id, name: col.label, label: col.label });
      });
      this.setState({
        bundles, current_user, elements: [], currentElement: null
      });
    } else {
      this.setState({
        bundles: [], current_user, elements: [], currentElement: null
      });
    }
  }

  handleDisplayEmbargoElement(result) {
    let comments = {};
    let summary = '';
    let feedback = '';
    let pubState = '';

    if (result.element && result.element.reviewLevel === 0) {
      Aviator.navigate('/home/');
    } else {
      if (result.element &&
        result.element.publication) {
        const { publication } = result.element;
        pubState = publication.state;

        if (publication.review) {
          const pr = publication.review;
          comments = pr.comments ? pr.comments : {};
          summary = pr.summary ? pr.summary : '';
          feedback = pr.feedback ? pr.feedback : '';
        }
      }

      const elementType = (result.element.sample ? 'sample' : 'reaction');

      this.setState({
        guestPage: 'embargo',
        elementType,
        queryId: result.id,
        currentElement: result.element,
        commentInfo: comments,
        summaryInfo: summary,
        feedbackInfo: feedback,
        pubState,
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
      this.bundles.push({value: new_embargo.id, name: new_embargo.label, label: new_embargo.label });
    }
    alert(message);
    PublicActions.getEmbargoElements(col_id);
  }
}

export default alt.createStore(PublicStore, 'PublicStore')
