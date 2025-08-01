import React from 'react';
import {
  Button,
  Nav,
  Navbar,
  NavItem,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import Aviator from 'aviator';
import UserAuth from 'src/components/navigation/UserAuth';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import NavNewSession from 'src/components/navigation/NavNewSession';
import DocumentHelper from 'src/utilities/DocumentHelper';

const aviItem = (currentUser, key, url, text, onNavigate, isActive = false) => {
  if (!currentUser) return null;
  const className = `white-nav-item${isActive ? ' active' : ''}`;
  return (
    <NavItem
      eventKey={key}
      onClick={() => {
        Aviator.navigate(url);
        if (onNavigate) onNavigate();
      }}
      className={className}
    >
      {text}
    </NavItem>
  );
};

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      currentRoute: window.location.pathname,
    };
    this.onChange = this.onChange.bind(this);
    this.onRouteChange = this.onRouteChange.bind(this);
    // this.toggleCollectionTree = this.toggleCollectionTree.bind(this)
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchUserLabels();
    UserActions.fetchOmniauthProviders();

    // Listen for route changes to update active state
    window.addEventListener('popstate', this.onRouteChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
    window.removeEventListener('popstate', this.onRouteChange);
  }

  onRouteChange() {
    this.setState({ currentRoute: window.location.pathname });
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) {
      this.setState({ currentUser: state.currentUser });
    }

    if (state.omniauthProviders !== this.state.omniauthProviders) {
      this.setState({
        omniauthProviders: state.omniauthProviders,
      });
    }
  }

  // toggleCollectionTree() {
  //   this.props.toggleCollectionTree();
  // }

  token() {
    return DocumentHelper.getMetaContent('csrf-token');
  }

  getCurrentRoute() {
    const { currentRoute } = this.state;
    return currentRoute || window.location.pathname;
  }

  isActiveRoute(url) {
    const currentRoute = this.getCurrentRoute();
    if (
      url === '/home' &&
      (currentRoute === '/' ||
        currentRoute === '/home' ||
        currentRoute === '/home/')
    ) {
      return true;
    }
    return currentRoute.startsWith(url);
  }

  render() {
    const { currentUser, omniauthProviders } = this.state;

    let userBar = <span />;
    if (currentUser) {
      userBar = <UserAuth />;
    } else {
      userBar = (
        <NavNewSession
          authenticityToken={this.token()}
          omniauthProviders={omniauthProviders}
        />
      );
    }
    // const logo = <img height={50} alt="Chemotion-Repository" src="/images/repo/chemotion_full.svg"/>
    return (
      <Navbar fluid className="navbar-custom">
        <Navbar.Header>
          <Navbar.Brand>
            <a
              role="button"
              tabIndex={0}
              onClick={() => {
                Aviator.navigate('/home');
                this.onRouteChange();
              }}
            >
              Chemotion-Repository
            </a>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
          {userBar}
          <Nav>
            {currentUser ? (
              <NavItem eventKey={1} href="/mydb" className="white-nav-item">
                My DB
              </NavItem>
            ) : null}
            {aviItem(
              true,
              2,
              '/home/publications',
              'Data Publications',
              this.onRouteChange,
              this.isActiveRoute('/home/publications')
            )}
            {aviItem(
              true,
              7,
              '/home/moleculeArchive',
              'Molecule Archive',
              this.onRouteChange,
              this.isActiveRoute('/home/moleculeArchive')
            )}
            {aviItem(
              currentUser,
              3,
              '/home/review',
              'Review',
              this.onRouteChange,
              this.isActiveRoute('/home/review')
            )}
            {aviItem(
              currentUser,
              6,
              '/home/embargo',
              'Embargoed Publications',
              this.onRouteChange,
              this.isActiveRoute('/home/embargo')
            )}
            {aviItem(
              true,
              9,
              '/home/newsroom',
              'News',
              this.onRouteChange,
              this.isActiveRoute('/home/newsroom')
            )}
            <NavItem
              eventKey={5}
              target="_blank"
              href="https://www.chemotion.net/docs/repo"
              className="white-nav-item"
            >
              <b style={{ color: '#1976d2' }}>How-To</b>
            </NavItem>
            <NavItem
              eventKey={8}
              onClick={() => {
                Aviator.navigate('/home/genericHub');
                this.onRouteChange();
              }}
              className={`repo-generic-hub-btn${
                this.isActiveRoute('/home/genericHub') ? ' active' : ''
              }`}
            >
              <OverlayTrigger
                placement="bottom"
                overlay={
                  <Tooltip id="_tooltip_labimotion_hub">
                    LabIMotion Template Hub
                  </Tooltip>
                }
              >
                <Button>
                  <i className="fa fa-empire" aria-hidden="true" /> LabIMotion
                </Button>
              </OverlayTrigger>
            </NavItem>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}
