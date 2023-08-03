import React, { Component } from 'react';
import { Col, Grid, Row } from 'react-bootstrap';
import { FlowViewerModal } from 'chem-generic-ui';
import CollectionManagement from 'src/apps/mydb/collections/CollectionManagement';
import CollectionTree from 'src/apps/mydb/collections/CollectionTree';
import Elements from 'src/apps/mydb/elements/Elements';
import InboxModal from 'src/apps/mydb/inbox/InboxModal';
import KeyboardActions from 'src/stores/alt/actions/KeyboardActions';
import LoadingModal from 'src/components/common/LoadingModal';
import Navigation from 'src/components/navigation/Navigation';
import Notifications from 'src/components/Notifications';
import ProgressModal from 'src/components/common/ProgressModal';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import Calendar from 'src/components/calendar/Calendar';
import SampleTaskInbox from 'src/components/sampleTaskInbox/SampleTaskInbox';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import Aviator from 'aviator';
import { RepoReviewModal } from 'repo-review-ui';
import { FlowViewerModal } from 'chem-generic-ui';
import alt from './alt';
import initRoutes from './routes';
import ReviewActions from './actions/ReviewActions';
import ReviewStore from './stores/ReviewStore';
import ProgressModal from './common/ProgressModal';
import ContactEmail from './chemrepo/core/ContactEmail';

class App extends Component {
  constructor(_props) {
    super();
    this.state = {
      showGenericWorkflow: false,
      propGenericWorkflow: false,
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

    this.patchExternalLibraries();
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
    if (this.state.showGenericWorkflow !== state.showGenericWorkflow ||
      this.state.propGenericWorkflow !== state.propGenericWorkflow) {
      this.setState({ showGenericWorkflow: state.showGenericWorkflow, propGenericWorkflow: state.propGenericWorkflow });
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

  patchExternalLibraries() {
    const { plugins } = require('@citation-js/core');
    plugins.input.add('@doi/api', {
      parseType: {
        dataType: 'String',
        predicate: /\b(https?:\/\/(?:dx\.)?doi\.org\/(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&\'])\S)+))\b/i,
        extends: '@else/url'
      }
    });

    plugins.input.add('@doi/id', {
      parseType: {
        dataType: 'String',
        predicate: /\b(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&\'])\S)+)\b/
      }
    });
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
        <div className="news-box">
          <p>New to the Repository? Explore our <a href="https://chemotion.net/docs/repo/settings_preparation" target="_blank" rel="noreferrer">Preparation</a> & <a href="https://chemotion.net/docs/repo/workflow" target="_blank" rel="noreferrer">Workflow</a> </p>
          <p>Guidelines: Discover <a href="https://chemotion.net/docs/repo/details_standards/reactions" target="_blank" rel="noreferrer">Details and Standards</a></p>
          <p>Learn More: Visit <a href="https://chemotion.net/docs/repo/references" target="_blank" rel="noreferrer">here</a></p>
          <ContactEmail />
        </div>
      </Col>
    );
  }

  mainContent() {
    const { showCollectionManagement, mainContentClassName } = this.state;
    return (
      <Col className={mainContentClassName}>
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
    const { showCollectionTree, showGenericWorkflow, propGenericWorkflow } = this.state;
    return (
      <Grid fluid>
        <Row className="card-navigation">
          <Navigation toggleCollectionTree={this.toggleCollectionTree} />
          <SampleTaskInbox />
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
        <FlowViewerModal
          show={showGenericWorkflow || false}
          data={propGenericWorkflow || {}}
          fnHide={() => UIActions.showGenericWorkflowModal(false)}
        />
        <InboxModal showCollectionTree={showCollectionTree} />
        <Calendar />
        {this.renderReviewModal()}
      </Grid>
    );
  }
}

export default App;
