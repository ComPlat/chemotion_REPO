import React, {Component} from 'react';
import {Col, FormControl,FormGroup, ControlLabel} from 'react-bootstrap';
import Select from 'react-select'
import ContainerDatasets from '../components/ContainerDatasets';
import QuillViewer from '../components/QuillViewer'

import {sampleAnalysesContentSymbol} from '../components/utils/quillToolbarSymbol'
import {confirmOptions} from '../components/staticDropdownOptions/options';

export default class ContainerComponent extends Component {
  constructor(props) {
    super();
    const {container} = props;
    this.state = {
      container
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      container: nextProps.container
    });
  }



  render() {
    const {container} = this.state;

    let quill = (
        <QuillViewer value={container.extended_metadata['content']} />
      )


    return (
      <div className="small-p">
        {/* <Col md={4}>
          <label>Name</label>
          <FormControl
            type="text"
            label="Name"
            value={container.name || '***'}
            disabled/>
        </Col>
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Type</label>
            <Select
              name='kind'
              multi={false}
              options={kindOptions}
              value={container.extended_metadata['kind']}
              disabled

              />
          </div>
        </Col>
        <Col md={4}>
          <div style={{marginBottom: 11}}>
            <label>Status</label>
            <Select
              name='status'
              multi={false}
              options={confirmOptions}
              value={container.extended_metadata['status']}
              disabled

            />
          </div>
        </Col> */}
        {/* <Col md={12}>
        <FormGroup>
          <ControlLabel>Content</ControlLabel>
          {quill}
        </FormGroup>
          <FormGroup>
            <ControlLabel>Description</ControlLabel>
            <FormControl
              componentClass="textarea"
              label="Description"
              value={container.description || ''}
              disabled
              />
          </FormGroup>
        </Col> */}
        <Col md={12}>
          <label>Datasets</label>
          <ContainerDatasets
            container={container}
            readOnly
            disabled
            onChange={container => this.props.onChange(container)}
            />
        </Col>
      </div>
    );
  }
}
