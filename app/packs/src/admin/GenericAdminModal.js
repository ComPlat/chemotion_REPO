/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';
import AdminFetcher from '../components/fetchers/AdminFetcher';

export default class GenericAdminModal extends Component {
  constructor(props) {
    super(props);
    this.handleAuthAdmin = this.handleAuthAdmin.bind(this);
  }

  handleAuthAdmin(user, type, value) {
    const { fnCb } = this.props;
    const params = {
      user_id: user.id,
      auth_generic_admin: { }
    };
    params.auth_generic_admin[type] = !value;
    AdminFetcher.updateAccount(params)
      .then(() => fnCb(user));
  }

  render() {
    const { user, fnShowModal } = this.props;
    const { elements, segments, datasets } = (user.generic_admin || {});
    return (
      <Modal show onHide={() => fnShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{`Grant/Revoke Generic Admin (user: ${user.name})`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Button bsSize="sm" bsStyle={elements ? 'warning' : 'default'} onClick={() => this.handleAuthAdmin(user, 'elements', elements)}>{elements ? 'Revoke' : 'Grant'} Generic Elements</Button>&nbsp;
          <Button bsSize="sm" bsStyle={segments ? 'warning' : 'default'} onClick={() => this.handleAuthAdmin(user, 'segments', segments)}>{segments ? 'Revoke' : 'Grant'} Generic Segments</Button>&nbsp;
          <Button bsSize="sm" bsStyle={datasets ? 'warning' : 'default'} onClick={() => this.handleAuthAdmin(user, 'datasets', datasets)}>{datasets ? 'Revoke' : 'Grant'} Generic Datasets</Button>
          <ul>
            <li>Currently {elements ? '' : 'NOT'} acting as the administrator of the Generc Elements</li>
            <li>Currently {segments ? '' : 'NOT'} acting as the administrator of the Generc Segments</li>
            <li>Currently {datasets ? '' : 'NOT'} acting as the administrator of the Generc Datasets</li>
          </ul>
        </Modal.Body>
      </Modal>
    );
  }
}

GenericAdminModal.propTypes = {
  user: PropTypes.object.isRequired, fnShowModal: PropTypes.func.isRequired, fnCb: PropTypes.func
};
GenericAdminModal.defaultProps = { fnCb: () => {} };
