/* eslint-disable react/forbid-prop-types */

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  OverlayTrigger,
  Tooltip,
  FormControl,
} from 'react-bootstrap';
import NotificationSystem from 'react-notification-system';
import RepositoryFetcher from '../../fetchers/RepositoryFetcher';
import MAGrid from './MAGrid';

export const CompoundList = (xvialCom, data = '', selectXvial) => {
  if (typeof xvialCom === 'undefined' || !xvialCom.allowed) return <br />;
  if (!xvialCom.hasData) return <div>No Data found in Compound platform.</div>;
  return (
    <div>
      <h4>
        <i>Reference (data from Compound platform)</i>
      </h4>
      <MAGrid xvialCompounds={xvialCom} data={data} fnSelect={selectXvial} />
    </div>
  );
};

export const MARequestModal = (props) => {
  const { allowRequest, elementId, isLogin, data } = props;
  const [requestModalShow, setRequestModalShow] = useState(false);
  const [rInput, setRInput] = useState(null);
  const notificationSystem = useRef(null);
  const hasData = !!(data && data !== '');

  if (!(allowRequest && hasData)) return null;

  const checkRequest = () => {
    if (isLogin) {
      setRequestModalShow(true);
    } else {
      const notification = notificationSystem.current;
      notification.addNotification({
        title: 'Request to the Compound-Platform.eu',
        message: 'Please log in to send the request.',
        level: 'warning',
        position: 'tc',
      });
    }
  };

  const request = () => {
    RepositoryFetcher.compound(elementId, { xid: rInput.value }, 'request').then(() => {
      setRequestModalShow(false);
      const notification = notificationSystem.current;
      notification.addNotification({
        title: 'Request to the Compound-Platform.eu',
        message: 'Your request has been emailed to the Compound-Platform.',
        level: 'info',
        position: 'tc',
      });
    });
  };

  return (
    <>
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="tt_request_xvial">Request compound</Tooltip>}
      >
        <a onClick={() => checkRequest()} rel="noopener noreferrer">
          <i className="fa fa-envelope-o" />
        </a>
      </OverlayTrigger>
      <Modal
        show={requestModalShow}
        onHide={() => setRequestModalShow(false)}
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
              setRInput(m);
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
          <Button bsStyle="warning" onClick={() => setRequestModalShow(false)}>
            Close
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={() => request()}>
            Send request to the Compound-Platform
          </Button>
        </Modal.Body>
      </Modal>
      <NotificationSystem ref={notificationSystem} />
    </>
  );
};

MARequestModal.propTypes = {
  allowRequest: PropTypes.bool,
  data: PropTypes.string,
  elementId: PropTypes.number.isRequired,
  isLogin: PropTypes.bool,
};

MARequestModal.defaultProps = {
  allowRequest: false,
  data: null,
  isLogin: false,
};

export const MADataModal = (props) => {
  const { data, elementId, isEditable, saveCallback, xvialCom } = props;
  const [dataModalShow, setDataModalShow] = useState(false);
  const [newData, setNewData] = useState(data);
  const [newComp, setNewComp] = useState(null);

  if (!isEditable) return null;

  useEffect(() => {
    setNewData(data);
  }, [dataModalShow, data]);

  const selectXvial = (xid, xcomp) => {
    setNewData(xid);
    setNewComp(xcomp);
  };

  const save = () => {
    RepositoryFetcher.compound(elementId, { xid: newData, xcomp: newComp }, 'update').then(() => {
      setDataModalShow(false);
      saveCallback(elementId, newData);
    });
  };

  const remove = () => {
    RepositoryFetcher.compound(elementId, {}, 'update').then(() => {
      setDataModalShow(false);
      saveCallback(elementId, '');
    });
  };

  return (
    <>
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="tt_xvial">Click to input Compound X-Vial number</Tooltip>
        }
      >
        <a onClick={() => setDataModalShow(true)} rel="noopener noreferrer">
          <i className="fa fa-pencil" />
        </a>
      </OverlayTrigger>
      <Modal
        bsSize="large"
        show={dataModalShow}
        onHide={() => setDataModalShow(false)}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Compound X-Vial number</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormControl type="text" defaultValue={newData} readOnly />
          {CompoundList(xvialCom, newData, selectXvial)}
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
          <Button bsStyle="warning" onClick={() => setDataModalShow(false)}>
            Cancel
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={() => save()}>
            Save
          </Button>
          &nbsp;
          <Button bsStyle="danger" onClick={() => remove()}>
            Remove X-Vial
          </Button>
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

MADataModal.defaultProps = { data: null, saveCallback: () => { } };
