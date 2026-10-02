import React from 'react';
import NotificationButton from 'src/apps/mydb/mainNavigation/topbar/NotificationButton';

export default function PublicationsButton() {
  return (
    <NotificationButton
      onClick={() => window.open('/home/publications', '_blank')}
      label="Publications"
      icon="fa-book"
    />
  );
}
