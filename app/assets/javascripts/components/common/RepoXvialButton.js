import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, Tooltip, FormControl } from 'react-bootstrap';
import RepositoryFetcher from '../fetchers/RepositoryFetcher';
import NotificationActions from '../actions/NotificationActions';

const registedCompoundTooltip = (
  <div className="repo-xvial-info">
    For availability please contact the Compound Platform team (<span className="env"><i className="fa fa-envelope-o" aria-hidden="true" /></span>). An explanation can be accessed via our Youtube channel&nbsp;
    <a rel="noopener noreferrer" target="_blank" href="https://www.youtube.com/channel/UCWBwk4ZSXwmDzFo_ZieBcAw?"><i className="fa fa-youtube-play youtube" /></a>&nbsp;
      or on our how-to pages
    <a rel="noopener noreferrer" target="_blank" href="https://www.chemotion-repository.net/home/howto/cf3ede44-b09a-400a-b0d4-b067735e4262"><img alt="chemotion_first" src="/favicon.ico" className="pubchem-logo" /></a>
  </div>
);

export default class RepoXvialButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dataModalShow: false,
      requestModalShow: false
    };
    this.save = this.save.bind(this);
    this.request = this.request.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.checkRequest = this.checkRequest.bind(this);
  }

  checkRequest() {
    if (this.props.isLogin) {
      this.setState({ requestModalShow: true });
    } else {
      NotificationActions.add({
        title: 'Request to the Compound-Platform.eu',
        message: 'Please log in to send the request.',
        level: 'warning',
        position: 'tc'
      });
    }
  }

  save() {
    const { elementId, saveCallback } = this.props;
    RepositoryFetcher.compound(elementId, this.xInput.value, 'update')
      .then(() => {
        this.closeModal();
        saveCallback(elementId, this.xInput.value);
      });
  }

  request() {
    const { elementId } = this.props;
    RepositoryFetcher.compound(elementId, this.rInput.value, 'request')
      .then(() => {
        this.closeModal();
        NotificationActions.add({
          title: 'Request to the Compound-Platform.eu',
          message: 'Your request has been emailed to the Compound-Platform',
          level: 'info',
          position: 'tc'
        });
      });
  }

  closeModal() {
    this.setState({ dataModalShow: false, requestModalShow: false });
  }

  render() {
    const { dataModalShow, requestModalShow } = this.state;
    const {
      isEditable, isLogin, data, allowRequest
    } = this.props;
    const hasData = !!(data && data !== '');
    const compoundLink = hasData ? (
      <OverlayTrigger placement="top" overlay={<Tooltip id="tt_xvial">Go to Compound platform</Tooltip>}>
        <Button bsStyle="link" bsSize="xsmall" onClick={() => { window.open('https://compound-platform.eu/home', '_blank'); }}>X-Vial: Sample available</Button>
      </OverlayTrigger>
    ) : null;
    const dataModal = (
      <Modal show={dataModalShow} onHide={() => this.closeModal()} backdrop="static">
        <Modal.Header closeButton><Modal.Title>Compound X-vial number</Modal.Title></Modal.Header>
        <Modal.Body>
          <FormControl type="text" defaultValue={data} inputRef={(m) => { this.xInput = m; }} />
          <br />
          <Button bsStyle="warning" onClick={() => this.closeModal()}>Close</Button>&nbsp;
          <Button bsStyle="primary" onClick={() => this.save()}>Save</Button>
        </Modal.Body>
      </Modal>
    );
    const requestModal = (
      <Modal show={requestModalShow} onHide={() => this.closeModal()} backdrop="static">
        <Modal.Header closeButton><Modal.Title>Request compound</Modal.Title></Modal.Header>
        <Modal.Body>
          <FormControl style={{ height: '400px' }} componentClass="textarea" inputRef={(m) => { this.rInput = m; }} />
          <br />
          <Button bsStyle="warning" onClick={() => this.closeModal()}>Close</Button>&nbsp;
          <Button bsStyle="primary" onClick={() => this.request()}>Send request to the Compound-Platform</Button>
        </Modal.Body>
      </Modal>
    );
    const editLink = isEditable ? (
      <OverlayTrigger placement="top" overlay={<Tooltip id="tt_xvial">Click to input Compound X-vial number</Tooltip>}>
        <a onClick={() => this.setState({ dataModalShow: true })} rel="noopener noreferrer"><i className="fa fa-pencil" /></a>
      </OverlayTrigger>
    ) : null;
    const requestLink = allowRequest && hasData ? (
      <OverlayTrigger placement="top" overlay={<Tooltip id="tt_request_xvial">Request compound</Tooltip>}>
        <a onClick={() => this.checkRequest()} rel="noopener noreferrer"><i className="fa fa-envelope-o" /></a>
      </OverlayTrigger>
    ) : null;
    const info = requestLink ? (
      <OverlayTrigger trigger="click" rootClose placement="top" overlay={<Tooltip id="registed_compound_tooltip">{registedCompoundTooltip}</Tooltip>}>
        <a rel="noopener noreferrer"><i className="fa fa-info-circle" aria-hidden="true" /></a>
      </OverlayTrigger>
    ) : null;
    if (!isLogin) {
      if (compoundLink) {
        return (
          <span className="xvial-pub-elem">
            <span><i className="icon-xvial" aria-hidden="true" />{compoundLink}{requestLink}{info}</span>
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
  saveCallback: PropTypes.func
};

RepoXvialButton.defaultProps = {
  isEditable: false,
  isLogin: false,
  allowRequest: false,
  data: null,
  saveCallback: () => {}
};
