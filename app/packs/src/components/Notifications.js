import React, { Component } from 'react';
import NotificationSystem from 'react-notification-system';
import connectToStores from 'alt-utils/lib/connectToStores';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import NotificationStore from 'src/stores/alt/stores/NotificationStore';
import uuid from 'uuid';

class Notifications extends Component {
  componentDidMount() {
    NotificationActions.setComponentReference(this.notificationSystem);
  }

  render() {
    return (
      <div>
        <NotificationSystem ref={(notification) => { this.notificationSystem = notification; }} />
      </div>
    );
  }
}

const getStores = () => [NotificationStore];
const getPropsFromStores = () => NotificationStore.getState();
export default connectToStores({ getStores, getPropsFromStores }, Notifications);
