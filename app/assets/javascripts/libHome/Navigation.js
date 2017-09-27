import React from 'react';
import { Nav, Navbar, NavItem, Label } from 'react-bootstrap';
import UserAuth from '../components/UserAuth';
import ManagingActions from '../components/managing_actions/ManagingActions';
import ContextActions from '../components/contextActions/ContextActions';
import UserStore from '../components/stores/UserStore';
import UIStore from '../components/stores/UIStore';
import UserActions from '../components/actions/UserActions';
import UIActions from '../components/actions/UIActions';
import ElementActions from '../components/actions/ElementActions';
import NavNewSession from './NavNewSession';
import NavHead from './NavHead';
import DocumentHelper from '../components/utils/DocumentHelper';
import NavigationModal from '../components/NavigationModal';
import PublicActions from '../components/actions/PublicActions';

export default class Navigation extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      modalProps: {
        show: false,
        title: '',
        component: '',
        action: null,
        listSharedCollections: false,
      }
    };
    this.onChange = this.onChange.bind(this);
    this.onUIChange = this.onUIChange.bind(this);
    // this.toggleCollectionTree = this.toggleCollectionTree.bind(this)
  }

  componentDidMount() {
    UIStore.listen(this.onUIChange);
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIChange);
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) { this.setState({ currentUser: state.currentUser }); }
  }

  onUIChange(state) {
    this.setState({
      modalProps: state.modalParams,
    });
  }

  // toggleCollectionTree() {
  //   this.props.toggleCollectionTree();
  // }

  token() { return DocumentHelper.getMetaContent("csrf-token") }

  updateModalProps(modalProps) { this.setState({ modalProps }); }

  navHeader() {
    return (
      <Navbar.Header className="collec-tree">
        <Navbar.Text style={{cursor: "pointer"}}>
          {/* <i  className="fa fa-list" style={{fontStyle: "normal"}}
              onClick={this.toggleCollectionTree} /> */}
        </Navbar.Text>
        <Navbar.Text />
        <NavHead />
      </Navbar.Header>
    )
  }

  render() {
    const { modalProps, currentUser } = this.state;

    let userBar = (<span />);
    if (currentUser) {
      userBar = (<UserAuth />);
    } else {
      userBar = (<NavNewSession authenticityToken={this.token()} />);
    }
    // const logo = <img height={50} alt="Chemotion-Repository" src="/images/repo/chemotion_full.svg"/>
    return (
      <Navbar fluid className="navbar-custom">
        <Navbar.Header>
          <Navbar.Brand>
            <a role="button" tabIndex={0} onClick={() => Aviator.navigate('/home')} >
              Chemotion-Repository</a>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
          {userBar}
          <Nav>
            {currentUser ?
              <NavItem eventKey={1} href="/mydb" className="white-nav-item">
                My DB
              </NavItem>
              : null }
            <NavItem eventKey={2} onClick={() => Aviator.navigate('/home/publications')} className="white-nav-item" >
              Publications
            </NavItem>
            { currentUser ?
              <NavItem eventKey={3} onClick={() => Aviator.navigate('/home/review')} className="white-nav-item" >
                Review
              </NavItem> : null
            }
            {currentUser ?
              <NavItem eventKey={6} onClick={() => Aviator.navigate('/home/embargo')} className="white-nav-item" >
                Embargoed Publications
              </NavItem> : null
            }
            {
              true ?
                <NavItem eventKey={4} onClick={() => Aviator.navigate('/home/newsroom')} className="white-nav-item">
                  Newsroom&nbsp;<i className="fa fa-bullhorn" aria-hidden="true" />
                </NavItem> : null
            }
            {
              true ?
                <NavItem eventKey={5} onClick={() => Aviator.navigate('/home/howto')} className="white-nav-item">
                  How-To&nbsp;<i className="fa fa-question-circle" aria-hidden="true" />
                </NavItem> : null
            }
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}
