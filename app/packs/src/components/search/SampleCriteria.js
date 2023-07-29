/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Col } from 'react-bootstrap';
import { findIndex } from 'lodash';
import { GenFormGroup, GenFormGroupCb, GenFormGroupSel, SegmentCriteria } from 'chem-generic-ui';
import { segmentsByKlass } from '../../generic/Utils';

const buildCriteria = (props) => {
  const { sample } = props;
  const { propTx, propCk, stereo } = sample;
  // if (!sample) return (<span />);
  const layout = [];
  const colNum = 3;

  const absOptions =  [
    { label: 'any', value: 'any' },
    { label: 'rac', value: 'rac' },
    { label: 'meso', value: 'meso' },
    { label: '(S)', value: '(S)' },
    { label: '(R)', value: '(R)' },
    { label: '(Sp)', value: '(Sp)' },
    { label: '(Rp)', value: '(Rp)' },
    { label: '(Sa)', value: '(Sa)' },
    { label: '(Ra)', value: '(Ra)' },
  ];

  const relOptions = [
    { label: 'any', value: 'any' },
    { label: 'syn', value: 'syn' },
    { label: 'anti', value: 'anti' },
    { label: 'p-geminal', value: 'p-geminal' },
    { label: 'p-ortho', value: 'p-ortho' },
    { label: 'p-meta', value: 'p-meta' },
    { label: 'p-para', value: 'p-para' },
    { label: 'cis', value: 'cis' },
    { label: 'trans', value: 'trans' },
    { label: 'fac', value: 'fac' },
    { label: 'mer', value: 'mer' },
  ];

  const la = (
    <div>
      <Row key="criteria_init">
        <Col md={colNum}><GenFormGroup label="Name" value={propTx && propTx.name} onChange={e => props.onChange(e, 'name', 'propTx')} /></Col>
        <Col md={colNum}><GenFormGroup label="External label" value={propTx && propTx.external_label} onChange={e => props.onChange(e, 'external_label', 'propTx')} /></Col>
        <Col md={colNum}><GenFormGroup label="Short Label" value={propTx && propTx.short_label} onChange={e => props.onChange(e, 'short_label', 'propTx')} /></Col>
        <Col md={colNum}><GenFormGroup label="Location" value={propTx && propTx.location} onChange={e => props.onChange(e, 'location', 'propTx')} /></Col>
        <Col md={colNum}><GenFormGroupSel label="Stereo Abs" value={stereo && stereo.abs} options={absOptions} onChange={e => props.onChange(e, 'abs', 'stereo')} /></Col>
        <Col md={colNum}><GenFormGroupSel label="Stereo Rel" value={stereo && stereo.rel} options={relOptions} onChange={e => props.onChange(e, 'rel', 'stereo')} /></Col>
        <Col md={colNum}><GenFormGroupCb label="Top Secret" value={propCk && propCk.is_top_secret} onChange={e => props.onChange(e, 'is_top_secret', 'propCk')} /></Col>
        <Col md={colNum}><GenFormGroupCb label="Decoupled" value={propCk && propCk.decoupled} onChange={e => props.onChange(e, 'decoupled', 'propCk')} /></Col>
      </Row>
    </div>
  );

  layout.push(la);

  return (
    <div style={{ margin: '15px' }}>{layout}</div>
  );
};

export default class SampleCriteria extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sample: props.sample,
      segments: segmentsByKlass('sample')
    };
    this.onChange = this.onChange.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.onSegmentChange = this.onSegmentChange.bind(this);
  }

  onChange(e, field, type) {
    const { sample } = this.state;
    switch (type) {
      case 'propTx':
        if (!sample.propTx) sample.propTx = {};
        sample.propTx[field] = e.target && e.target.value;
        break;
      case 'select':
        if (!sample.propTx) sample.propTx = {};
        sample.propTx[field] = e ? e.value : null;
        break;
      case 'stereo':
        if (!sample.stereo) sample.stereo = {};
        console.log(e);
        console.log(e.value);
        sample.stereo[field] = e ? e.value : '';
        break;
      case 'propCk':
        if (!sample.propCk) sample.propCk = {};
        sample.propCk[field] = e.target && e.target.checked;
        break;
      default:
        break;
    }
    this.setState({ sample });
  }

  onSegmentChange(sg) {
    const { segments } = this.state;
    const idx = findIndex(segments, o => o.id === sg.id);
    segments.splice(idx, 1, sg);
    this.setState({ segments });
  }

  onSearch() {
    const { sample, segments } = this.state;
    sample.segments = segments;
    this.props.onSearch(sample);
  }

  render() {
    const { sample, segments } = this.state;
    const layout = [];

    const title = (
      <Row key="criteria_init">
        <Col md={12} style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: 'x-large' }}>
          Segments
        </Col>
      </Row>
    );

    (segments || []).forEach((seg) => {
      const igs = (
        <SegmentCriteria
          segment={seg}
          onChange={this.onSegmentChange}
        />
      );
      layout.push(igs);
    });

    return (
      <div className="search_criteria_mof">
        <div className="modal_body">
          {buildCriteria({ sample, onChange: this.onChange })}
          {title}
          {layout}
        </div>
        <div className="btn_footer">
          <Button bsStyle="warning" onClick={this.props.onHide}>
            Close
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={this.onSearch}>
            Search
          </Button>&nbsp;
        </div>
      </div >
    );
  }
}

SampleCriteria.propTypes = {
  sample: PropTypes.object,
  onHide: PropTypes.func,
  onSearch: PropTypes.func,
};

SampleCriteria.defaultProps = {
  sample: {},
  onHide: () => { },
  onSearch: () => { }
};
