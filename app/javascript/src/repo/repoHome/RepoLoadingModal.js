import React, { Component } from 'react';
import { Modal } from 'react-bootstrap';
import RepoLoadingStore from 'src/repo/stores/RepoLoadingStore';

export default class RepoLoadingModal extends Component {
  constructor(props) {
    super(props);
    this.state = { ...RepoLoadingStore.getState() };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    RepoLoadingStore.listen(this.onChange);
  }

  componentWillUnmount() {
    RepoLoadingStore.unlisten(this.onChange);
  }

  onChange(state) {
    this.setState({ ...state });
  }

  render() {
    const { loading } = this.state;
    return (
      <Modal
        centered
        contentClassName="d-flex justify-content-center align-items-center mx-auto w-25 py-5"
        animation
        show={loading}
      >
        <i className="fa fa-refresh fa-spin fa-3x fa-fw" />
      </Modal>
    );
  }
}
