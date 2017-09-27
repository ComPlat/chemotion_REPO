import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row } from 'react-bootstrap';
import Aviator from 'aviator';

import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import initPublicRoutes from './homeRoutes';

import Navigation from './Navigation';
import XHome from '../components/extra/HomeXHome';
import Notifications from '../components/Notifications';
import RepoEmbargo from './RepoEmbargo';
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
import RepoElementDetails from './RepoElementDetails';
import NavFooter from './NavFooter';

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
  }

  onChange(publicState) {
    if (this.state.guestPage !== publicState.guestPage) {
      this.setState(prevState => ({ ...prevState, guestPage: publicState.guestPage }));
    }
  }

  renderGuestPage() {
    switch (this.state.guestPage) {
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
        return <RepoPubl />;
      case 'review':
        return <RepoReview />;
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
        return <span />;
      case 'review':
        return <span />;
      case 'embargo':
        return <span />;
      case 'newseditor':
        return <span />;
      case 'newsreader':
        return <span />;
      case 'newsroom':
        return <span />;
      case 'howtoeditor':
        return <span />;
      case 'howtoreader':
        return <span />;
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
      </div>
    );
  }
}

const HomeWithDnD = DragDropContext(HTML5Backend)(Home);
// $(document).ready(function() {
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) {
    ReactDOM.render(<HomeWithDnD />, domElement);
    initPublicRoutes();
    Aviator.dispatch();
  }
});
