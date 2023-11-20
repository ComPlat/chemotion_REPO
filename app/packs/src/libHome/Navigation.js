import React from 'react';
import { Button, Nav, Navbar, NavItem, OverlayTrigger, Tooltip } from 'react-bootstrap';
import UserAuth from 'src/components/navigation/UserAuth';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import NavNewSession from 'src/components/navigation/NavNewSession';
import NavHead from 'src/libHome/NavHead';
import DocumentHelper from 'src/utilities/DocumentHelper';

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
    UserActions.fetchOmniauthProviders();
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIChange);
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = this.state.currentUser ? this.state.currentUser.id : null;
    if (newId !== oldId) { this.setState({ currentUser: state.currentUser }); }


    if (state.omniauthProviders !== this.state.omniauthProviders) {
      this.setState({
        omniauthProviders: state.omniauthProviders
      });
    }
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
    const { modalProps, currentUser, omniauthProviders } = this.state;

    let userBar = (<span />);
    if (currentUser) {
      userBar = (<UserAuth />);
    } else {
      userBar = (<NavNewSession authenticityToken={this.token()} omniauthProviders={omniauthProviders} />);
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
              Data publications
            </NavItem>
            <NavItem eventKey={7} onClick={() => Aviator.navigate('/home/moleculeArchive')} className="white-nav-item" >
              Molecule Archive
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
                  <i className="fa fa-bullhorn" aria-hidden="true" />&nbsp;Newsroom1
                </NavItem> : null
            }
            {
              true ?
                <NavItem eventKey={5} target="_blank" href="https://www.chemotion.net/docs/repo" className="white-nav-item">
                  <i className="fa fa-question-circle" aria-hidden="true" />&nbsp;How-To
                </NavItem> : null
            }
            <NavItem eventKey={8} onClick={() => Aviator.navigate('/home/genericHub')} className="repo-generic-hub-btn">
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="_tooltip_labimotion_hub">LabIMotion Template Hub</Tooltip>}>
                <Button><i className="fa fa-empire" aria-hidden="true" />{' '}LabIMotion</Button>
              </OverlayTrigger>
            </NavItem>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}
