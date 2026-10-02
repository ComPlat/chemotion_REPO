/* eslint-disable react/destructuring-assignment */
/* eslint-disable max-classes-per-file */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Badge, Button, Form, ButtonToolbar, Row, Col
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import { AgGridReact } from 'ag-grid-react';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import { colorOptions } from 'src/components/staticDropdownOptions/options';
import ColorLabel from 'src/components/common/ColorLabel';

/* eslint-disable camelcase */
const UserLabel = ({ title, color, access_level }) => (
  <Badge
    bg="null"
    style={{
      backgroundColor: color,
      borderRadius: access_level === 2 ? '0.25em' : '10px',
    }}
  >
    {title}
  </Badge>
);

UserLabel.propTypes = {
  title: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  access_level: PropTypes.number.isRequired,
};

class UserLabelModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      labels: [],
      label: {},
      showDetails: false,
      defaultColor: '#428BCA',
      currentUser: {},
    };
    this.onChange = this.onChange.bind(this);
    this.handelNewLabel = this.handelNewLabel.bind(this);
    this.handleSaveLabel = this.handleSaveLabel.bind(this);
    this.handleBackButton = this.handleBackButton.bind(this);
    this.handleAccessChange = this.handleAccessChange.bind(this);
    this.handleColorPicker = this.handleColorPicker.bind(this);
    this.handleEditLabelClick = this.handleEditLabelClick.bind(this);
    this.handleDeleteLabel = this.handleDeleteLabel.bind(this);
    this.renderActions = this.renderActions.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
    UserActions.fetchUserLabels();
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  handleEditLabelClick(e, label) {
    this.setState({ showDetails: true, label });
  }

  handleColorPicker(option) {
    const { label } = this.state;
    const hex = option?.value || null;
    this.setState({
      label: { ...label, color: hex },
    });
  }

  handleAccessChange({ value }) {
    const { label } = this.state;
    this.setState({
      label: { ...label, access_level: value },
    });
  }

  handleBackButton() {
    this.setState({
      showDetails: false
    });
  }

  handleSaveLabel() {
    const { label } = this.state;
    if (typeof (this.titleInput) !== 'undefined' && this.titleInput) {
      label.title = this.titleInput.value;
    }
    if (typeof (this.descInput) !== 'undefined' && this.descInput) {
      label.description = this.descInput.value;
    }
    if (
      label.title != null
      && label.title.trim().length !== 0
      && label.color != null
      && label.color.trim().length !== 0
    ) {
      UsersFetcher.updateUserLabel({
        id: label.id,
        title: label.title,
        access_level: label.access_level || 0,
        description: label.description,
        color: label.color
      }).then(() => {
        UserActions.fetchUserLabels();
        this.setState({
          showDetails: false
        });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    } else {
      NotificationActions.removeByUid('createUserLabel');
      const notification = {
        title: 'Create User Label',
        message: 'Title or color is empty',
        level: 'error',
        dismissible: 'button',
        autoDismiss: 5,
        position: 'tr',
        uid: 'createUserLabel'
      };
      NotificationActions.add(notification);
    }
  }

  onChange(state) {
    const { currentUser, labels } = state;
    const list = (labels || []).filter(
      (r) => r.access_level === 2 || r.user_id === (currentUser && currentUser.id)
    );

    this.setState({
      labels: list,
      currentUser: currentUser || {},
    });
  }

  handleDeleteLabel(label) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete label "${label.title}"? This cannot be undone.`)) return;
    UsersFetcher.deleteUserLabel(label.id)
      .then(() => {
        UserActions.fetchUserLabels();
      })
      .catch((err) => {
        NotificationActions.removeByUid('deleteUserLabel');
        NotificationActions.add({
          title: 'Delete User Label',
          message: (err && err.error) || 'Failed to delete label',
          level: 'error',
          dismissible: 'button',
          autoDismiss: 5,
          position: 'tr',
          uid: 'deleteUserLabel',
        });
      });
  }

  handelNewLabel() {
    this.setState({
      label: {},
      showDetails: true,
    });
  }

  renderUserLabel(node) {
    return (<UserLabel {...node.data} />);
  }

  renderAccessLabel(node) {
    let accessLabel = '';
    switch (node.data.access_level) {
      case 0:
        accessLabel = 'Private';
        break;
      case 1:
        accessLabel = 'Public';
        break;
      case 2:
        accessLabel = 'Global';
        break;
      case 3:
        accessLabel = 'Review';
        break;
      default:
        accessLabel = '';
    }
    return accessLabel;
  }

  renderActions(node) {
    const { currentUser } = this.state;
    const isGlobal = node.data.access_level === 2;
    const isOwner = node.data.user_id === currentUser.id;
    return (
      <div className="d-flex gap-1">
        <Button
          size="sm"
          disabled={isGlobal}
          variant={isGlobal ? 'light' : 'success'}
          onClick={(e) => this.handleEditLabelClick(e, node.data)}
        >
          {isGlobal ? 'Global' : 'Edit'}
        </Button>
        {isOwner && !isGlobal && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => this.handleDeleteLabel(node.data)}
            title="Delete label"
          >
            <i className="fa fa-trash-o" />
          </Button>
        )}
      </div>
    );
  }

  renderLabels() {
    const { showDetails, labels } = this.state;
    if (showDetails === true) {
      return this.renderLabel();
    }

    const columnDefs = [
      {
        headerName: "Label",
        minWidth: 100,
        maxWidth: 100,
        cellRenderer: this.renderUserLabel,
      },
      {
        headerName: "Access",
        minWidth: 70,
        maxWidth: 70,
        cellRenderer: this.renderAccessLabel,
      },
      {
        headerName: "Description",
        field: "description",
        wrapText: true,
        cellClass: ["lh-base", "p-2", "border-end"],
      },
      {
        headerName: "Color",
        field: "color",
        minWidth: 80,
        maxWidth: 80,
      },
      {
        headerName: "Action",
        minWidth: 110,
        maxWidth: 110,
        cellRenderer: this.renderActions,
        cellClass: ["p-2"],
      },
    ];

    const defaultColDef = {
      editable: false,
      flex: 1,
      autoHeight: true,
      sortable: false,
      resizable: false,
      suppressMovable: true,
      cellClass: ["border-end", "px-2"],
      headerClass: ["border-end", "px-2"]
    };

    return (
      <div className="ag-theme-alpine">
        <h3 className="pb-2">
          <Button variant="primary" size="md" onClick={() => this.handelNewLabel()}>
            <i className="fa fa-plus me-1" />
            Create
          </Button>
        </h3>
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowData={labels || []}
          rowHeight="auto"
          domLayout="autoHeight"
          autoSizeStrategy={{ type: 'fitGridWidth' }}
        />
      </div>
    );
  }

  renderColorOptionLabel(option) {
    return (
      <ColorLabel color={option.value} label={option.label} />
    );
  }

  renderLabel() {
    const { label } = this.state;
    const bcStyle = {
      backgroundColor: label.color || this.state.defaultColor
    };
    const accessList = [
      { label: 'Private - Exclusive access for you', value: 0 },
      { label: 'Public - Shareable before publication, Visible to all after', value: 1 }
    ];

    const currentUser = UserStore.getState()?.currentUser;
    const isReviewer = (currentUser?.is_reviewer) || false;
    if (isReviewer) {
      accessList.unshift({ label: 'Review - Reviewer only', value: 3 });
      accessList.unshift({ label: 'Global - Open to everyone', value: 2 });
    }

    return (
      <Form horizontal>
        <Form.Group controlId="accessLevelInput" className="mb-2">
          <Form.Label>
            Public?
          </Form.Label>
          <Select
            name="userLabel"
            options={accessList}
            onChange={this.handleAccessChange}
            value={accessList.find(({ value }) => value === label.access_level)}
          />
        </Form.Group>
        <Form.Group controlId="titleInput" className="mb-2">
          <Form.Label>
            Title
          </Form.Label>
          <Form.Control
            type="text"
            ref={(m) => { this.titleInput = m; }}
            defaultValue={label.title || ''}
          />
        </Form.Group>
        <Form.Group controlId="descInput" className="mb-2">
          <Form.Label>
            Description
          </Form.Label>
          <Form.Control
            type="text"
            ref={(m) => { this.descInput = m; }}
            defaultValue={label.description || ''}
          />
        </Form.Group>
        <Form.Group controlId="colorInput">
          <Form.Label>Background Color</Form.Label>
          <Select
            className="rounded-corners"
            name="colorPicker"
            isClearable
            ref={(m) => { this.colorInput = m; }}
            options={colorOptions}
            value={colorOptions.find(({ value }) => value === label.color) || null}
            onChange={this.handleColorPicker}
            getOptionLabel={this.renderColorOptionLabel}
            maxHeight="200px"
            placeholder="Choose a color..."
          />
        </Form.Group>
      </Form>
    );
  }

  render() {
    const { showLabelModal } = this.props;
    const { showDetails } = this.state;

    return (
      <Modal
        centered
        show={showLabelModal}
        onHide={this.props.onHide}
      >
        <Modal.Header closeButton>
          <Modal.Title>My labels</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.renderLabels()}
        </Modal.Body>
        {showDetails
          && (
            <Modal.Footer>
              <ButtonToolbar className="mt-2">
                <Button variant="light" onClick={this.handleBackButton}>Back</Button>
                <Button variant="primary" onClick={this.handleSaveLabel}>Save</Button>
              </ButtonToolbar>
            </Modal.Footer>
          )}
      </Modal>
    );
  }
}

UserLabelModal.propTypes = {
  showLabelModal: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired
};

// eslint-disable-next-line react/no-multi-comp
class EditUserLabels extends React.Component {
  constructor(props) {
    super(props);

    const userState = UserStore.getState();
    this.state = {
      currentUser: userState.currentUser || {},
      labelOptions: userState.labels || [],
    };
    this.onChange = this.onChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  handleSelectChange(val) {
    const { element, fnCb } = this.props;
    const ids = val.map((v) => v.id);
    element.setUserLabels(ids);
    fnCb(element);
  }

  onChange(state) {
    const { currentUser, labels } = state;
    this.setState({
      currentUser,
      labelOptions: labels || [],
    });
  }

  render() {
    const { currentUser, labelOptions } = this.state;
    const { element } = this.props;

    const curLabelIds = element?.user_labels || [];
    const selectedLabels = labelOptions.filter((o) => (
      curLabelIds.includes(o.id) && (o.access_level > 0 || o.user_id === currentUser.id)
    ))

    const options = labelOptions
      .filter((o) => o.access_level === 2 || o.user_id === currentUser.id)

    return (
      <Form.Group>
        <Form.Label>My labels</Form.Label>
        <Select
          isMulti
          isDisabled={!element?.can_update}
          options={options}
          getOptionValue={(label) => label.id}
          getOptionLabel={(label) => label.title}
          formatOptionLabel={UserLabel}
          value={selectedLabels}
          onChange={this.handleSelectChange}
          isDisabled={element?.can_update === false}
        />
      </Form.Group>
    );
  }
}

EditUserLabels.propTypes = {
  element: PropTypes.object.isRequired,
  fnCb: PropTypes.func.isRequired,
};


// eslint-disable-next-line react/no-multi-comp
class ShowUserLabels extends React.Component {
  constructor(props) {
    super(props);

    const { currentUser, labels } = UserStore.getState();
    this.state = {
      currentUser: currentUser || {},
      labelOptions: labels || [],
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  onChange(state) {
    const { currentUser, labels } = state;
    this.setState({
      currentUser,
      labelOptions: labels || [],
    });
  }

  render() {
    const { element } = this.props;
    const { currentUser, labelOptions } = this.state;

    const curLabelIds = element?.tag?.taggable_data?.user_labels || [];
    const labels = labelOptions.filter((o) => (
      curLabelIds.includes(o.id) && (o.access_level > 0 || o.user_id === currentUser.id)
    ));

    return labels.map((l) => <UserLabel key={l.id} {...l} />);
  }
}

ShowUserLabels.propTypes = {
  element: PropTypes.object.isRequired
};


class SearchUserLabels extends React.Component {
  constructor(props) {
    super(props);

    const { currentUser, labels } = UserStore.getState();
    this.state = {
      currentUser: currentUser || {},
      labels: labels || [],
    };
    this.onChange = this.onChange.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
  }

  componentDidMount() {
    UserStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UserStore.unlisten(this.onChange);
  }

  handleSelectChange(value) {
    this.props.fnCb(value?.id ?? null);
  }

  onChange(state) {
    const { currentUser, labels } = state;
    this.setState({
      currentUser,
      labels
    });
  }

  render() {
    const { currentUser, labels } = this.state;
    const { userLabel, styles, includeReviewLabels } = this.props;  // styles is for REPO
    const list = (labels || []).filter(
      (r) => r.access_level === 2
        || (includeReviewLabels && r.access_level === 3)
        || r.user_id === (currentUser && currentUser.id)
    );

    return (
      <Select
        isClearable
        options={list}
        getOptionValue={(label) => label.id}
        getOptionLabel={(label) => label.title}
        formatOptionLabel={UserLabel}
        value={labels.find((l) => l.id === userLabel)}
        onChange={this.handleSelectChange}
        placeholder="Filter by label"
        minWidth="100px"
        size={this.props.size}
        styles={styles}
      />
    );
  }
}

SearchUserLabels.propTypes = {
  fnCb: PropTypes.func.isRequired,
  userLabel: PropTypes.number,
  size: PropTypes.string,
  styles: PropTypes.object, // for REPO
  includeReviewLabels: PropTypes.bool,
};

SearchUserLabels.defaultProps = {
  userLabel: null,
  size: 'md',
  styles: {},  // for REPO
  includeReviewLabels: false,
};

export { UserLabel, UserLabelModal, EditUserLabels, ShowUserLabels, SearchUserLabels };
