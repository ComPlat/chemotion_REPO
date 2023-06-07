import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Col, Grid, Row } from 'react-bootstrap';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import Aviator from 'aviator';
import { RepoReviewModal } from 'repo-review-ui';
import alt from './alt';
import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import CollectionManagement from './CollectionManagement';
import Elements from './Elements';
import initRoutes from './routes';
import Notifications from './Notifications';
import LoadingModal from './common/LoadingModal';
import UIActions from './actions/UIActions';
import UserActions from './actions/UserActions';
import ReviewActions from './actions/ReviewActions';
import KeyboardActions from './actions/KeyboardActions';
import UIStore from './stores/UIStore';
import ReviewStore from './stores/ReviewStore';
import InboxModal from './inbox/InboxModal';
import ProgressModal from './common/ProgressModal';

class App extends Component {
  constructor(props) {
    super();
    this.state = {
      showCollectionManagement: false,
      indicatorClassName: 'fa fa-chevron-circle-left',
      showCollectionTree: true,
      mainContentClassName: 'small-col main-content',
    };
    this.handleUiStoreChange = this.handleUiStoreChange.bind(this);
    this.documentKeyDown = this.documentKeyDown.bind(this);
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this);
    this.handleReviewStoreChange = this.handleReviewStoreChange.bind(this);
    this.handleSubmitReview = this.handleSubmitReview.bind(this);
    this.handleReviewUpdate = this.handleReviewUpdate.bind(this);

  }

  componentDidMount() {
    UIStore.listen(this.handleReviewStoreChange);
    ReviewStore.listen(this.handleReviewStoreChange);
    UserActions.fetchOlsRxno();
    UserActions.fetchOlsChmo();
    UserActions.fetchProfile();
    UserActions.fetchUserLabels();
    UserActions.fetchGenericEls();
    UserActions.fetchSegmentKlasses();
    UserActions.fetchDatasetKlasses();
    UserActions.fetchUnitsSystem();
    UserActions.fetchEditors();
    UIActions.initialize.defer();
    document.addEventListener('keydown', this.documentKeyDown);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUiStoreChange);
    document.removeEventListener('keydown', this.documentKeyDown);
  }
  handleUiStoreChange(state) {
    if (this.state.showCollectionManagement !== state.showCollectionManagement) {
      this.setState({ showCollectionManagement: state.showCollectionManagement });
    }

    if (this.state.klasses !== state.klasses) {
      this.setState({ klasses: state.klasses });
    }
  }
  handleReviewStoreChange(state) {
    this.setState(prevState => ({ ...prevState, ...state }));
  }

  handleSubmitReview(elementId, elementType, comment, btnAction, checklist, reviewComments){
    // LoadingActions.start();
    ReviewActions.reviewPublish(elementId, elementType, comment, btnAction, checklist, reviewComments);
    this.setState({ showReviewModal: false });
  }

  handleReviewUpdate(e, col, rr) {
    const { review } = this.state;
    const checklist = rr.checklist || {};
    if (typeof (checklist[col]) === 'undefined') checklist[col] = {};
    checklist[col].status = e.target.checked;
    review.checklist = checklist;
    ReviewActions.updateReview(review);
  }

  documentKeyDown(event) {
    // Only trigger arrow and Enter keys ON BODY
    // Ignore on other element
    if (event.target.tagName.toUpperCase() === 'BODY' && [13, 38, 39, 40].includes(event.keyCode)) {
      KeyboardActions.documentKeyDown(event.keyCode);
    }
  }

  toggleCollectionTree() {
    const { showCollectionTree } = this.state;
    this.setState({
      showCollectionTree: !showCollectionTree,
      indicatorClassName: showCollectionTree ? 'fa fa-chevron-circle-right' : 'fa fa-chevron-circle-left',
      mainContentClassName: showCollectionTree ? 'small-col full-main' : 'small-col main-content'
    });
  }

  collectionTree() {
    const { showCollectionTree } = this.state;
    if (!showCollectionTree) {
      return <div />;
    }

    return (
      <Col className="small-col collec-tree">
        <CollectionTree />
      </Col>
    );
  }

  mainContent() {
    const { showCollectionManagement, mainContentClassName } = this.state;
    return (
      <Col className={mainContentClassName} >
        {showCollectionManagement ? <CollectionManagement /> : <Elements />}
      </Col>
    );
  }

  renderReviewModal() {
    const { showReviewModal, review_info, review, currentElement, elementType, btnAction } = this.state;
    const rrr = {};
    rrr.review_info = review_info;
    rrr.review = review;
    rrr.btnAction = btnAction;
    rrr.elementType = elementType;
    rrr.elementId = elementType === 'sample' ? currentElement?.sample?.id : currentElement?.reaction?.id;
    return (
      <RepoReviewModal
        show={showReviewModal}
        data={rrr}
        onSubmit={this.handleSubmitReview}
        onUpdate={this.handleReviewUpdate}
        onHide={() => this.setState({ showReviewModal: false })}
      />
    );
  }
  render() {
    const { showCollectionTree } = this.state;
    return (
      <Grid fluid>
        <Row className="card-navigation">
          <Navigation toggleCollectionTree={this.toggleCollectionTree} />
        </Row>
        <Row className="card-content container-fluid">
          {this.collectionTree()}
          {this.mainContent()}
        </Row>
        <Row>
          <Notifications />
          <LoadingModal />
          <ProgressModal />
        </Row>
        <InboxModal showCollectionTree={showCollectionTree} />
        {this.renderReviewModal()}
      </Grid>
    );
  }
}

const AppWithDnD = DragDropContext(HTML5Backend)(App);

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('app');
  if (domElement) {
    ReactDOM.render(<AppWithDnD />, domElement);
    initRoutes();
    Aviator.dispatch();
  }
});
