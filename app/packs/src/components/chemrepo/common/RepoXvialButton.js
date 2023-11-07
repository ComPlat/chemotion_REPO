import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  OverlayTrigger,
  Tooltip,
  FormControl,
} from 'react-bootstrap';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import { CompoundList } from 'src/components/chemrepo/ma/MAModals';

const registedCompoundTooltip = (
  <div className="repo-xvial-info">
    For availability please contact the Compound Platform team (
    <span className="env">
      <i className="fa fa-envelope-o" aria-hidden="true" />
    </span>
    ). An explanation can be accessed via our Youtube channel&nbsp;
    <a
      rel="noopener noreferrer"
      target="_blank"
      href="https://www.youtube.com/channel/UCWBwk4ZSXwmDzFo_ZieBcAw?"
    >
      <i className="fa fa-youtube-play youtube" />
    </a>
    &nbsp;or on our how-to pages
    <a
      rel="noopener noreferrer"
      target="_blank"
      href="https://www.chemotion-repository.net/home/howto/cf3ede44-b09a-400a-b0d4-b067735e4262"
    >
      <img alt="chemotion_first" src="/favicon.ico" className="pubchem-logo" />
    </a>
  </div>
);

export default class RepoXvialButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dataModalShow: false,
      requestModalShow: false,
      newData: props.data,
      newComp: null,
    };
    this.save = this.save.bind(this);
    this.remove = this.remove.bind(this);
    this.request = this.request.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.checkRequest = this.checkRequest.bind(this);
    this.selectXvial = this.selectXvial.bind(this);
    this.setNewData = this.setNewData.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.data !== prevProps.data) {
      this.setNewData(this.props.data);
    }
  }

  setNewData(newData, newComp = null) {
    this.setState({ newData, newComp });
  }

  selectXvial(xid, xcomp) {
    this.setNewData(xid, xcomp);
  }

  checkRequest() {
    if (this.props.isLogin) {
      this.setState({ requestModalShow: true });
    } else {
      NotificationActions.add({
        title: 'Request to the Compound-Platform.eu',
        message: 'Please log in to send the request.',
        level: 'warning',
        position: 'tc',
      });
    }
  }

  save() {
    const { newData, newComp } = this.state;
    const { elementId, saveCallback } = this.props;
    RepositoryFetcher.compound(elementId, { xid: newData, xcomp: newComp }, 'update').then(() => {
      this.closeModal();
      saveCallback(elementId, newData);
    });
  }

  remove() {
    const { elementId, saveCallback } = this.props;
    RepositoryFetcher.compound(elementId, {}, 'update').then(() => {
      this.closeModal();
      saveCallback(elementId, '');
    });
  }

  request() {
    const { elementId } = this.props;
    RepositoryFetcher.compound(elementId, { xid: this.rInput.value }, 'request').then(
      () => {
        this.closeModal();
        NotificationActions.add({
          title: 'Request to the Compound-Platform.eu',
          message: 'Your request has been emailed to the Compound-Platform',
          level: 'info',
          position: 'tc',
        });
      }
    );
  }

  closeModal() {
    this.setState({
      dataModalShow: false,
      requestModalShow: false,
      newData: this.props.data,
      newComp: null,
    });
  }

  render() {
    const { dataModalShow, requestModalShow, newData } = this.state;
    const { isEditable, isLogin, data, allowRequest, xvialCom } = this.props;
    const hasData = !!(data && data !== '');
    const compoundLink = hasData ? (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="tt_xvial">Go to Compound platform</Tooltip>}
      >
        <Button
          bsStyle="link"
          bsSize="xsmall"
          onClick={() => {
            window.open('https://compound-platform.eu/home', '_blank');
          }}
        >
          X-Vial: Sample available
        </Button>
      </OverlayTrigger>
    ) : null;
    const dataModal = (
      <Modal
        bsSize="large"
        show={dataModalShow}
        onHide={() => this.closeModal()}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Compound X-vial number</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormControl type="text" value={newData} readOnly />
          {CompoundList(xvialCom, newData, this.selectXvial)}
          <div>
            <i className="fa fa-info-circle" aria-hidden="true" />
            &nbsp; The currently stored data:{' '}
            <span style={{ background: '#d1e7dd', color: '#0f5132' }}>
              highlighted with a color
            </span>
            .
          </div>
          <div>
            <i className="fa fa-info-circle" aria-hidden="true" />
            &nbsp; Click on a row to select the X-Vial. Remember to press the
            &#39;Save&#39; button if you wish to save the selection.
          </div>
          <Button bsStyle="warning" onClick={() => this.closeModal()}>
            Cancel
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={() => this.save()}>
            Save
          </Button>
          &nbsp;
          <Button bsStyle="danger" onClick={() => this.remove()}>
            Remove X-Vial
          </Button>
        </Modal.Body>
      </Modal>
    );
    const requestModal = (
      <Modal
        show={requestModalShow}
        onHide={() => this.closeModal()}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Request compound</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormControl
            style={{ height: '300px' }}
            componentClass="textarea"
            inputRef={(m) => {
              this.rInput = m;
            }}
            placeholder="Example: I would like to request the access to a certain amount of this sample for this reason: (please give reason). Please contact me per email."
          />
          <br />
          <p style={{ fontSize: '12px', fontStyle: 'italic' }}>
            <b>Data privacy statement</b> This contact form can be used to get
            in contact to the team of the molecule archive. The information that
            you enter into the form is sent - along with the email address and
            your name that you entered with the registration to chemotion
            repository - to the management team of the compound platform only.
            The data is not stored, the information is available per email only.
            People in the management team handle your request as confidential
            information. No other services or third parties are included.
          </p>
          <Button bsStyle="warning" onClick={() => this.closeModal()}>
            Close
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={() => this.request()}>
            Send request to the Compound-Platform
          </Button>
        </Modal.Body>
      </Modal>
    );
    const editLink = isEditable ? (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="tt_xvial">Click to input Compound X-vial number</Tooltip>
        }
      >
        <a
          onClick={() => this.setState({ dataModalShow: true })}
          rel="noopener noreferrer"
        >
          <i className="fa fa-pencil" />
        </a>
      </OverlayTrigger>
    ) : null;
    const requestLink =
      allowRequest && hasData ? (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tt_request_xvial">Request compound</Tooltip>}
        >
          <a onClick={() => this.checkRequest()} rel="noopener noreferrer">
            <i className="fa fa-envelope-o" />
          </a>
        </OverlayTrigger>
      ) : null;
    const info = requestLink ? (
      <OverlayTrigger
        trigger="click"
        rootClose
        placement="top"
        overlay={
          <Tooltip
            id="registed_compound_tooltip"
            className="left_tooltip bs_tooltip"
          >
            {registedCompoundTooltip}
          </Tooltip>
        }
      >
        <a rel="noopener noreferrer">
          <i className="fa fa-info-circle" aria-hidden="true" />
        </a>
      </OverlayTrigger>
    ) : null;
    if (!isLogin) {
      if (compoundLink) {
        return (
          <span className="xvial-pub-elem">
            <span>
              <i className="icon-xvial" aria-hidden="true" />
              {compoundLink}
              {requestLink}
              {info}
            </span>
          </span>
        );
      }
      return null;
    }
    if (compoundLink) {
      return (
        <span className="xvial-pub-elem">
          <span>
            <i className="icon-xvial" aria-hidden="true" />
            {compoundLink}
            {editLink}
            {requestLink}
            {info}
          </span>
          {dataModal}
          {requestModal}
        </span>
      );
    }
    if (editLink) {
      return (
        <span className="xvial-pub-elem">
          <span>
            <i className="icon-xvial" aria-hidden="true" />
            {editLink}
          </span>
          {dataModal}
        </span>
      );
    }
    return null;
  }
}

RepoXvialButton.propTypes = {
  elementId: PropTypes.number.isRequired,
  isEditable: PropTypes.bool,
  isLogin: PropTypes.bool,
  allowRequest: PropTypes.bool,
  data: PropTypes.string,
  saveCallback: PropTypes.func,
};

RepoXvialButton.defaultProps = {
  isEditable: false,
  isLogin: false,
  allowRequest: false,
  data: null,
  saveCallback: () => { },
};
