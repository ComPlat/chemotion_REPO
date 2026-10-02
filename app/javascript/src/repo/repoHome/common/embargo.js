import React, { Component } from 'react';
import { Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import Select from 'react-select';
import DropdownButtonSelection from 'src/repo/others/DropdownButtonSelection';

const LicenseLegalCode = (cp) => {
  let presentLicense = 'Creative Commons Attribution-ShareAlike 4.0 International License';
  let presentHref = 'https://creativecommons.org/licenses/by-sa/4.0/legalcode';
  switch (cp) {
    case 'CC BY-SA':
      presentLicense = 'Creative Commons Attribution-ShareAlike 4.0 International License';
      presentHref = 'https://creativecommons.org/licenses/by-sa/4.0/legalcode';
      break;
    case 'CC BY':
      presentLicense = 'Creative Commons Attribution 4.0 International License';
      presentHref = 'https://creativecommons.org/licenses/by/4.0/legalcode';
      break;
    case 'CC0':
      presentLicense = 'CC0 1.0 Universal';
      presentHref = 'https://creativecommons.org/publicdomain/zero/1.0/legalcode';
      break;
    case 'No License':
      presentLicense = 'No License';
      presentHref = '';
      break;
    default:
      break;
  }
  return <span><b>{presentLicense}</b>&nbsp;{presentHref === '' ? null : <a rel="noreferrer noopener" target="_blank" href={presentHref}>View Legal Code</a>}</span>;
};

class EmbargoCom extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShow: false
    };
    this.handleEmbargoChange = this.handleEmbargoChange.bind(this);
  }

  handleEmbargoChange(e) {
    this.props.onEmbargoChange(e.value);
  }

  handleLicenseChange(e) {
    this.props.onLicenseChange(e.value);
  }

  handleCC0ConsentChange(e, type) {
    this.props.onCC0ConsentChange(e.target.checked, type);
  }

  render() {
    const defaultBundles = [
      { value: '-1', name: 'no', label: 'No embargo' },
      { value: '0', name: 'new', label: '--Create a new Embargo Bundle--' },
    ];
    const licenses = [
      { name: 'CC BY-SA', value: 'CC BY-SA', label: 'CC BY-SA' },
      { name: 'CC BY', value: 'CC BY', label: 'CC BY' },
      { name: 'CC0', value: 'CC0', label: 'CC0' },
      { name: 'No License', value: 'No License', label: 'No License' }
    ];

    const bundles = defaultBundles.concat(this.props.opts);
    const description = [
      'Please use the embargo if you do not wish your data to be published as soon as they are  processed but want to release them yourself at a later stage.',
      'Please use one bundle for data that belongs to the same publication.',
      'If you create data for more than one publication, please take care that you assign the data to the right bundle.'
    ].join(' ');
    const { isShow } = this.state;
    const embargoDesc = isShow ? (
      <div style={{
        padding: '10px', backgroundColor: '#dfdfdf', borderRadius: '3px', width: '100%'
      }}
      >
        <b>Embargo Bundle</b>&#58;&nbsp;{description}
      </div>
    ) : (null);

    const cc0Consent1 = 'I hereby waive all copyright and related or neighboring rights together with all associated claims and causes of action with respect to this work to the extent possible under the law.';
    const cc0Consent2 = 'I have read and understand the terms and intended legal effect of CC0, and hereby voluntarily elect to apply it to this work.';
    const deed = (
      <div style={{
        padding: '10px', borderRadius: '3px', borderColor: 'darkred', borderStyle: 'solid', borderWidth: 'thin', width: '100%'
      }}
      >
        {LicenseLegalCode(this.props.selectedLicense)}
        {
        (this.props.selectedLicense === 'CC0' && !this.props.disableLicense) ?
          (
            <div stye={{ width: '100%' }}>
              <Form.Check
                type="checkbox"
                checked={this.props.cc0Deed.consent1}
                onChange={e => this.handleCC0ConsentChange(e, 'consent1')}
                label={cc0Consent1}
              />
              <Form.Check
                type="checkbox"
                checked={this.props.cc0Deed.consent2}
                onChange={e => this.handleCC0ConsentChange(e, 'consent2')}
                label={cc0Consent2}
              />
            </div>
          )
          :
          (null)
      }
      </div>
    );

    return (
      <div>
        <Form horizontal style={{ display: 'flex', alignItems: 'center', marginBottom: 15 }}>
          <div style={{ width: '30%', textAlign: 'right', paddingRight: 5 }}>
            <Form.Label className="mb-0">
              {this.props.disableLicense ? 'Licence (from Previous Version)' : 'Choose license'}
            </Form.Label>
          </div>
          <div style={{ width: '20%' }}>
            <Select
              value={licenses.find(l => l.value === this.props.selectedLicense)}
              onChange={e => this.handleLicenseChange(e)}
              options={licenses}
              className="select-assign-collection"
              clearable={false}
              disabled={this.props.disableLicense}
            />
          </div>
          <div style={{ width: '30%', textAlign: 'right', paddingRight: 5 }}>
            <Form.Label className="mb-0">Publish with Embargo Bundle</Form.Label>
            <span role="button" style={{ paddingLeft: 5 }} onClick={() => this.setState({ isShow: !isShow })}>
              <i className="fa fa-question-circle" aria-hidden="true" />
            </span>
          </div>
          <div style={{ width: '20%' }}>
            <Select
              value={bundles.find(b => b.value === this.props.selectedValue)}
              onChange={e => this.handleEmbargoChange(e)}
              options={bundles}
              className="select-assign-collection"
              clearable={false}
            />
          </div>
        </Form>
        {embargoDesc}
        {deed}
      </div >
    );
  }
}

EmbargoCom.propTypes = {
  opts: PropTypes.array,
  selectedValue: PropTypes.string.isRequired,
  onEmbargoChange: PropTypes.func.isRequired,
  selectedLicense: PropTypes.string,
  onLicenseChange: PropTypes.func.isRequired,
  onCC0ConsentChange: PropTypes.func.isRequired,
  cc0Deed: PropTypes.shape({
    consent1: PropTypes.bool.isRequired,
    consent2: PropTypes.bool.isRequired
  })
};

EmbargoCom.defaultProps = {
  opts: [],
  selectedLicense: 'CC BY-SA',
  cc0Deed: { consent1: false, consent2: false }
};

const PublishTypeAs = props => (
  <div className="d-inline-flex align-items-center gap-2">
    <OverlayTrigger placement="bottom" overlay={<Tooltip id="tip_publish_as">Choose the publication type as Full or Scheme-Only</Tooltip>}>
      <i className="fa fa-question-circle" aria-hidden="true" />
    </OverlayTrigger>
    <DropdownButtonSelection
      options={props.options}
      selected={props.selected}
      disabled={props.disabled}
      placeholder="Select publication type..."
      onSelect={e => props.onChange(e)}
    />
  </div>
);

PublishTypeAs.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string),
  selected: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

PublishTypeAs.defaultProps = {
  options: [],
  selected: 'full',
};

export { EmbargoCom, PublishTypeAs };
