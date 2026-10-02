import React, { useEffect, useState } from 'react';
import {
  Button,
  Nav,
  Navbar,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import Aviator from 'aviator';
import UserAuth from 'src/components/navigation/UserAuth';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import PublicStore from 'src/repo/stores/PublicStore';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';
import NewSession from 'src/components/navigation/NavNewSession';
import DocumentHelper from 'src/utilities/DocumentHelper';

const NAV_LINKS = [
  { key: 2, url: '/home/publications', label: 'Publications', icon: 'fa-book', groupStart: true, match: { guestPage: 'publications', notListType: RepoNavListTypes.MOLECULE_ARCHIVE } },
  { key: 7, url: '/home/moleculeArchive', label: 'Molecule Archive', icon: 'fa-archive', match: { guestPage: 'publications', listType: RepoNavListTypes.MOLECULE_ARCHIVE } },
  { key: 3, url: '/home/review', label: 'Review', icon: 'fa-check-circle', authOnly: true, match: { guestPage: 'review' } },
  { key: 6, url: '/home/embargo', label: 'Embargoed', icon: 'fa-lock', authOnly: true, match: { guestPage: 'embargo' } },
  { key: 9, url: '/home/newsroom', label: 'News', icon: 'fa-newspaper-o', groupStart: true, match: { guestPage: 'newsroom' } },
];

const isActive = (pageState, match) => {
  if (!match) return false;
  if (match.guestPage !== pageState.guestPage) return false;
  if (match.listType && match.listType !== pageState.listType) return false;
  // Publications spans every publications listType except the Molecule Archive
  // (its own tab), so it stays active for reaction / sample / scheme / search
  // results alike — displaying a result changes listType but not the tab.
  if (match.notListType && match.notListType === pageState.listType) return false;
  return true;
};

const NavItem = ({ item, pageState, navKey, onActivate }) => {
  // navKey is the just-clicked item and wins immediately, so the highlight can't
  // be clobbered by the PublicStore round-trip that Aviator.navigate triggers in
  // the same click. When no click is pending (external / back-forward nav) fall
  // back to the store-derived match.
  const active = navKey != null ? item.key === navKey : isActive(pageState, item.match);
  return (
    <Nav.Link
      eventKey={item.key}
      active={active}
      title={item.label}
      onClick={() => onActivate(item)}
      className={`repo-nav-link${active ? ' active' : ''}${item.groupStart ? ' repo-nav-group' : ''}`}
    >
      <i className={`fa ${item.icon}`} aria-hidden="true" />
      <span>{item.label}</span>
    </Nav.Link>
  );
};

const RepoNavigation = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [omniauthProviders, setOmniauthProviders] = useState(undefined);
  const [pageState, setPageState] = useState(() => {
    const s = PublicStore.getState() || {};
    return { guestPage: s.guestPage, listType: s.listType };
  });
  // The item the user just clicked. It highlights instantly and is only released
  // once the store settles on a page where that item is no longer active (i.e. a
  // genuine navigation elsewhere), so the store round-trip / async page loads
  // can't leave the clicked tab un-highlighted for a render.
  const [navKey, setNavKey] = useState(null);

  const activateMatch = (match) => {
    if (!match) return;
    setPageState((prev) => {
      const next = { guestPage: match.guestPage, listType: match.listType };
      if (prev.guestPage === next.guestPage && prev.listType === next.listType) return prev;
      return next;
    });
  };

  // Single entry point for every in-app nav click: remember the clicked key,
  // update the store-derived state optimistically, then route.
  const go = (item) => {
    setNavKey(item.key ?? null);
    activateMatch(item.match);
    Aviator.navigate(item.url);
  };

  useEffect(() => {
    const onUserChange = (state) => {
      setCurrentUser((prev) => {
        const newId = state.currentUser?.id ?? null;
        const oldId = prev?.id ?? null;
        return newId !== oldId ? state.currentUser : prev;
      });
      setOmniauthProviders((prev) =>
        state.omniauthProviders !== prev ? state.omniauthProviders : prev
      );
    };

    const onPublicChange = (state) => {
      if (!state) return;
      const next = { guestPage: state.guestPage, listType: state.listType };
      setPageState((prev) =>
        (prev.guestPage === next.guestPage && prev.listType === next.listType ? prev : next));
      // Release the clicked-item override once the store lands on a page where
      // that item is no longer the active one — that's a real navigation away,
      // so hand the highlight back to the store-derived match.
      setNavKey((prevKey) => {
        if (prevKey == null) return prevKey;
        const item = NAV_LINKS.find((i) => i.key === prevKey);
        return item && isActive(next, item.match) ? prevKey : null;
      });
    };

    UserStore.listen(onUserChange);
    PublicStore.listen(onPublicChange);
    UserActions.fetchCurrentUser();
    UserActions.fetchUserLabels();
    UserActions.fetchOmniauthProviders();

    return () => {
      UserStore.unlisten(onUserChange);
      PublicStore.unlisten(onPublicChange);
    };
  }, []);

  const token = DocumentHelper.getMetaContent('csrf-token');
  const userBar = currentUser ? (
    <UserAuth isRepo />
  ) : (
    <NewSession
      authenticityToken={token}
      omniauthProviders={omniauthProviders}
    />
  );

  return (
    <Navbar expand="lg" className="repo-navbar">
      <Navbar.Brand
        onClick={() => go({ key: null, match: { guestPage: 'home' }, url: '/home' })}
        className="repo-brand"
      >
        <span className="repo-brand-text">
          <i className="fa fa-home" aria-hidden="true" /> Chemotion <b>Repository</b>
        </span>
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="ms-auto align-items-lg-center">
          {currentUser && (
            <Nav.Link
              eventKey={1}
              href="/mydb"
              title="My DB"
              className="repo-nav-link repo-nav-group"
            >
              <i className="fa fa-database" aria-hidden="true" />
              <span>My DB</span>
            </Nav.Link>
          )}
          {NAV_LINKS.filter((item) => !item.authOnly || currentUser).map(
            (item) => (
              <NavItem
                key={item.key}
                item={item}
                pageState={pageState}
                navKey={navKey}
                onActivate={go}
              />
            )
          )}
          <Nav.Link
            eventKey={5}
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.chemotion.net/docs/repo"
            title="How-To"
            className="repo-nav-link"
          >
            <i className="fa fa-question-circle" aria-hidden="true" />
            <span>How-To</span>
          </Nav.Link>
          <Nav.Item eventKey={8} className="d-flex align-items-center ms-2">
            <OverlayTrigger
              placement="bottom"
              overlay={
                <Tooltip id="_tooltip_labimotion_hub">
                  LabIMotion Template Hub
                </Tooltip>
              }
            >
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => go({ key: null, match: { guestPage: 'genericHub' }, url: '/home/genericHub' })}
              >
                <i className="fa fa-empire" aria-hidden="true" />
                <span>Template Hub</span>
              </Button>
            </OverlayTrigger>
          </Nav.Item>
          <Nav.Item className="d-flex align-items-center ms-3 me-2 repo-userbar">
            {userBar}
          </Nav.Item>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default RepoNavigation;
