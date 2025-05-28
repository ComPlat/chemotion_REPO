import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row } from 'react-bootstrap';
import Aviator from 'aviator';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import initPublicRoutes from 'src/libHome/homeRoutes';
import Navigation from 'src/libHome/Navigation';
import Notifications from 'src/components/Notifications';
import RepoEmbargo from 'src/repoHome/RepoEmbargo';
import RepoCollection from 'src/repoHome/RepoCollection';
import RepoHome from 'src/repoHome/RepoHome';
import RepoPubl from 'src/repoHome/RepoPubl';
import RepoReview from 'src/repoHome/RepoReview';
import RepoAbout from 'src/repoHome/RepoAbout';
import RepoContact from 'src/repoHome/RepoContact';
import RepoInfo from 'src/repoHome/RepoInfo';
import RepoNewsroom from 'src/repoHome/RepoNewsroom';
import RepoNewsReader from 'src/repoHome/RepoNewsReader';
import RepoNewsEditor from 'src/repoHome/RepoNewsEditor';
import RepoHowTo from 'src/repoHome/RepoHowTo';
import RepoHowToReader from 'src/repoHome/RepoHowToReader';
import RepoHowToEditor from 'src/repoHome/RepoHowToEditor';

import PublicStore from 'src/stores/alt/repo/stores/PublicStore';
import RStore from 'src/stores/alt/repo/stores/RStore';
import { RepoRootStore, RepoStoreContext } from 'src/stores/RepoRootStore';

import RepoElementDetails from 'src/repoHome/RepoElementDetails';
import LoadingModal from 'src/components/common/LoadingModal';

import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import RepoGenericHub from 'src/repoHome/RepoGenericHub';
import RepoOptOut from 'src/repoHome/RepoOptOut';

import Footer from 'src/components/chemrepo/Footer';
import SysInfo from 'src/components/chemrepo/SysInfo';

class Home extends Component {
  constructor(props) {
    super();
    this.state = {
      guestPage: null,
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
    RStore.listen(this.onChange);
    PublicActions.initialize();
    PublicActions.fetchOlsChmo();
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
    RStore.unlisten(this.onChange);
  }

  onChange(publicState) {
    const { guestPage, listType } = this.state;
    if (
      (publicState.guestPage && publicState.guestPage !== guestPage) ||
      (publicState.listType && publicState.listType !== listType) ||
      publicState.searchOptions
    ) {
      this.setState(prevState => ({
        ...prevState,
        guestPage: publicState.guestPage,
        listType: publicState.listType,
      }));
    }
  }

  renderGuestPage() {
    const { guestPage, listType } = this.state;
    switch (guestPage) {
      case 'genericHub':
        return <RepoGenericHub />;
      case 'moleculeArchive':
        return <RepoPubl listType="moleculeArchive" />;
      case 'newseditor':
        return <RepoNewsEditor />;
      case 'newsreader':
        return <RepoNewsReader />;
      case 'newsroom':
        return <RepoNewsroom />;
      case 'howtoeditor':
        return <RepoHowToEditor />;
      case 'howtoreader':
        return <RepoHowToReader />;
      case 'howto':
        return <RepoHowTo />;
      case 'about':
        return <RepoAbout />;
      case 'contact':
        return <RepoContact />;
      case 'publications':
        return <RepoPubl listType={listType || ''} />;
      case 'review':
        return <RepoReview />;
      case 'collection':
        return <RepoCollection />;
      case 'embargo':
        return <RepoEmbargo />;
      case 'dataset':
      case 'molecule':
        return <RepoElementDetails />;
      case 'home':
        return <RepoHome />;
      case 'welcome':
        return <RepoHome />;
      case 'directive':
        return <RepoInfo page="directive" />;
      case 'preservation':
        return <RepoInfo page="preservation" />;
      case 'imprint':
        return <RepoInfo page="imprint" />;
      case 'privacy':
        return <RepoInfo page="privacy" />;
      case 'opt-out':
        return <RepoOptOut />;
      default:
        return <RepoHome />;
    }
  }

  render() {
    return (
      <div>
        <SysInfo />
        <div>
          <Grid fluid>
            <Row className="card-navigation">
              <Navigation />
              <Notifications />
            </Row>
            <Row style={{ margin: '10px', paddingBottom: '10px' }}>
              {this.renderGuestPage()}
            </Row>
          </Grid>
        </div>
        <Footer />
        <LoadingModal />
      </div>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) {
    const repoRootStore = RepoRootStore.create({});
    ReactDOM.render(
      <RepoStoreContext.Provider value={repoRootStore}>
        <DndProvider backend={HTML5Backend}>
          <Home />
        </DndProvider>
      </RepoStoreContext.Provider>,
      domElement
    );
    initPublicRoutes();
    Aviator.dispatch();
  }
});
