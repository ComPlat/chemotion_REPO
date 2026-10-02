import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Container, Row } from 'react-bootstrap';
import Aviator from 'aviator';
// import { DndProvider } from 'react-dnd';
// import { HTML5Backend } from 'react-dnd-html5-backend';

// import BaseNavigation from 'src/components/navigation/BaseNavigation';
// import WelcomeMessage from 'src/apps/home/WelcomeMessage';

import initPublicRoutes from 'src/repo/libHome/homeRoutes';
import RepoNavigation from 'src/repo/libHome/Navigation';
import Notifications from 'src/components/Notifications';
import RepoEmbargo from 'src/repo/repoHome/RepoEmbargo';
import RepoCollection from 'src/repo/repoHome/RepoCollection';
import RepoHome from 'src/repo/repoHome/RepoHome';
import RepoPubl from 'src/repo/repoHome/RepoPubl';
import RepoReview from 'src/repo/repoHome/RepoReview';
import RepoAbout from 'src/repo/repoHome/RepoAbout';
import RepoContact from 'src/repo/repoHome/RepoContact';
import RepoInfo from 'src/repo/repoHome/RepoInfo';
import RepoNewsroom from 'src/repo/repoHome/RepoNewsroom';
import RepoNewsReader from 'src/repo/repoHome/RepoNewsReader';
import RepoNewsEditor from 'src/repo/repoHome/RepoNewsEditor';
import RepoHowTo from 'src/repo/repoHome/RepoHowTo';
import RepoHowToReader from 'src/repo/repoHome/RepoHowToReader';
import RepoHowToEditor from 'src/repo/repoHome/RepoHowToEditor';

import PublicStore from 'src/repo/stores/PublicStore';
import RStore from 'src/repo/stores/RStore';

import RepoElementDetails from 'src/repo/repoHome/RepoElementDetails';
import RepoLoadingModal from 'src/repo/repoHome/RepoLoadingModal';

import PublicActions from 'src/repo/actions/PublicActions';
import RepoGenericHub from 'src/repo/repoHome/RepoGenericHub';
import RepoOptOut from 'src/repo/repoHome/RepoOptOut';

import Footer from 'src/repo/chemrepo/Footer';
import SysInfo from 'src/repo/chemrepo/SysInfo';

class Home extends Component {
  constructor(props) {
    super();
    this.state = {
      guestPage: null,
      sysInfoClosed: false,
    };
    this.onChange = this.onChange.bind(this);
    this.handleSysInfoClose = this.handleSysInfoClose.bind(this);
  }

  componentDidMount() {
    initPublicRoutes();
    PublicStore.listen(this.onChange);
    RStore.listen(this.onChange);
    PublicActions.initialize();
    PublicActions.fetchOlsChmo();

    // Check if SysInfo was previously closed
    const closed = sessionStorage.getItem('infoBarClosed');
    if (closed === 'true') {
      this.setState({ sysInfoClosed: true });
    }
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

  handleSysInfoClose() {
    this.setState({ sysInfoClosed: true });
  }

  renderGuestPage() {
    const { guestPage, listType } = this.state;
    const { sttEnabled } = PublicStore.getState();

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
        return <RepoReview sttEnabled={sttEnabled || false} />;
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
    const { sysInfoClosed } = this.state;
    const contentClassName = `home-content-with-fixed-header${sysInfoClosed ? ' sysinfo-closed' : ''}`;

    return (
      <div>
        {/* <BaseNavigation />
        <WelcomeMessage /> */}
        <div className="fixed-header">
          <SysInfo onClose={this.handleSysInfoClose} />
          <RepoNavigation />
        </div>
        <Notifications />
        <div className={contentClassName}>
          <div>
            <Container fluid>
              <Row style={{ paddingBottom: '10px' }}>
                {this.renderGuestPage()}
              </Row>
            </Container>
          </div>
        </div>
        <Footer />
        <RepoLoadingModal />
      </div>
    );
  }
}

export default Home;
