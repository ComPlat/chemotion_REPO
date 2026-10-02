import React from 'react';
import NotificationButton from 'src/apps/mydb/mainNavigation/topbar/NotificationButton';

export default function HomeButton() {
  return (
    <NotificationButton
      onClick={() => window.open('/home', '_blank')}
      label="Home"
      icon="fa-home"
    />
  );
}
