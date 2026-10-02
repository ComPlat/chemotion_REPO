import React, { useEffect, useState } from 'react';
import UserStore from 'src/stores/alt/stores/UserStore';
import NotificationButton from 'src/apps/mydb/mainNavigation/topbar/NotificationButton';

export default function ReviewButton() {
  const [isReviewer, setIsReviewer] = useState(
    !!UserStore.getState().currentUser?.is_reviewer
  );

  useEffect(() => {
    const onChange = (state) => {
      setIsReviewer(!!state.currentUser?.is_reviewer);
    };
    UserStore.listen(onChange);
    return () => UserStore.unlisten(onChange);
  }, []);

  if (!isReviewer) return null;

  return (
    <NotificationButton
      onClick={() => window.open('/home/review', '_blank')}
      label="Review"
      icon="fa-check-circle"
      className="topbar-review-btn"
    />
  );
}
