import React, { Fragment, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import SidebarButton from 'src/apps/mydb/mainNavigation/sidebar/SidebarButton';

import Aviator from 'aviator';
import { collectionShow } from 'src/utilities/routesUtils';

const ALL_COLLECTIONS_KEY = 'collections';

function containsCollection(collections, collectionId) {
  if (!collections || collections.length === 0) return false;
  return collections.some((collection) => {
    if (collection.id === collectionId) return true;
    return containsCollection(collection.children, collectionId);
  });
}

function CollectionTree({ isCollapsed }) {
  const [collections, setCollections] = useState(CollectionStore.getState());
  const [activeCollection, setActiveCollection] = useState(ALL_COLLECTIONS_KEY);
  const [expandedCollection, setExpandedCollection] = useState(ALL_COLLECTIONS_KEY);

  const toggleCollection = (collectionKey) => {
    setExpandedCollection((prev) => ((prev === collectionKey) ? null : collectionKey));
  };

  const setCollection = (collection) => {
    if (collection !== activeCollection) {
      setActiveCollection(collection);
      if (isCollapsed) UIActions.expandSidebar.defer();
      setExpandedCollection(collection);
    }
  };

  useEffect(() => {
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();

    // Create a copy of the collection store state to trigger a re-render
    const onCollectionStoreChange = (s) => setCollections({ ...s });
    CollectionStore.listen(onCollectionStoreChange);
    return () => CollectionStore.unlisten(onCollectionStoreChange);
  }, []);

  const { lockedRoots, syncInRoots } = collections;

  const collectionGroups = [
    {
      label: 'My Collections',
      icon: 'icon-collection',
      collectionKey: ALL_COLLECTIONS_KEY,
      roots: lockedRoots.filter(root => root.label !== 'All'), // ELN use unsharedRoots,
      onClickOpenCollection: 'all',
    },
  ];

  // Set the active collection based on the currentCollection in UIStore
  useEffect(() => {
    const onUiStoreChange = ({ currentCollection }) => {
      if (!currentCollection) return;

      // Expand the matching group (keeps tree open) but do NOT activate the header —
      // the sub-collection row carries its own active highlight.
      const group = collectionGroups.find(({ roots }) => containsCollection(roots, currentCollection.id));
      if (group) setExpandedCollection(group.collectionKey);

      // Header active only when user is on the group's landing view (e.g. 'All').
      if (currentCollection.label === 'All') {
        setActiveCollection(ALL_COLLECTIONS_KEY);
      } else {
        setActiveCollection(null);
      }
    };

    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
  }, [collectionGroups]);

  return (
    <div className="flex-grow-1 d-flex flex-column overflow-y-auto" style={{ minHeight: 0 }}>
      <div className="sidebar-button-frame tree-view_frame flex-column">
        {/* Repository Collections */}
        {(() => {
          const publicSubtrees = () => {
            let syncInRootsProcessed = syncInRoots ? [...syncInRoots] : [];

            // Remove orphan roots and make public
            syncInRootsProcessed = syncInRootsProcessed.filter(root => root !== null && root.shared_by?.initials == 'CI');

            let orderedRoots = [];
            if (syncInRootsProcessed && syncInRootsProcessed[0] && syncInRootsProcessed[0].children) {
              syncInRootsProcessed[0].children.forEach((e) => {
                if (e.label && e.label.match(/hemotion/)) {
                  orderedRoots[0] = { ...e, label: 'Chemotion' };
                } else if (typeof e.label === 'string' && e.label === 'Scheme-only reactions') {
                  orderedRoots[1] = e;
                } else if (e.label && e.label.match(/Published Elements/)) {
                  orderedRoots[2] = { ...e, label: 'My Published Elements' };
                } else if (e.label === 'Pending Publications') {
                  orderedRoots[3] = e;
                } else if (typeof e.label === 'string' && e.label.startsWith('Reviewing')) {
                  orderedRoots[4] = e;
                } else if (typeof e.label === 'string' && e.label.startsWith('Element To Review')) {
                  orderedRoots[5] = e;
                } else if (typeof e.label === 'string' && e.label.startsWith('Reviewed')) {
                  orderedRoots[6] = e;
                } else if (typeof e.label === 'string' && e.label === 'Embargo Accepted') {
                  orderedRoots[7] = e;
                } else if (e.label === 'Embargoed Publications') {
                  orderedRoots[8] = e;
                }
              });
            }

            return orderedRoots.filter(root => root !== undefined);
          };

          const processedRoots = publicSubtrees();

          // Collapsed sidebar: show single icon that expands sidebar.
          // Expanded sidebar: section header + always-visible sub-collections (no toggle).
          if (isCollapsed) {
            return (
              <SidebarButton
                label="Repository"
                icon="fa fa-database"
                isCollapsed
                onClick={() => UIActions.expandSidebar.defer()}
              />
            );
          }

          return (
            <Fragment key="repository">
              <div className="sidebar-section-header">
                <i className="fa fa-database" />
                <span>Repository</span>
              </div>
              {processedRoots.length > 0 ? (
                <div className="tree-view_container tree-view_container--scrollable">
                  {processedRoots.map((root) => (
                    <CollectionSubtree key={root.id} root={root} level={1} />
                  ))}
                </div>
              ) : (
                <div className="tree-view_container">
                  <div className="text-muted text-center p-2">Loading repository...</div>
                </div>
              )}
            </Fragment>
          );
        })()}
        {/* My Collections */}
        {collectionGroups.map(({
          label, icon, collectionKey, roots, onClickOpenCollection
        }) => {
          const isActive = activeCollection === collectionKey;
          const isExpanded = expandedCollection === collectionKey;
          return (
            <Fragment key={collectionKey}>
              <SidebarButton
                label={label}
                icon={icon}
                isCollapsed={isCollapsed}
                onClick={() => {
                  if (onClickOpenCollection !== undefined) {
                    setCollection(collectionKey);
                    Aviator.navigate(`/collection/${onClickOpenCollection}`, { silent: true });
                    collectionShow({ params: { collectionID: onClickOpenCollection } });
                  }
                }}
                expandable
                isExpanded={isExpanded}
                onToggleExpansion={() => toggleCollection(collectionKey)}
                appendComponent={null}
                active={isActive}
              />
              {isExpanded && !isCollapsed && roots !== undefined && (
                <div className="tree-view_container">
                  {roots.length === 0
                    ? <div className="text-muted text-center p-2">No collections</div>
                    : roots.map((root) => {
                      // create a copy of the root with computed label
                      const rootWithLabel = collectionKey === 'syncedWithMe'
                        ? { ...root, label: CollectionStore.getChildLabel(root) }
                        : root;

                      return <CollectionSubtree key={root.id} root={rootWithLabel} level={1} />;
                    })}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

CollectionTree.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
};

export default CollectionTree;
