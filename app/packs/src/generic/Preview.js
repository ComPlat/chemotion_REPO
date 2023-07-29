/* eslint-disable camelcase */
/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Badge, Col } from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import { GenInterface, GenButtonConfirm, GenButtonTooltip } from 'chem-generic-ui';
import LoadingActions from '../components/actions/LoadingActions';
import Utils from '../components/utils/Functions';

export default class Preview extends Component {
  constructor(props) {
    super(props);
    this.state = { revisions: [], compareUUID: 'current', fullScreen: false };
    this.compare = this.compare.bind(this);
    this.setRevision = this.setRevision.bind(this);
    this.delRevision = this.delRevision.bind(this);
    this.retriveRevision = this.retriveRevision.bind(this);
    this.handleChanged = this.handleChanged.bind(this);
    this.dlRevision = this.dlRevision.bind(this);
    this.setScreen = this.setScreen.bind(this);
  }

  componentDidMount() {
    if (this.props.revisions) {
      this.setRevision(cloneDeep(this.props.revisions));
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.revisions !== prevProps.revisions) {
      this.setRevision(cloneDeep(this.props.revisions));
    }
  }

  setRevision(revisions) {
    this.setState({ revisions });
  }

  setScreen(fullScreen) {
    this.setState({ fullScreen });
  }

  compare(params) {
    LoadingActions.start();
    this.setState(
      { revisions: cloneDeep(this.props.revisions), compareUUID: params.uuid },
      LoadingActions.stop()
    );
  }

  delRevision(params) {
    this.props.fnDelete(params);
  }

  retriveRevision(params) {
    const { fnRetrive, src } = this.props;
    LoadingActions.start();
    const deep = cloneDeep(this.props.revisions.find(r => r.id === params.id));
    fnRetrive(deep[src], () => LoadingActions.stop());
  }

  dlRevision(params) {
    const { element, revisions } = this.props;
    LoadingActions.start();
    const revision = revisions.find(r => r.id === params.id);
    const props = revision.properties_release;
    props.klass = revision.properties_release.klass;
    props.released_at = revision.released_at || '';
    const href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(revision.properties_release))}`;
    Utils.downloadFile({ contents: href, name: `${props.klass}_${element.label}_${revision.uuid}.json` });
    LoadingActions.stop();
  }

  handleChanged(el) {
    const { compareUUID, revisions } = this.state;
    const { src } = this.props;
    let selected = (revisions || []).find(r => r.uuid === compareUUID);
    if (selected && selected[src]) {
      selected = el;
      this.setRevision(revisions);
    }
  }

  render() {
    const { compareUUID, revisions, fullScreen } = this.state;
    if (revisions.length < 1) return null;
    const { src, canDL } = this.props;
    const t = (v, idx) => {
      const s = v.uuid === compareUUID ? 'generic_block_select' : '';
      const ver = v.released_at ? `version: ${v.uuid}` : 'version:';
      let at = v.released_at ? `released at: ${v.released_at} (UTC)` : '(Work In Progress)';
      if (src === 'properties') {
        at = `saved at: ${v.released_at} (UTC)`;
      }

      const del = (v.released_at && idx > 1) ? <GenButtonConfirm msg="Delete this version permanently?" fnClick={this.delRevision} fnParams={{ id: v.id }} bs="default" place="top" /> : null;
      const ret = v.released_at ? <GenButtonConfirm msg="Retrieve this version?" fnClick={this.retriveRevision} fnParams={{ id: v.id }} fa="fa-reply" bs="default" place="top" /> : null;
      const dl = canDL ? <GenButtonTooltip tip="Download this version" fnClick={this.dlRevision} element={{ id: v.id }} fa="fa-download" place="top" bs="default" /> : null;
      return (
        <div className={`generic_version_block ${s}`} key={v.uuid}>
          <div><div style={{ width: '100%' }}>{ver}</div><div style={{ fontSize: '0.8rem' }}>#{(idx + 1)}</div></div>
          <div>
            <div style={{ width: '100%' }}>{at}</div>
            {del}
            {dl}
            {ret}
            <GenButtonTooltip tip="Preview this version" fnClick={this.compare} element={{ uuid: v.uuid }} fa="fa-clock-o" place="top" bs="default" />
          </div>
        </div>
      );
    };
    const options = [];
    const selected = (revisions || []).find(r => r.uuid === compareUUID) || {};
    const selectOptions = (selected && selected[src] && selected[src].select_options) || {};

    if (selected.name) {
      options.push({
        generic: selected, type: 'text', isEditable: true, isRequire: false, field: 'name'
      });
    }

    selected[src] = selected[src] || {};
    selected[src].layers = selected[src].layers || {};
    if (src === 'properties') {
      selected.properties_release = { select_options: selectOptions };
    } else { selected.properties = selected.properties_release; }

    const layersLayout = (
      <GenInterface
        generic={selected || {}}
        fnChange={this.handleChanged}
        extLayers={options}
        genId={selected.uuid || 0}
        isPreview
        isActiveWF={false}
      />
    );

    const his = fullScreen ? null : (<Col md={4}>{revisions.map((r, idx) => (t(r, idx)))}</Col>);
    const contentCol = fullScreen ? 12 : 8;
    const screenFa = fullScreen ? 'compress' : 'expand';
    return (
      <div>
        {his}
        <Col md={contentCol}>
          <div style={{ margin: '10px 0px' }}>
            <div style={{ float: 'right' }}><GenButtonTooltip tip={screenFa} fnClick={this.setScreen} element={!this.state.fullScreen} fa={`fa-${screenFa}`} place="left" bs="default" /></div>
            <Badge style={{ backgroundColor: '#ffc107', color: 'black' }}><i className="fa fa-exclamation-circle" aria-hidden="true" />&nbsp;Sketch Map, the data input here will not be saved.</Badge>
          </div>
          <div style={{ width: '100%', minHeight: '50vh' }}>{layersLayout}</div>
        </Col>
      </div>
    );
  }
}

Preview.propTypes = {
  revisions: PropTypes.array,
  fnRetrive: PropTypes.func,
  fnDelete: PropTypes.func,
  canDL: PropTypes.bool,
  src: PropTypes.oneOf(['properties_release', 'properties'])
};

Preview.defaultProps = {
  revisions: [], fnRetrive: () => {}, fnDelete: () => {}, src: 'properties_release', canDL: false
};
