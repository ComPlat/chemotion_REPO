import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Checkbox, FormGroup, FormControl, InputGroup, ControlLabel,
  Table, Glyphicon, Tabs, Tab, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import Select from 'react-select';
// import DetailActions from '../actions/DetailActions';
// import NumeralInputWithUnitsCompo from '../NumeralInputWithUnitsCompo';
// import TextRangeWithAddon from '../TextRangeWithAddon';
// import PrivateNoteElement from '../PrivateNoteElement';

export default class SampleFormCriteria extends React.Component {
  constructor(props) {
    super(props);
  }


  stereoAbsInput() {
    const { sample } = this.props;

    const absOptions = [
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

    const value = sample.stereo ? sample.stereo.abs : 'any';

    return (
      <FormGroup style={{ width: '50%', paddingRight: '10px' }}>
        <ControlLabel>Stereo Abs</ControlLabel>
        <Select
          name="stereoAbs"
          clearable={false}
          disabled={!sample.can_update}
          options={absOptions}
          onChange={this.updateStereoAbs}
          value={value}
        />
      </FormGroup>
    );
  }

  stereoRelInput() {
    const { sample, onChange } = this.props;

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

    const value = sample.stereo ? sample.stereo.rel : 'any';

    return (
      <FormGroup style={{ width: '50%' }}>
        <ControlLabel>Stereo Rel</ControlLabel>
        <Select
          name="stereoRel"
          clearable={false}
          disabled={!sample.can_update}
          options={relOptions}
          onChange={this.updateStereoRel}
          value={value}
        />
      </FormGroup>
    );
  }

  render() {
    return (
      <Table responsive className="sample-form">
        <tbody>
          <tr>
            <td colSpan="4">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '70%', display: 'flex' }}>
                  {this.stereoAbsInput()}
                  {this.stereoRelInput()}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }

}

SampleFormCriteria.propTypes = {
  sample: PropTypes.object,
  parent: PropTypes.object,
  customizableField: PropTypes.func.isRequired,
  enableSampleDecoupled: PropTypes.bool,
  decoupleMolecule: PropTypes.func.isRequired
};

SampleFormCriteria.defaultProps = { enableSampleDecoupled: false };
