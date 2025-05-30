import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  PanelGroup, Panel, Button, Modal, Table
} from 'react-bootstrap';
import 'whatwg-fetch';
import _ from 'lodash';
import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import { formatDate } from 'src/utilities/timezoneHelper';

const changeUrl = (url, urlTitle) => (url ? (
  <a href={url} target="_blank" rel="noopener noreferrer">
    {urlTitle || url}
  </a>
) : (
  <span />
));

const handleNotification = (nots, act, needCallback = true) => {
  nots.forEach((n) => {
    if (act === 'rem') {
      NotificationActions.removeByUid(n.id);
    }
    if (act === 'add') {
      const infoTimeString = formatDate(n.created_at);

      const newText = n.content.data
        .split('\n')
        .map((i) => <p key={`${infoTimeString}-${i}`}>{i}</p>);
      const { url, urlTitle } = n.content;
      if (url) {
        newText[newText.length] = (
          <p key={`${infoTimeString}-${url}`}>{changeUrl(url, urlTitle)}</p>
        );
      }

      const notification = {
        title: `From ${n.sender_name} on ${infoTimeString}`,
        message: newText,
        level: n.content.level || 'warning',
        dismissible: 'button',
        autoDismiss: n.content.autoDismiss || 5,
        position: n.content.position || 'tr',
        uid: n.id,
        action: {
          label: (
            <span>
              <i className="fa fa-check" aria-hidden="true" />
              &nbsp;&nbsp;Got it
            </span>
          ),
          callback() {
            if (needCallback) {
              const params = { ids: [] };
              params.ids[0] = n.id;
              MessagesFetcher.acknowledgedMessage(params);
            }
          },
        },
      };
      NotificationActions.add(notification);

      const { currentPage, itemsPerPage } = InboxStore.getState();

      switch (n.content.action) {
        case 'CollectionActions.fetchRemoteCollectionRoots':
          CollectionActions.fetchRemoteCollectionRoots();
          break;
        case 'CollectionActions.fetchSyncInCollectionRoots':
          CollectionActions.fetchSyncInCollectionRoots();
          break;
        case 'Repository_ReviewRequest':
        case 'Repository_Published':
          // CollectionActions.fetchSyncInCollectionRoots();
          break;
        case 'Submission':
          CollectionActions.fetchSyncInCollectionRoots();
          break;
        case 'InboxActions.fetchInbox':
          InboxActions.fetchInbox({ currentPage, itemsPerPage });
          break;
        case 'ReportActions.updateProcessQueue':
          ReportActions.updateProcessQueue([parseInt(n.content.report_id, 10)]);
          break;
        case 'ElementActions.refreshComputedProp':
          ElementActions.refreshComputedProp(n.content.cprop);
          break;
        case 'RefreshChemotionCollection':
          CollectionActions.fetchUnsharedCollectionRoots();
          break;
        case 'CollectionActions.fetchUnsharedCollectionRoots':
          CollectionActions.fetchUnsharedCollectionRoots();
          CollectionActions.fetchSyncInCollectionRoots();
          break;
        case 'ElementActions.fetchResearchPlanById':
          ElementActions.fetchResearchPlanById(
            parseInt(n.content.research_plan_id, 10)
          );
          break;
        case 'CalendarActions.navigateToElement':
          CalendarActions.navigateToElement(
            n.content.eventable_type,
            n.content.eventable_id
          );
          break;
        default:
        //
      }
    }
  });
};

const createUpgradeNotification = (serverVersion, localVersion) => {
  const content = [
    'Dear ELNer,',
    'A new version has been released. Please reload this page to enjoy the latest updates.',
    'Thank you and have a nice day  :)',
    '--------------------------',
    `Your version: ${localVersion}`,
    `Current version: ${serverVersion}`,
    '--------------------------',
  ].join('\n');
  const contentJson = { data: content };
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  const infoTimeString = new Date().toLocaleDateString('de-DE', options);
  const not = {
    id: -1,
    sender_name: 'System Administrator',
    updated_at: infoTimeString,
    content: contentJson,
  };
  handleNotification([not], 'add', false);
};

export default class NoticeButton extends React.Component {
  static contextType = StoreContext;
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      dbNotices: [],
      messageEnable: true,
      messageAutoInterval: 6000,
      lastActivityTime: new Date(),
      idleTimeout: 12,
      serverVersion: '',
      localVersion: '',
    };
    this.envConfiguration = this.envConfiguration.bind(this);
    this.handleShow = this.handleShow.bind(this);
    this.handleHide = this.handleHide.bind(this);
    this.messageAck = this.messageAck.bind(this);
    this.detectActivity = this.detectActivity.bind(this);
  }

  componentDidMount() {
    this.envConfiguration();
    this.startActivityDetection();
  }

  shouldComponentUpdate(nextProps, nextState) {
    const nots = this.state.dbNotices;
    const nextNots = nextState.dbNotices;

    const notIds = _.map(nots, 'id');
    const nextNotIds = _.map(nextNots, 'id');
    const newMessages = _.filter(nextNots, (o) => !_.includes(notIds, o.id));
    const remMessages = _.filter(nots, (o) => !_.includes(nextNotIds, o.id));

    if (Object.keys(newMessages).length > 0) {
      handleNotification(newMessages, 'add');
    }
    if (Object.keys(remMessages).length > 0) {
      handleNotification(remMessages, 'rem');
    }
    if (
      nextState.serverVersion
      && nextState.localVersion
      && nextState.serverVersion !== this.state.serverVersion
      && nextState.serverVersion !== nextState.localVersion
    ) {
      const serverVer = nextState.serverVersion.substring(
        nextState.serverVersion.indexOf('-') + 1,
        nextState.serverVersion.indexOf('.js')
      );
      const localVer = nextState.localVersion.substring(
        nextState.localVersion.indexOf('-') + 1,
        nextState.localVersion.indexOf('.js')
      );
      if (serverVer !== localVer) {
        // createUpgradeNotification(serverVer, localVer);
      }
    }

    return true;
  }

  componentWillUnmount() {
    this.stopActivityDetection();
  }

  handleShow() {
    MessagesFetcher.fetchMessages(0).then((result) => {
      if (result?.messages?.length > 0) {
        result.messages.sort((a, b) => a.id - b.id);
        this.setState({ showModal: true, dbNotices: result.messages });
      }
    });
  }

  handleHide() {
    this.setState({ showModal: false });
  }

  startActivityDetection() {
    const { messageEnable } = this.state;
    if (messageEnable === true) {
      this.interval = setInterval(this.messageFetch.bind(this), this.state.messageAutoInterval);
      document.addEventListener('mousemove', this.detectActivity);
      document.addEventListener('click', this.detectActivity);
    }
  }

  stopActivityDetection() {
    const { messageEnable } = this.state;
    if (messageEnable === true) {
      document.removeEventListener('mousemove', this.detectActivity, false);
      document.removeEventListener('click', this.detectActivity, false);
      clearInterval(this.interval);
    }
  }

  envConfiguration() {
    // use 'application' (not 'application-') as keyword because there is a
    // difference between production and development environment
    const documentIndex = 'application';
    const applicationTag = _.filter(
      document.scripts,
      (s) => s.src.indexOf(documentIndex) > -1
    );
    const applicationTagValue = applicationTag[0].src.substr(
      applicationTag[0].src.indexOf(documentIndex)
    );
    MessagesFetcher.configuration().then((result) => {
      this.setState({
        messageEnable: result.messageEnable === 'true',
        messageAutoInterval: result.messageAutoInterval,
        idleTimeout: result.idleTimeout,
        localVersion: applicationTagValue,
      });
      const { messageEnable, messageAutoInterval } = this.state;

      if (messageEnable === true) {
        this.interval = setInterval(
          () => this.messageFetch(),
          messageAutoInterval
        );
        document.addEventListener('mousemove', this.detectActivity);
        document.addEventListener('click', this.detectActivity);
      } else {
        this.messageFetch();
      }
    });
  }

  detectActivity() {
    this.setState({ lastActivityTime: new Date() });
  }

  messageAck(idx, ackAll) {
    let { dbNotices } = this.state;
    const params = {
      ids: [],
    };
    if (ackAll) {
      params.ids = _.map(dbNotices, 'id');
    } else {
      params.ids[0] = idx;
    }
    MessagesFetcher.acknowledgedMessage(params).then((result) => {
      const ackIds = _.map(result.ack, 'id');
      dbNotices = _.filter(
        this.state.dbNotices,
        (o) => !_.includes(ackIds, o.id)
      );
      dbNotices.sort((a, b) => a.id - b.id);
      this.setState({
        dbNotices,
      });
    });
  }

  messageFetch() {
    const { lastActivityTime, idleTimeout } = this.state;
    const clientLastActivityTime = new Date(lastActivityTime).getTime();
    const currentTime = new Date().getTime();
    const remainTime = Math.floor(
      (currentTime - clientLastActivityTime) / 1000
    );
    if (remainTime < idleTimeout) {
      MessagesFetcher.fetchMessages(0).then((result) => {
        if (result?.messages?.length > 0) {
          result.messages?.forEach((message) => {
            if (message.subject === 'Send TPA attachment arrival notification')
              this.context.attachmentNotificationStore.addMessage(message);
          });
          result.messages.sort((a, b) => a.id - b.id);
          this.setState({
            dbNotices: result.messages,
            serverVersion: result.version,
          });
        }
      });
    }
  }

  renderBody() {
    const { dbNotices } = this.state;

    let bMessages = (
      <Panel
        id="panel-modal-body-allread"
        key="panel-modal-body-allread"
        eventKey="0"
        collapsible="true"
        defaultExpanded
        style={{ border: '0px' }}
      >
        <Table>
          <tbody>
            <tr>
              <td
                style={{ border: '0px', width: '100vw', textAlign: 'center' }}
              >
                No new notifications.
              </td>
            </tr>
          </tbody>
        </Table>
      </Panel>
    );

    if (dbNotices?.length > 0) {
      bMessages = dbNotices.map((not, index) => {
        const infoTimeString = formatDate(not.created_at);

        const newText = not.content.data
          .split('\n')
          .map((i) => <p key={`${infoTimeString}-${i}`}>{i}</p>);

        const { url, urlTitle } = not.content;
        if (url) {
          newText.push(
            <p key={`${infoTimeString}-${url}`}>{changeUrl(url, urlTitle)}</p>
          );
        }

        return (
          <Panel
            key={`panel-modal-body-${not.id}`}
            eventKey={index}
            collapsible="true"
            defaultExpanded
            ref={(pl) => {
              this[`myPl${index}`] = pl;
            }}
          >
            <Panel.Heading>
              <i className="fa fa-commenting-o" aria-hidden="true" />
              &nbsp;
              {not.subject}
              &nbsp;&nbsp;
              <span>
                <strong>From: </strong>
                {not.sender_name}
              </span>
              &nbsp;&nbsp;
              <span>
                <strong>Created On: </strong>
                {formatDate(not.created_at)}
              </span>
            </Panel.Heading>
            <Panel.Body>
              <Table>
                <tbody>
                  <tr>
                    <td width="10%">
                      <Button
                        id={`notice-button-ack-${not.id}`}
                        key={`notice-button-ack-${not.id}`}
                        onClick={() => this.messageAck(not.id, false)}
                      >
                        <i className="fa fa-check" aria-hidden="true" />
                        &nbsp;Got it
                      </Button>
                    </td>
                    <td width="90%">{newText}</td>
                  </tr>
                </tbody>
              </Table>
            </Panel.Body>
          </Panel>
        );
      });
    }

    return <PanelGroup id="panel-group-modal-body">{bMessages}</PanelGroup>;
  }

  renderModal() {
    if (this.state.showModal) {
      return (
        <Modal
          show={this.state.showModal}
          onHide={this.handleHide}
          dialogClassName="noticeModal"
        >
          <Modal.Header closeButton>
            <Modal.Title>Unread Notifications</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            {this.renderBody()}
          </Modal.Body>
          <Modal.Footer>
            <Button
              id="notice-button-ack-all"
              key="notice-button-ack-all"
              onClick={() => this.messageAck(0, true)}
            >
              <i className="fa fa-check" aria-hidden="true" />
              &nbsp;Mark all notifications as read
            </Button>
          </Modal.Footer>
        </Modal>
      );
    }
    return <div />;
  }

  render() {
    const noticeNum = (this.state.dbNotices || []).length;
    let btnStyle = 'default';
    let btnClass = 'fa fa-bell-o fa-lg';

    if (noticeNum > 0) {
      btnStyle = 'warning';
      btnClass = 'fa fa-bell fa-lg';
    }

    return (
      <div style={{ position: 'relative', marginLeft: '-10px' }}>
        <Button
          id="notice-button"
          bsStyle={btnStyle}
          onClick={this.handleShow}
          style={{
            height: '34px',
            width: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '.04px',
          }}
        >
          <i
            className={btnClass}
            style={{
              left: '20px'
            }}
          />
          {noticeNum > 0 && (
            <span
              className="badge badge-pill"
              style={{
                top: '25px',
                left: '25px',
                fontSize: '8px',
                position: 'absolute'
              }}
            >
              {noticeNum}
            </span>
          )}
        </Button>
        {this.renderModal()}
      </div>
    );
  }
}
