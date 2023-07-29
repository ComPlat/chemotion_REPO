import React from 'react';
import ReactDOM from 'react-dom';
import { Panel, FormGroup, Popover, FormControl, Button, Row, Col, Badge, Tooltip, OverlayTrigger, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import uuid from 'uuid';
import Clipboard from 'clipboard';
import { findIndex, filter, sortBy, orderBy } from 'lodash';
import { GenGridSg, GenButtonTooltip, SelectOptionLayer, ElementField, AttrNewModal, AttrEditModal, AttrCopyModal, FieldCondEditModal, LayerAttrEditModal, UploadModal, LayerAttrNewModal, WorkflowModal, reUnit, GenericDummy, orgLayerObject } from 'chem-generic-ui';
import Notifications from '../components/Notifications';
import LoadingModal from '../components/common/LoadingModal';
import UsersFetcher from '../components/fetchers/UsersFetcher';
import GenericSgsFetcher from '../components/fetchers/GenericSgsFetcher';
import GenericElsFetcher from '../components/fetchers/GenericElsFetcher';
import LoadingActions from '../components/actions/LoadingActions';
import { validateLayerInput, validateSelectList, notification, validateLayerUpdation, validateLayerDeletion } from './Utils';
import Preview from './Preview';
import { GenericAdminNav, GenericAdminUnauth } from './GenericAdminNav';

const validateField = field => (/^[a-zA-Z0-9_]*$/g.test(field));
const validateInput = (element) => {
  if (element.klass_element === '') {
    notification({ title: 'Create Segment Error', lvl: 'error', msg: 'Please select Element.' });
    return false;
  }
  if (element.label === '') {
    notification({ title: 'Create Segment Error', lvl: 'error', msg: 'Please input Segment Label.' });
    return false;
  }
  return true;
};

export default class GenericSegmentsAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      element: {},
      klasses: [],
      newFieldKey: '',
      layerKey: '',
      selectOptions: [],
      unitsSystem: {},
      show: { tab: '', modal: '' },
      propTabKey: 1,
      revisions: [],
      user: {}
    };

    this.clipboard = new Clipboard('.clipboardBtn');
    this.fetchElements = this.fetchElements.bind(this);
    this.handlePropShow = this.handlePropShow.bind(this);
    this.onInputNewField = this.onInputNewField.bind(this);
    this.editLayer = this.editLayer.bind(this);
    this.editKlass = this.editKlass.bind(this);
    this.copyKlass = this.copyKlass.bind(this);
    this.newField = this.newField.bind(this);
    this.newOption = this.newOption.bind(this);
    this.updSubField = this.updSubField.bind(this);
    this.updLayerSubField = this.updLayerSubField.bind(this);
    this.handleShowState = this.handleShowState.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.handleCreateLayer = this.handleCreateLayer.bind(this);
    this.handleUpdateLayer = this.handleUpdateLayer.bind(this);
    this.handleCreateKlass = this.handleCreateKlass.bind(this);
    this.handleUpdateKlass = this.handleUpdateKlass.bind(this);
    this.handleActivateKlass = this.handleActivateKlass.bind(this);
    this.handleDeleteKlass = this.handleDeleteKlass.bind(this);
    this.handleAddSelect = this.handleAddSelect.bind(this);
    this.onDummyAdd = this.onDummyAdd.bind(this);
    this.onFieldDrop = this.onFieldDrop.bind(this);
    this.onFieldMove = this.onFieldMove.bind(this);
    this.onShowFieldCond = this.onShowFieldCond.bind(this);
    this.onFieldInputChange = this.onFieldInputChange.bind(this);
    this.fetchConfigs = this.fetchConfigs.bind(this);
    this.handleCond = this.handleCond.bind(this);
    this.onFieldSubFieldChange = this.onFieldSubFieldChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.propTabSelect = this.propTabSelect.bind(this);
    this.retriveRevision = this.retriveRevision.bind(this);
    this.delRevision = this.delRevision.bind(this);
    this.fetchRevisions = this.fetchRevisions.bind(this);
    this.handleUploadTemplate = this.handleUploadTemplate.bind(this);
    this.saveFlow = this.saveFlow.bind(this);
    this.onUpdElement = this.onUpdElement.bind(this);
  }

  componentDidMount() {
    this.fetchElements();
    this.fetchElementKlasses();
    this.fetchConfigs();
    UsersFetcher.fetchCurrentUser().then((result) => {
      if (!result.error) {
        this.setState({ user: result.user });
      }
    }).catch((errorMessage) => { console.log(errorMessage); });
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  onUpdElement(generic) {
    this.setState({ element: generic });
  }

  onDummyAdd(e) {
    const { element } = this.state;
    const layer = (element && element.properties_template
      && element.properties_template.layers[e.l]);
    let { fields } = layer || {};
    fields = fields || [];
    let idx = fields.findIndex(o => o.field === e.f);
    if (idx === -1 && fields.length > 0) idx = fields.length - 1;
    fields.splice(idx + 1, 0, new GenericDummy());
    element.properties_template.layers[e.l].fields = fields;
    this.setState({ element });
  }

  onShowFieldCond(field, lk) {
    this.setState({ show: this.getShowState('modal', 'FieldCond'), fieldObj: field, layerKey: lk });
  }

  onFieldDrop(e) {
    const { element } = this.state;
    const sourceKey = e.sourceTag.layerKey;
    const targetKey = e.targetTag.layerKey;
    const sourceLayer = element.properties_template.layers[sourceKey];
    const targetLayer = element.properties_template.layers[targetKey];

    if (sourceLayer && targetLayer) {
      e.sourceTag.field.position = e.targetTag.field.position - 1;
      const { fields } = element.properties_template.layers[sourceKey];
      const idx = findIndex(fields, o => o.field === e.sourceTag.field.field);
      fields.splice(idx, 1, e.sourceTag.field);
      element.properties_template.layers[sourceKey].fields = fields;
      this.setState({ element });
    }
  }

  onFieldMove(l, f, isUp) {
    const { element } = this.state;
    const layer = (element && element.properties_template && element.properties_template.layers[l]);
    const { fields } = layer;
    const idx = findIndex(fields, o => o.field === f);
    if (idx >= 0 && isUp) {
      const curObj = fields[idx];
      curObj.position -= 1;
      const preObj = fields[idx - 1];
      preObj.position += 1;
      fields[idx] = preObj;
      fields[idx - 1] = curObj;
    } else if (idx < (fields.length - 1) && !isUp) {
      const curObj = fields[idx];
      curObj.position += 1;
      const nexObj = fields[idx + 1];
      nexObj.position -= 1;
      fields[idx] = nexObj;
      fields[idx + 1] = curObj;
    }
    element.properties_template.layers[l].fields = fields;
    this.setState({ element });
  }

  onFieldSubFieldChange(lk, f, cb) {
    const { element } = this.state;
    const layer = (element && element.properties_template
      && element.properties_template.layers[lk]);
    const { fields } = layer;
    if (layer != null) {
      const fobj = (fields || []).find(o => o.field === f.field);
      if (Object.keys(fobj).length > 0) {
        const idx = (fields || []).findIndex(o => o.field === f.field);
        fields.splice(idx, 1, f);
        element.properties_template.layers[lk].fields = fields;
        this.setState({ element }, cb);
      }
    }
  }

  onFieldInputChange(event, orig, fe, lk, fc, tp) {
    const { element } = this.state;

    let value = '';
    if (tp === 'select' || tp === 'system-defined') {
      ({ value } = event);
    } else if (tp && tp.startsWith('drag')) {
      value = event;
    } else {
      ({ value } = event.target);
    }
    const layer = (element && element.properties_template
      && element.properties_template.layers[lk]);

    if (typeof layer === 'undefined' || layer == null) return;

    const { fields } = layer;

    if (fields == null || fields.length === 0) return;

    const fobj = fields.find(e => e.field === fe);
    if (Object.keys(fobj).length === 0) return;

    switch (fc) {
      case 'required':
      case 'hasOwnRow':
      case 'canAdjust':
        fobj[`${fc}`] = !orig;
        break;
      default:
        fobj[`${fc}`] = value;
        break;
    }

    const idx = findIndex(fields, o => o.field === fe);
    fields.splice(idx, 1, fobj);
    element.properties_template.layers[lk].fields = fields;
    this.setState({ element });
  }

  onInputNewField(e) {
    this.setState({ newFieldKey: e.target.value });
  }

  getShowState(att, val) { return { ...this.state.show, [att]: val }; }

  retriveRevision(revision, cb) {
    const { element } = this.state;
    element.properties_template = revision;
    this.setState({ element, propTabKey: 1 }, cb);
  }

  fetchRevisions() {
    const { element } = this.state;
    if (element && element.id) {
      GenericSgsFetcher.fetchKlassRevisions(element.id, 'SegmentKlass')
        .then((result) => {
          let curr = Object.assign({}, { ...element.properties_template });
          curr = Object.assign({}, { properties_release: curr }, { uuid: 'current' });
          const revisions = [].concat(curr, result.revisions);
          this.setState({ revisions });
        });
    }
  }

  delRevision(params) {
    const { element } = this.state;
    GenericSgsFetcher.deleteKlassRevision({ id: params.id, klass_id: element.id, klass: 'SegmentKlass' })
      .then((response) => {
        if (response.error) {
          notification({ title: 'Delete Revision', lvl: 'error', msg: response.error });
        } else {
          this.fetchRevisions();
        }
      });
  }

  propTabSelect(key) {
    if (key !== 1) {
      this.fetchRevisions();
    }
    this.setState({ propTabKey: key });
  }

  updSubField(layerKey, field, cb) {
    this.onFieldSubFieldChange(layerKey, field, cb);
  }

  updLayerSubField(layerKey, layer) {
    const { element } = this.state;
    element.properties_template.layers[`${layerKey}`] = layer;
    this.setState({ element });
  }

  handleCond(lk) {
    this.onShowFieldCond(null, lk);
  }

  editLayer(e) {
    this.setState({ show: this.getShowState('modal', 'EditLayer'), layerKey: e.layerKey });
  }

  editKlass(element) {
    this.setState({ show: this.getShowState('modal', 'EditKlass'), element });
  }

  copyKlass(element) {
    this.setState({ show: this.getShowState('modal', 'CopyKlass'), element });
  }

  newField(e) {
    const { element, newFieldKey } = this.state;
    if (newFieldKey === null || newFieldKey.trim().length === 0) {
      notification({ title: 'Add new field', lvl: 'error', msg: 'please input field name first!' });
      return;
    }
    if (!validateField(newFieldKey)) {
      notification({ title: 'Add new field', lvl: 'error', msg: 'only can be alphanumeric (a-z, A-Z, 0-9 and underscores).' });
      return;
    }
    const { layerKey } = e;
    const layer = element && element.properties_template
      && element.properties_template.layers[layerKey];
    const fields = layer.fields || [];
    const dupfields = filter(fields, o => o.field === newFieldKey);
    if (dupfields && dupfields.length > 0) {
      notification({ title: 'Add new field', lvl: 'error', msg: 'this field is used already, please change a field name' });
      return;
    }
    const newField = {
      type: 'text', field: newFieldKey, position: 100, label: newFieldKey, default: ''
    };
    fields.push(newField);
    element.properties_template.layers[layerKey].fields = fields;
    this.setState({ layerKey, element });
  }

  newOption(key, newOptionKey, selectOptions) {
    if (newOptionKey == null || newOptionKey.trim().length === 0) {
      notification({ title: 'Add new option', lvl: 'error', msg: 'please input option name first!' });
      return;
    }
    if (selectOptions.filter(x => x.key === newOptionKey).length > 1) {
      notification({ title: 'Add new option', lvl: 'error', msg: 'this option key is used already, please change another option key' });
      return;
    }
    const { element } = this.state;
    element.properties_template.select_options[key].options = selectOptions;
    this.onUpdElement(element);
  }

  handleShowState(att, val, cb = () => {}) {
    this.setState({ show: this.getShowState(att, val) }, cb);
  }
  closeModal(cb = () => {}) { this.handleShowState('modal', '', cb); }

  handleAddSelect(selectName, newSelectOptions) {
    const { element } = this.state;
    if (validateSelectList(selectName, element)) {
      element.properties_template.select_options = newSelectOptions;
      const selectOptions = Object.keys(newSelectOptions).map(key => ({ value: key, name: key, label: key }));
      this.setState({ element, selectOptions });
    }
  }

  handleCreateLayer(_layer) {
    const layer = _layer;
    if (!validateLayerInput(layer)) return;
    const { element } = this.state;
    if (element && element.properties_template && element.properties_template.layers[`${layer.key}`]) {
      notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'This Layer is already taken. Please choose another one.' });
      return;
    }
    const sortedLayers = sortBy(element.properties_template.layers, ['position']);
    layer.position = (!layer.position && sortedLayers.length < 1) ?
      100 : parseInt((sortedLayers.slice(-1)[0] || { position: 100 }).position, 10) + 10;
    element.properties_template.layers[`${layer.key}`] = layer;
    notification({ title: `Layer [${layer.key}]`, lvl: 'info', msg: 'This new layer is kept in the Template workspace temporarily. Please remember to press Save when you finish the editing.' });
    this.setState({ show: this.getShowState('modal', ''), element, layerKey: layer.key });
  }

  handleUpdateLayer(layerKey, updates) {
    if (!validateLayerInput(updates, 'upd')) return;
    const { element } = this.state;
    if (!validateLayerUpdation(element, updates)) return;
    let layer = element && element.properties_template
    && element.properties_template.layers[layerKey];
    layer = { ...layer, ...updates };
    const sortedLayers = sortBy(element.properties_template.layers, ['position']);
    layer.position = layer.position ?
      parseInt(layer.position, 10) : parseInt(sortedLayers.slice(-1)[0].position, 10) + 10;
    element.properties_template.layers[`${layer.key}`] = layer;
    notification({ title: `Layer [${layer.key}]`, lvl: 'info', msg: 'This updates of this layer is kept in the Template workspace temporarily. Please remember to press Save when you finish the editing.' });
    this.setState({ show: this.getShowState('modal', ''), element });
  }

  handleCreateKlass(element) {
    if (!validateInput(element)) return;
    GenericSgsFetcher.createSegmentKlass(element)
      .then((result) => {
        if (result.error) {
          notification({ title: 'Create Segment fail', lvl: 'error', msg: result.error });
        } else {
          notification({ title: 'Create Segment successfully', lvl: 'info', msg: 'Created successfully' });
          this.closeModal(this.fetchElements);
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleUpdateKlass(element, updates) {
    const inputs = { ...element, ...updates };
    if (!validateInput(inputs)) return;
    GenericSgsFetcher.updateSegmentKlass(inputs)
      .then((result) => {
        if (result.error) {
          notification({ title: 'Update Segment fail', lvl: 'error', msg: result.error });
        } else {
          notification({ title: 'Update Segment successfully', lvl: 'info', msg: 'Updated successfully' });
          this.closeModal(this.fetchElements);
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleActivateKlass(e) {
    const act = e.is_active ? 'De-activate' : 'Activate';
    GenericSgsFetcher.deActivateKlass({ id: e.id, is_active: !e.is_active, klass: 'SegmentKlass' })
      .then((result) => {
        if (result.error) {
          notification({ title: `${act} Segment fail`, lvl: 'error', msg: result.error });
        } else {
          notification({ title: `${act} Segment successfully`, lvl: 'info', msg: `Segment is ${act.toLowerCase()} now` });
          this.closeModal(this.fetchElements);
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleDeleteKlass(element) {
    GenericSgsFetcher.deleteKlass({ id: element.id, klass: 'SegmentKlass' })
      .then((result) => {
        if (result.error) {
          notification({ title: 'Delete Segment fail', lvl: 'error', msg: result.error });
        } else {
          notification({ title: `Segment [${element.label}]`, lvl: 'info', msg: 'Deleted successfully' });
          this.closeModal(this.fetchElements);
          this.handleShowState('tab', '');
        }
      });
  }

  handlePropShow(element) {
    if (element) {
      const selectOptions = Object.keys(element.properties_template.select_options)
        .map(key => ({ value: key, name: key, label: key }));
      this.setState({
        element, selectOptions, show: this.getShowState('tab', 'PropModal'), propTabKey: 1
      });
    }
  }

  handleUploadTemplate(properties, message, valid) {
    const { element } = this.state;
    if (valid === false) {
      this.closeModal();
      notification({
        title: `Upload Template for Segment [${element.label}] Failed`, autoDismiss: 30, lvl: 'error', msg: message
      });
    } else {
      element.properties_template = properties;
      this.setState({ element, show: this.getShowState('modal', '') });
      notification({ title: `Upload template to Segment [${element.label}]`, lvl: 'info', msg: 'The templates has been uploaded, please save it.' });
    }
  }

  fetchConfigs() {
    GenericSgsFetcher.fetchUnitsSystem()
      .then((result) => { this.setState({ unitsSystem: result }); });
  }

  fetchElements() {
    GenericSgsFetcher.listSegmentKlass()
      .then((result) => { this.setState({ elements: result.klass }); });
  }

  fetchElementKlasses() {
    GenericElsFetcher.fetchElementKlasses()
      .then((result) => {
        const klasses = result?.klass?.sort((a, b) => a.place - b.place) || [];
        this.setState({ klasses });
      });
  }

  handleSubmit(isRelease = false) {
    LoadingActions.start();
    const { element, unitsSystem } = this.state;
    Object.keys(element.properties_template.layers).forEach((key) => {
      const layer = element.properties_template.layers[key];
      let sortedFields = (layer && layer.fields) || [];
      (sortedFields || []).forEach((f, idx) => {
        const fd = f;
        fd.position = (idx + 1);
        if (fd.type === 'system-defined') { fd.option_layers = reUnit(unitsSystem, fd.option_layers); }
        fd.required = false;
        fd.sub_fields = ['input-group', 'table'].includes(fd.type) ? fd.sub_fields : [];
        if (fd.type !== 'text-formula') { fd.text_sub_fields = []; }
        return fd;
      });
      sortedFields = sortBy(sortedFields, l => l.position);
      element.properties_template.layers[key].wf_position = 0;
      element.properties_template.layers[key].fields = sortedFields;
    });
    const sortedLayers = sortBy(element.properties_template.layers, ['position']);
    sortedLayers.map((e, ix) => {
      e.position = (ix + 1) * 10;
      return e;
    });
    element.properties_template.layers = orgLayerObject(sortedLayers);
    element.is_release = isRelease;
    GenericSgsFetcher.updateSegmentTemplate(element)
      .then((result) => {
        if (result.error) {
          notification({ title: 'Update Segment template fail', lvl: 'error', msg: result.error });
        } else {
          if (isRelease === true) {
            notification({ title: 'Update Segment template', lvl: 'info', msg: 'Saved adn Released successfully' });
          } else {
            notification({ title: 'Update Segment template', lvl: 'info', msg: 'Saved successfully' });
          }
          this.fetchElements();
          this.setState({ element: result });
        }
        LoadingActions.stop();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  confirmDelete(delStr, delKey, delRoot) {
    const { element } = this.state;
    if (delStr === 'Select') {
      delete element.properties_template.select_options[delKey];
      const sos = element.properties_template.select_options;
      const selectOptions = Object.keys(sos).map(key => ({ value: key, name: key, label: key }));
      this.setState({ selectOptions });
    } else if (delStr === 'Option') {
      const { options } = element.properties_template.select_options[delRoot];
      if (options && options.length > 0) {
        const idx = findIndex(options, o => o.key === delKey);
        options.splice(idx, 1);
      }
    } else if (delStr === 'Layer') {
      if (!validateLayerDeletion(element, delKey)) return;
      delete element.properties_template.layers[delKey];
    } else if (delStr === 'Field') {
      const { fields } = element.properties_template.layers[delRoot];
      const idx = findIndex(fields, o => o.field === delKey);
      fields.splice(idx, 1);
    }
    this.setState({ element });
  }

  saveFlow(params) {
    const { flowObject } = params;
    const { element } = this.state;
    LoadingActions.start();
    element.properties_template.flow = flowObject;
    element.is_release = false;
    GenericSgsFetcher.updateSegmentTemplate(element)
      .then((result) => {
        if (result.error) {
          notification({ title: `Update Segment [${element.name}] template`, lvl: 'error', msg: result.error });
        } else {
          notification({ title: `Update Segment [${element.name}] template`, lvl: 'info', msg: 'Saved successfully' });
          this.fetchElements();
          this.setState({ element: result, show: this.getShowState('modal', '') }, () => LoadingActions.stop());
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  renderDeleteButton(delStr, delKey, delRoot) {
    let msg = 'remove?';
    if (delStr === 'Select') {
      msg = `remove this select option: [${delKey}] ?`;
    } else if (delStr === 'Option') {
      msg = `remove this option: [${delKey}] from select [${delRoot}] ?`;
    } else if (delStr === 'Layer') {
      msg = `remove this layer: [${delKey}] ?`;
    } else if (delStr === 'Field') {
      msg = `remove this field: [${delKey}] from layer [${delRoot}] ?`;
    } else {
      msg = `remove ???: ${delStr}`;
    }

    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        {msg} <br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" aria-hidden="true" onClick={() => this.confirmDelete(delStr, delKey, delRoot)}>
            Yes
          </Button><span>&nbsp;&nbsp;</span>
          <Button bsSize="xsmall" bsStyle="warning">No</Button>
        </div>
      </Popover>
    );

    return (
      <OverlayTrigger animation placement="top" root trigger="focus" overlay={popover}>
        <Button bsSize="sm" >
          <i className="fa fa-trash-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderSelectOptions() {
    const { element } = this.state;
    return (
      <SelectOptionLayer
        generic={element}
        fnChange={this.onUpdElement}
        fnAddSelect={this.handleAddSelect}
        fnAddOption={this.newOption}
      />
    );
  }

  renderProperties() {
    const { element, selectOptions, unitsSystem } = this.state;
    const layers = [];
    const sortedLayers = sortBy(element.properties_template.layers, l => l.position);

    (sortedLayers || []).forEach((layer) => {
      const layerKey = `${layer.key}`;
      const fields = ((layer && layer.fields) || []).map((f, idx) => (
        <ElementField
          genericType="Segment"
          key={`${layerKey}${f.field}`}
          layerKey={layerKey}
          position={idx + 1}
          field={f}
          select_options={selectOptions}
          onDrop={e => this.onFieldDrop(e)}
          onMove={(l, fe, isUp) => this.onFieldMove(l, fe, isUp)}
          onDelete={(delStr, delKey, delRoot) => this.confirmDelete(delStr, delKey, delRoot)}
          onChange={(e, orig, fe, lk, fc, tp) => this.onFieldInputChange(e, orig, fe, lk, fc, tp)}
          unitsSystem={unitsSystem}
          onFieldSubFieldChange={this.onFieldSubFieldChange}
          onDummyAdd={this.onDummyAdd}
          onShowFieldCond={(field, lk) => this.onShowFieldCond(field, lk)}
          allLayers={sortedLayers}
        />
      )) || [];

      const hasCond = (layer && layer.cond_fields && layer.cond_fields.length > 0) || false;
      const btnCond = hasCond ?
        (<GenButtonTooltip tip="Restriction Setting" fnClick={() => this.handleCond(layerKey)} bs="warning" element={{ l: layerKey, f: null }} fa="fa fa-cogs" place="top" size="sm" />) :
        (<GenButtonTooltip tip="Restriction Setting" fnClick={() => this.handleCond(layerKey)} element={{ l: layerKey, f: null }} fa="fa fa-cogs" place="top" size="sm" />);
      // disable for now
      const btnWF = null;
      // const btnWF = layer.wf ? <GenButtonTooltip tip="used in workflow" fnClick={() => {}} element={{ }} fa="fa-sitemap" place="top" size="sm" /> : null;
      const node = (
        <Panel className="panel_generic_properties" defaultExpanded key={`idxLayer_${layerKey}`}>
          <Panel.Heading className="template_panel_heading">
            <Panel.Title toggle>
              {layer.label}&nbsp;<Badge>{layer.key}</Badge>&nbsp;<Badge>{`Columns per Row: ${layer.cols}`}</Badge>&nbsp;<Badge className="bg-bs-primary">{`Fields: ${(layer.fields && layer.fields.length) || 0}`}</Badge>
              {
                layer.wf ? <span>&nbsp;<Badge className="bg-bs-warning">workflow</Badge></span> : null
              }
            </Panel.Title>
            <div>
              <FormGroup bsSize="sm" style={{ marginBottom: 'unset', display: 'inline-table' }}>
                <InputGroup>
                  <InputGroup.Button>
                    {btnWF}
                    {btnCond}
                    <GenButtonTooltip tip={`Edit Layer: ${layer.label}`} fnClick={this.editLayer} element={{ layerKey }} fa="fa-pencil" place="top" size="sm" />
                    {this.renderDeleteButton('Layer', layerKey, null)}
                  </InputGroup.Button>
                  <FormControl
                    type="text"
                    name="nf_newfield"
                    onChange={e => this.onInputNewField(e)}
                    placeholder="Input new field name"
                    bsSize="sm"
                  />
                  <InputGroup.Button>
                    <GenButtonTooltip tip="Add new field" fnClick={this.newField} element={{ layerKey }} fa="fa fa-plus" place="top" size="sm" />
                    <GenButtonTooltip tip="Add Dummy field" fnClick={this.onDummyAdd} element={{ l: layerKey, f: null }} fa="fa fa-plus-circle" place="top" size="sm" />
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
            </div>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body style={{ padding: '15px 0px 15px 0px' }}>
              {fields}
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      );
      layers.push(node);
    });

    return (
      <div>
        <Panel>
          <Panel.Heading>
            <Panel.Title>
              Layers
              <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>Add new layer</Tooltip>}>
                <Button className="button-right" bsSize="xs" onClick={() => this.handleShowState('modal', 'NewLayer')}>Add new layer&nbsp;<i className="fa fa-plus" aria-hidden="true" /></Button>
              </OverlayTrigger>
            </Panel.Title>
          </Panel.Heading>
          <Panel.Body><div>{ layers }</div></Panel.Body>
        </Panel>
      </div>
    );
  }

  renderPropPanel() {
    const {
      element, show, revisions, propTabKey
    } = this.state;
    const showPropModal = show.tab === 'PropModal';
    if (showPropModal) {
      return (
        <Tabs activeKey={propTabKey} id="segments-prop-tabs" onSelect={this.propTabSelect}>
          <Tab eventKey={1} title="Template">
            <Panel show={showPropModal.toString()}>
              <Panel.Heading>
                <b>{`Template of Segment [${element.label}]: ${element.desc}`}</b>&nbsp;
                <span className="generic_version">{`ver.: ${element.uuid}`}</span>
                <span className="generic_version_draft">{element.uuid === element.properties_template.uuid ? '' : `draft: ${element.properties_template.uuid}`}</span>
                <span className="button-right" >
                  <GenButtonTooltip txt="Save and Release" tip="Save and Release template" fnClick={() => this.handleSubmit(true)} fa="fa-floppy-o" place="top" bs="primary" />&nbsp;
                  <GenButtonTooltip txt="Save as draft" tip="Save template as draft" fnClick={() => this.handleSubmit(false)} fa="fa-floppy-o" place="top" bs="primary" />&nbsp;
                  <GenButtonTooltip txt="Upload template" tip="Upload Segment template in JSON format" fnClick={() => this.handleShowState('modal', 'Upload')} place="top" fa="fa-upload" />&nbsp;
                  <GenButtonTooltip txt="Workflow" tip="Design workflow" fnClick={() => this.handleShowState('modal', 'Workflow')} fa="fa-sitemap" place="top" />&nbsp;
                </span>
                <div className="clearfix" />
              </Panel.Heading>
              <Panel.Body>
                <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
                  <Col sm={8}>{this.renderProperties()}</Col>
                  <Col sm={4}>{this.renderSelectOptions()}</Col>
                </Row>
              </Panel.Body>
            </Panel>
          </Tab>
          <Tab eventKey={3} title="Preview">
            <Preview revisions={revisions} element={element} fnRetrive={this.retriveRevision} fnDelete={this.delRevision} canDL />
          </Tab>
        </Tabs>
      );
    }
    return (<div />);
  }

  renderGrid() {
    const { elements } = this.state;
    const els = orderBy(elements, ['is_active', 'label'], ['desc', 'asc']);
    return (<GenGridSg
      gridData={els}
      fnCopyKlass={this.copyKlass}
      fnDeActivateKlass={this.handleActivateKlass}
      fnEditKlass={this.editKlass}
      fnShowProp={this.handlePropShow}
    />);
  }

  render() {
    const { element, layerKey, user } = this.state;
    if (!user.generic_admin?.segments) {
      return <GenericAdminUnauth userName={user.name} text="GenericSegments" />;
    }
    const layer = (element && element.properties_template
      && element.properties_template.layers[layerKey]) || {};

    const sortedLayers = (element && element.properties_template && element.properties_template.layers && sortBy(element.properties_template.layers, l => l.position)) || [];

    return (
      <div className="generic-designer-container">
        <GenericAdminNav userName={user.name} text="GenericSegments" />
        <div className="main-content">
          <h3>Generic Segments Designer</h3>
          <Button bsStyle="primary" bsSize="xs" onClick={() => this.handleShowState('modal', 'NewKlass')}>
            New Segment&nbsp;<i className="fa fa-plus" aria-hidden="true" />
          </Button>
          { this.renderGrid() }
          { this.renderPropPanel() }
          <LayerAttrNewModal
            showModal={this.state.show.modal === 'NewLayer'}
            fnClose={this.closeModal}
            fnCreate={this.handleCreateLayer}
            isAttrOnWF
          />
          <LayerAttrEditModal
            showModal={this.state.show.modal === 'EditLayer'}
            layer={layer}
            fnClose={this.closeModal}
            fnUpdate={this.handleUpdateLayer}
            isAttrOnWF
          />
          <AttrNewModal
            content="Segment"
            showModal={this.state.show.modal === 'NewKlass'}
            klasses={this.state.klasses}
            fnClose={this.closeModal}
            fnCreate={this.handleCreateKlass}
          />
          <AttrEditModal
            content="Segment"
            showModal={this.state.show.modal === 'EditKlass'}
            element={this.state.element}
            klasses={this.state.klasses}
            fnClose={this.closeModal}
            fnDelete={this.handleDeleteKlass}
            fnActivate={this.handleActivateKlass}
            fnUpdate={this.handleUpdateKlass}
          />
          <FieldCondEditModal
            showModal={this.state.show.modal === 'FieldCond'}
            layer={layer}
            allLayers={sortedLayers}
            layerKey={this.state.layerKey}
            updSub={this.updSubField}
            updLayer={this.updLayerSubField}
            field={this.state.fieldObj}
            element={this.state.element}
            fnClose={this.closeModal}
          />
          <AttrCopyModal
            content="Segment"
            showModal={this.state.show.modal === 'CopyKlass'}
            element={this.state.element}
            klasses={this.state.klasses}
            fnClose={this.closeModal}
            fnCopy={this.handleCreateKlass}
          />
          <UploadModal
            content="Generic Segments"
            klass="SegmentKlass"
            showModal={this.state.show.modal === 'Upload'}
            fnClose={this.closeModal}
            fnUpload={this.handleUploadTemplate}
          />
          <WorkflowModal
            show={this.state.show.modal === 'Workflow'}
            element={this.state.element}
            fnClose={this.closeModal}
            fnSaveFlow={this.saveFlow}
          />
        </div>
        <Notifications />
        <LoadingModal />
      </div>
    );
  }
}

const GenericSegmentsAdminDnD = DragDropContext(HTML5Backend)(GenericSegmentsAdmin);
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('GenericSegmentsAdmin');
  if (domElement) ReactDOM.render(<GenericSegmentsAdminDnD />, domElement);
});
