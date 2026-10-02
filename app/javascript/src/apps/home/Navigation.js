import React from 'react';
import PropTypes from 'prop-types';
import {
  Nav,
  Navbar,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import UserAuth from 'src/components/navigation/UserAuth';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import NavNewSession from 'src/components/navigation/NavNewSession';
import ChemotionLogo from 'src/components/common/ChemotionLogo';
import RepositoryMenuButton from 'src/components/navigation/RepositoryMenuButton';
import DocumentHelper from 'src/utilities/DocumentHelper';
import Search from 'src/components/navigation/search/Search';

// For Repository
import NavHead from 'src/repo/repoHome/RepoNavHead';

const colMenuTooltip = (
  <Tooltip id="collection-menu-tooltip">Collection Tree</Tooltip>
);

export default class Navigation extends React.Component {
  static token() {
    return DocumentHelper.getMetaContent('csrf-token');
  }

  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      omniauthProviders: {},
      extraRules: {},
    };
    this.onChange = this.onChange.bind(this);
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchOmniauthProviders();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const { currentUser, omniauthProviders, extraRules } = this.state;
    const newId = state.currentUser ? state.currentUser.id : null;
    const oldId = currentUser ? currentUser.id : null;

    if (newId !== oldId) {
      this.setState({
        currentUser: state.currentUser
      });
    }

    if (state.omniauthProviders !== omniauthProviders) {
      this.setState({
        omniauthProviders: state.omniauthProviders
      });
    }

    if (state.extraRules !== extraRules) {
      this.setState({
        extraRules: state.extraRules
      });
    }
  }

  toggleCollectionTree() {
    // Toggle collection tree visibility
    // Implementation would depend on the specific requirements
    const { isHidden } = this.props;
    if (!isHidden) {
      // Toggle logic here
    }
  }

  userSession() {
    const { currentUser, omniauthProviders, extraRules } = this.state;
    const { isHidden } = this.props;

    return currentUser
      ? <UserAuth />
      : (
        <Navbar className="navbar-custom">
          {this.navHeader()}
          <Nav navbar className="navbar-form" style={{ visibility: isHidden ? 'hidden' : 'visible' }}>
            <Search noSubmit />
          </Nav>
          <NavNewSession
            authenticityToken={Navigation.token()}
            omniauthProviders={omniauthProviders}
            extraRules={extraRules}
          />
          <div style={{ clear: 'both' }} />
        </Navbar>
      );
  }

  navHeader() {
    const { isHidden } = this.props;

    return (
      <Navbar.Header className="collec-tree">
        <Navbar.Text style={{ cursor: 'pointer' }}>
          <OverlayTrigger placement="right" delayShow={1000} overlay={colMenuTooltip}>
            <button
              type="button"
              className="btn btn-link fa fa-list"
              style={{ fontStyle: 'normal', visibility: isHidden ? 'hidden' : 'visible' }}
              onClick={this.toggleCollectionTree}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  this.toggleCollectionTree();
                }
              }}
              aria-label="Toggle collection tree"
            />
          </OverlayTrigger>
        </Navbar.Text>
        <Navbar.Text />
        <NavHead />
      </Navbar.Header>
    );
  }

  render() {
    return (
      <div className="surface-lighten4 d-flex align-items-center justify-content-between px-4 py-3">
        <a href="/mydb">
          <ChemotionLogo />
        </a>

        <div className="d-flex gap-2">
          <RepositoryMenuButton linkToEln />
          {this.userSession()}
        </div>
      </div>
    );
  }
}

Navigation.propTypes = {
  isHidden: PropTypes.bool,
};

Navigation.defaultProps = {
  isHidden: false,
};
