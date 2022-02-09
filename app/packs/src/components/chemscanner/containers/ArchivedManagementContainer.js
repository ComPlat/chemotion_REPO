import { List } from 'immutable';
import PropTypes from 'prop-types';

import React from 'react';
import { connect } from 'react-redux';

import { setArchivedValue } from '../actions/storedFileActions';
import * as types from '../actions/ActionTypes';

import ArchivedManagement from '../components/ArchivedManagement';

const mapStateToProps = state => ({
  files: state.get('files'),
});

const mapDispatchToProps = dispatch => ({
  setArchivedValue: (ids, val) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(setArchivedValue(ids, val)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
});

function ArchivedManagementContainer(props) {
  const { files } = props;
  const setArchivedValueFunc = props.setArchivedValue;

  const archivedFiles = [];
  const activedFiles = [];

  files.forEach((f) => {
    const file = f.toJS();
    const { archived } = file.extendedMetadata;

    if (archived == null || archived === false) {
      activedFiles.push(file);
    } else {
      archivedFiles.push(file);
    }
  });

  return (
    <ArchivedManagement
      archivedFiles={archivedFiles}
      activedFiles={activedFiles}
      setArchivedValue={setArchivedValueFunc}
    />
  );
}

ArchivedManagementContainer.propTypes = {
  files: PropTypes.instanceOf(List).isRequired,
  setArchivedValue: PropTypes.func.isRequired,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ArchivedManagementContainer);
