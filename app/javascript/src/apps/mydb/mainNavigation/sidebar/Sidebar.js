import React, { useState, useEffect } from 'react';
import classnames from 'classnames';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

import ChemotionLogo from 'src/components/common/ChemotionLogo';
// import CollectionTree from 'src/apps/mydb/collections/CollectionTree'; // ELN
import CollectionTree from 'src/apps/mydb/collections/RepoCollectionTree'; // Chemotion Repository
import PanelCollapseButton from 'src/apps/mydb/mainNavigation/PanelCollapseButton';
import SidebarButton from 'src/apps/mydb/mainNavigation/sidebar/SidebarButton';

// For Chemotion Repository
import AppInfo from 'src/repo/chemrepo/AppInfo';


export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  useEffect(() => {
    const onUiStoreChange = ({ isSidebarCollapsed }) => setIsCollapsed(isSidebarCollapsed);
    UIStore.listen(onUiStoreChange);
    onUiStoreChange(UIStore.getState());
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);

  return (
    <div className={classnames('sidebar', { 'sidebar--collapsed': isCollapsed })}>
      <div className="sidebar-content">
        {/* Adjust styles for REPO */}
        <div className="flex-grow-1 h-0 d-flex flex-column overflow-hidden">
          <CollectionTree isCollapsed={isCollapsed} />
          {/* Add for REPO */}
          {!isCollapsed && (
            <div className="sidebar-appinfo-wrapper">
              <AppInfo />
            </div>
          )}
          {isCollapsed && (
            <SidebarButton
              label="Help & Version"
              icon="fa fa-info-circle"
              isCollapsed
              onClick={() => UIActions.expandSidebar.defer()}
            />
          )}
          <a href="/mydb" title="Link to mydb index page" className="sidebar-logo">
            <ChemotionLogo collapsed={isCollapsed} />
          </a>
        </div>
        {/* Comment out. tag: R */}
        {/* <div className={classnames(
          'sidebar-button-frame justify-content-center mx-auto',
          { 'flex-column': isCollapsed }
        )}
        >
        </div> */}
      </div>
      <div className="sidebar-collapse-button-container">
        <PanelCollapseButton onClick={UIActions.toggleSidebar} isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
