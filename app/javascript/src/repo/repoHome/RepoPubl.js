import React, { Component } from 'react';
import PublicActions from 'src/repo/actions/PublicActions';
import PublicStore from 'src/repo/stores/PublicStore';
import RepoElementDetails from 'src/repo/repoHome/RepoElementDetails';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';
import RepoMoleculeArchivePage from 'src/repo/repoHome/RepoMoleculeArchivePage';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';
import PublicationSearchPage from 'src/repo/chemrepo/publicationSearch/PublicationSearchPage';

const isPubElementOf = (currentElement) => !!(((currentElement && currentElement.publication
  && currentElement.publication.published_at) || (
  currentElement && currentElement.published_samples
  && currentElement.published_samples.length > 0
  && currentElement.published_samples[0].published_at
)));

export default class RepoPubl extends Component {
  constructor(props) {
    super(props);
    this.state = {
      listType: props.listType || RepoNavListTypes.REACTION,
      currentElement: null,
      listWidth: 420,
    };
    this.onChange = this.onChange.bind(this);
    this.handleResultClick = this.handleResultClick.bind(this);
    this.startResize = this.startResize.bind(this);
    this.onResizeMove = this.onResizeMove.bind(this);
    this.stopResize = this.stopResize.bind(this);
    this.onResizeKey = this.onResizeKey.bind(this);
    this.listRef = React.createRef();
  }

  componentDidMount() {
    PublicActions.selectPublicCollection.defer();
    PublicStore.listen(this.onChange);
  }

  componentDidUpdate(_prevProps, prevState) {
    const wasPub = isPubElementOf(prevState.currentElement);
    const isPub = isPubElementOf(this.state.currentElement);
    const mainContentArea = document.querySelector('.home-content-with-fixed-header');
    if (mainContentArea && wasPub !== isPub) {
      mainContentArea.classList.toggle('has-split-view', isPub);
    }
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
    this.stopResize();
    const mainContentArea = document.querySelector('.home-content-with-fixed-header');
    if (mainContentArea) mainContentArea.classList.remove('has-split-view');
  }

  // Mirror the parts of PublicStore we route on. The Molecule Archive page
  // owns its own subscription for archive-specific data.
  onChange(state) {
    if (!state) return;
    const next = {};
    if ('listType' in state) next.listType = state.listType;
    if ('currentElement' in state) next.currentElement = state.currentElement;
    if (Object.keys(next).length > 0) this.setState(next);
  }

  handleResultClick(hit) {
    RepoLoadingActions.start();
    if (hit.elementType === 'Reaction') {
      PublicActions.displayReaction(hit.elementId);
    } else if (hit.elementType === 'Sample' && hit.moleculeId) {
      PublicActions.displayMolecule(hit.moleculeId, hit.id);
    } else {
      RepoLoadingActions.stop();
    }
  }

  // Drag-to-resize for the split-view divider. state.listWidth (px) drives the
  // list column; the detail column flex-grows to fill the rest. Listeners live
  // on document so the drag keeps tracking even when the pointer leaves the
  // thin handle. MIN_LIST / MIN_DETAIL keep both panes usable.
  onResizeMove(e) {
    const container = this.resizeContainer;
    const el = this.listRef.current;
    if (!container || !el) return;
    const rect = container.getBoundingClientRect();
    const MIN_LIST = 260;
    const MIN_DETAIL = 360;
    const max = Math.max(MIN_LIST, rect.width - MIN_DETAIL);
    const width = Math.min(max, Math.max(MIN_LIST, e.clientX - rect.left));
    // Mutate the list style directly during the drag so the heavy detail pane
    // isn't re-rendered on every mousemove; commit to state on mouseup.
    this.pendingWidth = width;
    el.style.flex = `0 0 ${width}px`;
    el.style.width = `${width}px`;
  }

  // Keyboard resize: the divider is a focusable separator, so arrow keys nudge
  // the split by a fixed step (clamped to the same bounds as the drag).
  onResizeKey(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const rect = e.currentTarget.parentNode.getBoundingClientRect();
    const MIN_LIST = 260;
    const max = Math.max(MIN_LIST, rect.width - 360);
    const step = e.key === 'ArrowLeft' ? -24 : 24;
    this.setState((s) => ({
      listWidth: Math.min(max, Math.max(MIN_LIST, s.listWidth + step)),
    }));
  }

  startResize(e) {
    e.preventDefault();
    this.resizeContainer = e.currentTarget.parentNode;
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.stopResize);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }

  stopResize() {
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.stopResize);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (this.pendingWidth != null) {
      this.setState({ listWidth: this.pendingWidth });
      this.pendingWidth = null;
    }
  }

  render() {
    const { listType, currentElement, listWidth } = this.state;
    const isPubElement = isPubElementOf(currentElement);
    const isMoleculeArchive = listType === RepoNavListTypes.MOLECULE_ARCHIVE;

    let mainContent;
    if (isMoleculeArchive) {
      mainContent = <RepoMoleculeArchivePage />;
    } else {
      // Keep ONE wrapper structure across both states so React never remounts
      // PublicationSearchPage when a detail opens/closes — a remount would wipe
      // its local search/filter state. We only toggle classes and append the
      // resizer + detail pane when a publication is open.
      mainContent = (
        <div className={isPubElement ? 'repo-publ-split-view' : 'repo-publ-full-view'}>
          <div
            className={isPubElement ? 'repo-publ-split-list' : 'repo-publ-full-list'}
            ref={this.listRef}
            style={isPubElement ? { flex: `0 0 ${listWidth}px`, width: `${listWidth}px` } : undefined}
          >
            <PublicationSearchPage
              onResultClick={this.handleResultClick}
              onPanelOpen={() => PublicActions.close()}
              detailOpen={isPubElement}
            />
          </div>
          {isPubElement && (
            <>
              <div
                className="repo-publ-split-resizer"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize list and detail"
                tabIndex={0}
                title="Drag to resize"
                onMouseDown={this.startResize}
                onKeyDown={this.onResizeKey}
              />
              <div className="repo-publ-split-detail">
                <div className="public-element">
                  <RepoElementDetails />
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <div className={isPubElement ? 'repo-publ-container-split' : 'repo-publ-container'}>
        <div className="repo-publ-layout">
          <div
            className="repo-publ-main"
            style={{
              position: 'relative',
              flex: 1,
              maxWidth: '2000px',
              marginLeft: 0,
              marginRight: 'auto',
              minWidth: 0,
            }}
          >
            {mainContent}
          </div>
        </div>
      </div>
    );
  }
}
