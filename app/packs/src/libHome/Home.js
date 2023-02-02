import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row } from 'react-bootstrap';
import Aviator from 'aviator';

import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import WelcomeMessage from '../components/WelcomeMessage';

import initPublicRoutes from './homeRoutes';

import Navigation from './Navigation';
import XHome from '../components/extra/HomeXHome';
import Notifications from '../components/Notifications';
import RepoEmbargo from './RepoEmbargo';
import RepoCollection from './RepoCollection';
import RepoHome from './RepoHome';
import RepoPubl from './RepoPubl';
import RepoReview from './RepoReview';
import RepoAbout from './RepoAbout';
import RepoContact from './RepoContact';
import RepoDirective from './RepoDirective';
import RepoNewsroom from './RepoNewsroom';
import RepoNewsReader from './RepoNewsReader';
import RepoNewsEditor from './RepoNewsEditor';
import RepoHowTo from './RepoHowTo';
import RepoHowToReader from './RepoHowToReader';
import RepoHowToEditor from './RepoHowToEditor';

import PublicStore from '../components/stores/PublicStore';
import ReviewStore from '../components/stores/ReviewStore';
import RepoElementDetails from './RepoElementDetails';
import NavFooter from './NavFooter';
import LoadingModal from '../components/common/LoadingModal';

const extraHomes = () => {
  const homes = [];
  const count = XHome.count || 0;
  for (let j = 0; j < count; j += 1) {
    homes.push(XHome[`content${j}`]);
  }
  return homes;
};

class Home extends Component {
  constructor(props) {
    super();
    this.state = {
      guestPage: null
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
    ReviewStore.listen(this.onChange);
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
    ReviewStore.unlisten(this.onChange);
  }

  onChange(publicState) {
    this.setState(prevState => ({ ...prevState, ...publicState }));
  }

  renderGuestPage() {
    switch (this.state.guestPage) {
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
        return <RepoPubl listType={this.state.listType || ''} />;
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
        return <RepoDirective />;
      default:
        return <RepoHome />;
    }
  }

  renderNavFooter() {
    switch (this.state.guestPage) {
      case 'publications':
      case 'review':
      case 'embargo':
      case 'newseditor':
      case 'newsreader':
      case 'newsroom':
      case 'howtoeditor':
      case 'howtoreader':
      case 'howto':
        return <span />;
      default:
        return <NavFooter />;
    }
  }

  render() {
    return (
      <div>
        { XHome.count && XHome.count > 0
          ? extraHomes().map((Annex, i) => <Annex key={`Annex_${i}`} />)
          : (
            <div>
              <Grid fluid>
                <Row className="card-navigation">
                  <Navigation />
                  <Notifications />
                </Row>
                <Row style={{ margin: '10px' }}>
                  {this.renderGuestPage()}
                </Row>
              </Grid>
              {this.renderNavFooter()}
            </div>
          )
        }
        <LoadingModal />
      </div>
    );
  }
}

const HomeWithDnD = DragDropContext(HTML5Backend)(Home);
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) {
    ReactDOM.render(<HomeWithDnD />, domElement);
    initPublicRoutes();
    Aviator.dispatch();
  }
});
