import React from 'react';
import { connect } from 'react-redux';

import * as types from 'src/apps/chemscanner/actions/ActionTypes';

import { importData } from 'src/components/chemscanner/actions/storedFileActions';
import ImportModal from 'src/components/chemscanner//components/ChemscannerImportModal';

const ImportModalContainer = props => <ImportModal {...props} />;

const fetchCollections = () => (
  fetch('/api/v1/collections/all_as_tree', {
    credentials: 'same-origin',
    method: 'GET',
  }).then(res => res.json())
);

const mapStateToProps = state => ({
  show: state.get('ui').get('import'),
  selectedItems: state.get('ui').get('selected'),
  fetchCollections,
});

const mapDispatchToProps = dispatch => ({
  closeModal: () => dispatch({ type: types.UNSET_IMPORT }),
  importData: (data, collection, maintainShortLabel) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(importData(data, collection, maintainShortLabel)).then(() => (
      dispatch({ type: types.UNSET_LOADING })
    ));
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ImportModalContainer);
