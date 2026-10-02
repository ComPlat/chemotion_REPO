import React from 'react';
import ScanCodeButton from 'src/components/navigation/ScanCodeButton';
// import SupportMenuButton from 'src/components/navigation/SupportMenuButton';
import UserAuth from 'src/components/navigation/UserAuth';
// import InboxButton from 'src/apps/mydb/mainNavigation/topbar/InboxButton';
// import SampleTaskSidebarButton from 'src/components/sampleTaskInbox/SampleTaskSidebarButton';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import NoticeButton from 'src/apps/mydb/mainNavigation/topbar/NoticeButton';
import PublicationsButton from 'src/apps/mydb/mainNavigation/topbar/PublicationsButton';
import HomeButton from 'src/apps/mydb/mainNavigation/topbar/HomeButton';
import ReviewButton from 'src/apps/mydb/mainNavigation/topbar/ReviewButton';

// Chemotion Repository
import RepositoryMenuButton from "src/components/navigation/RepositoryMenuButton";

export default function Topbar() {
  return (
    <div className="d-flex justify-content-between pe-3 ps-2 topbar">
      <div className="d-flex align-items-center gap-2">
        {/* <InboxButton />
        <SampleTaskSidebarButton /> */}
        <HomeButton />
        <PublicationsButton />
        <ReviewButton />
        <OpenCalendarButton />
        <NoticeButton />
      </div>
      <div className="d-flex align-items-center gap-2">
        <ScanCodeButton />
        <RepositoryMenuButton />
        <UserAuth />
      </div>
    </div>
  );
}
