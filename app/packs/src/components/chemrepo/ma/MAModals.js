/* eslint-disable react/forbid-prop-types */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, Tooltip, FormControl, Table } from 'react-bootstrap';
import uuid from 'uuid';
import NotificationActions from '../../actions/NotificationActions';
import RepositoryFetcher from '../../fetchers/RepositoryFetcher';

export const listCom = (xvialCom, data = '') => {
  if (typeof xvialCom === 'undefined') return <br />;
  if (!xvialCom.allowed) return <br />;
  const listComData = xvialCom.hasData ? (
    xvialCom.data.map(x => (
      <tr key={uuid.v4()} style={x.x_data.xid === data && data !== '' ? { color: '#337ab7' } : { color: 'black' }}>
        <td>{x.x_data.xid}</td>
        <td>{x.x_data.provided_by}</td>
        <td>{x.x_created_at}</td>
        <td>{x.x_short_label}</td>
        <td>{x.x_data.origin_id}</td>
      </tr>
    ))
  ) : (<tr><td colSpan="5">No Data found in Compound platform.</td></tr>);
  return (
    <div>
      <h4><i>Reference (data from Compound platform)</i></h4>
      <Table striped bordered condensed hover>
        <thead>
          <tr>
            <th>X-Vial</th>
            <th>Provided by</th>
            <th>Created at</th>
            <th>Short label of Sample</th>
            <th>Name of origin Sample</th>
          </tr>
        </thead>
        <tbody>
          {listComData}
        </tbody>
      </Table>
    </div>
  );
};

export const MARequestModal = (props) => {
  const {
    allowRequest, elementId, isLogin, data
  } = props;
  const [requestModalShow, setRequestModalShow] = useState(false);
  const [rInput, setRInput] = useState(null);
  const hasData = !!(data && data !== '');

  if (!(allowRequest && hasData)) return null;

  const checkRequest = () => {
    if (isLogin) {
      setRequestModalShow(true);
    } else {
      NotificationActions.add({
        title: 'Request to the Compound-Platform.eu',
        message: 'Please log in to send the request.',
        level: 'warning',
        position: 'tc'
      });
    }
  };

  const request = () => {
    RepositoryFetcher.compound(elementId, rInput.value, 'request')
      .then(() => {
        setRequestModalShow(false);
        NotificationActions.add({
          title: 'Request to the Compound-Platform.eu',
          message: 'Your request has been emailed to the Compound-Platform',
          level: 'info',
          position: 'tc'
        });
      });
  };

  return (
    <>
      <OverlayTrigger placement="top" overlay={<Tooltip id="tt_request_xvial">Request compound</Tooltip>}>
        <a onClick={() => checkRequest()} rel="noopener noreferrer"><i className="fa fa-envelope-o" /></a>
      </OverlayTrigger>
      <Modal show={requestModalShow} onHide={() => setRequestModalShow(false)} backdrop="static">
        <Modal.Header closeButton><Modal.Title>Request compound</Modal.Title></Modal.Header>
        <Modal.Body>
          <FormControl style={{ height: '300px' }} componentClass="textarea" inputRef={(m) => { setRInput(m); }} placeholder="Example: I would like to request the access to a certain amount of this sample for this reason: (please give reason). Please contact me per email." />
          <br />
          <p style={{ fontSize: '12px', fontStyle: 'italic' }}>
            <b>Data privacy statement</b> This contact form can be used to get in contact to the team of
            the molecule archive. The information that you enter into the form is sent - along
            with the email address and your name that you entered with the registration to chemotion
            repository - to the management team of the compound platform only. The data is not
            stored, the information is available per email only. People in the management team
            handle your request as confidential information. No other services or third
            parties are included.
          </p>
          <Button bsStyle="warning" onClick={() => setRequestModalShow(false)}>Close</Button>&nbsp;
          <Button bsStyle="primary" onClick={() => request()}>Send request to the Compound-Platform</Button>
        </Modal.Body>
      </Modal>
    </>
  );
};


MARequestModal.propTypes = {
  allowRequest: PropTypes.bool,
  data: PropTypes.string,
  elementId: PropTypes.number.isRequired,
  isLogin: PropTypes.bool,
};

MARequestModal.defaultProps = { allowRequest: false, data: null, isLogin: false };

export const MADataModal = (props) => {
  const {
    data, elementId, isEditable, saveCallback, xvialCom
  } = props;
  const [dataModalShow, setDataModalShow] = useState(false);
  const [xInput, setXInput] = useState(data || '');

  if (!isEditable) return null;

  const save = () => {
    RepositoryFetcher.compound(elementId, xInput.value, 'update')
      .then(() => {
        setDataModalShow(false);
        saveCallback(elementId, xInput.value);
      });
  };

  return (
    <>
      <OverlayTrigger placement="top" overlay={<Tooltip id="tt_xvial">Click to input Compound X-vial number</Tooltip>}>
        <a onClick={() => setDataModalShow(true)} rel="noopener noreferrer"><i className="fa fa-pencil" /></a>
      </OverlayTrigger>
      <Modal bsSize="large" show={dataModalShow} onHide={() => setDataModalShow(false)} backdrop="static">
        <Modal.Header closeButton><Modal.Title>Compound X-vial number</Modal.Title></Modal.Header>
        <Modal.Body>
          <FormControl type="text" defaultValue={data} inputRef={(m) => { setXInput(m); }} />
          {listCom(xvialCom, data)}
          <Button bsStyle="warning" onClick={() => setDataModalShow(false)}>Close</Button>&nbsp;
          <Button bsStyle="primary" onClick={() => save()}>Save</Button>
        </Modal.Body>
      </Modal>
    </>
  );
};

MADataModal.propTypes = {
  data: PropTypes.string,
  elementId: PropTypes.number.isRequired,
  isEditable: PropTypes.bool.isRequired,
  saveCallback: PropTypes.func,
  xvialCom: PropTypes.object.isRequired,
};

MADataModal.defaultProps = { data: null, saveCallback: () => {} };
