/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';
import { filter, cloneDeep } from 'lodash';
import { isLayerInWF } from 'chem-generic-ui';
import NotificationActions from '../components/actions/NotificationActions';
import UserStore from '../components/stores/UserStore';
import UIActions from '../components/actions/UIActions';
import MatrixCheck from '../components/common/MatrixCheck';

const notification = props =>
  (
    NotificationActions.add({
      title: props.title,
      message: props.msg,
      level: props.lvl,
      position: 'tc',
      dismissible: 'button',
      autoDismiss: props.autoDismiss || 5,
      uid: props.uid || uuid.v4()
    })
  );

const validateLayerInput = (layer, act = 'new') => {
  if (layer.key === '') {
    notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'Please input Name.' });
    return false;
  }
  if (act === 'new' && !(/^[a-z][a-z_]+[a-z]$/g.test(layer.key))) {
    notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'This Name is invalid, please try a different one.' });
    return false;
  }
  if (parseInt((layer.cols || 1), 10) < 1) {
    notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'The minimun of Column per Row is 1, please input a different one.' });
    return false;
  }
  return true;
};

const validateSelectList = (selectName, element) => {
  if (selectName === '') {
    notification({ title: `Select List [${selectName}]`, lvl: 'error', msg: 'Please input Name.' });
    return false;
  }
  if (!(/^[a-z][a-z_]+[a-z]$/g.test(selectName))) {
    notification({ title: `Select List [${selectName}]`, lvl: 'error', msg: 'This Name is invalid, please try a different one.' });
    return false;
  }
  if (element.properties_template.select_options[`${selectName}`]) {
    notification({ title: `Select List [${selectName}]`, lvl: 'error', msg: 'This name of Select List is already taken. Please choose another one.' });
    return false;
  }
  return true;
};

const GenericDSMisType = () => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  if (MatrixCheck(currentUser.matrix, 'genericDataset')) {
    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip">Type (Chemical Methods Ontology) has been changed. <br />Please review this Dataset content.</Tooltip>}>
        <span style={{ color: 'red' }}><i className="fa fa-exclamation-triangle" />&nbsp;</span>
      </OverlayTrigger>
    );
  }
  return null;
};

const validateLayerDeletion = (_element, _delKey) => {
  if (isLayerInWF(_element, _delKey)) {
    notification({ title: `Layer [${_delKey}]`, lvl: 'warning', msg: `This layer [${_delKey}] can not be removed because it is currently used in workflow.` });
    return false;
  }
  return true;
};

const validateLayerUpdation = (_element, _updates) => {
  const { key, wf } = _updates;
  if (isLayerInWF(_element, key)) {
    if (!wf) {
      notification({ title: `Layer [${key}]`, lvl: 'warning', msg: `Can not change the attribute 'used in Workflow?' because this layer [${key}] is currently used in workflow.` });
      return false;
    }
  }
  const { layers } = _element.properties_template;
  if (wf && layers[key] && (layers[key].cond_fields || []).length > 0) {
    notification({ title: `Layer [${key}]`, lvl: 'warning', msg: 'Can not use in Workflow because the Layer Restriction has been set.' });
    return false;
  }
  return true;
};

const renderFlowModal = (generic, isToggle) => {
  const segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  let shortLabel = generic.short_label;
  if (!shortLabel) {
    shortLabel = segmentKlasses.filter(s => s.id === generic.segment_klass_id);
    shortLabel = shortLabel.length > 0 ? shortLabel[0].label : '';
  }
  const params = {
    properties_release: cloneDeep(generic.properties_release) || {},
    properties: cloneDeep(generic.properties) || {},
    shortLabel,
    toggle: isToggle
  };
  UIActions.rerenderGenericWorkflow(params);
};

const segmentsByKlass = (name) => {
  const allSegments = UserStore.getState().segmentKlasses || [];
  return filter(allSegments, se => (se.element_klass && se.element_klass.name) === name);
};

export {
  GenericDSMisType, validateLayerInput, validateSelectList, notification,
  validateLayerUpdation, validateLayerDeletion, renderFlowModal, segmentsByKlass
};
