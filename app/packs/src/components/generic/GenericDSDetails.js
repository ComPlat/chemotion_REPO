/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { GenInterface, GenButtonReload, absOlsTermLabel } from 'chem-generic-ui';
import { LayerPlain } from 'chem-generic-ui-viewer';
import { Panel, ButtonToolbar } from 'react-bootstrap';

const elementalPropertiesItem = (genericDS, onChange, readOnly = false, isPublic = false) => {
  const { properties } = genericDS;
  const layersLayout = readOnly ?
    (<LayerPlain
      layers={properties.layers}
      options={properties.select_options || {}}
      id={properties.uuid}
      isPublic={isPublic}
    />) : (
      <GenInterface
        generic={genericDS}
        fnChange={onChange}
        isPreview={false}
        isActiveWF={false}
        fnNavi={() => {}}
      />
    );
  return (<div style={{ margin: '5px' }}>{layersLayout}</div>);
};

class GenericDSDetails extends Component {
  constructor(props) {
    super(props);
    this.handleReload = this.handleReload.bind(this);
  }

  handleReload(generic) {
    const { klass, onChange } = this.props;
    const genericDS = generic;
    if (genericDS) {
      genericDS.dataset_klass_id = klass.id;
      genericDS.klass_ols = klass.ols_term_id;
      genericDS.klass_label = klass.label;
    }
    onChange(genericDS);
  }

  render() {
    const {
      genericDS, kind, klass, onChange, readOnly, isPublic
    } = this.props;
    if (Object.keys(genericDS).length !== 0) {
      return (
        <Panel className="panel-detail generic-ds-panel">
          <Panel.Body>
            {elementalPropertiesItem(genericDS, onChange, readOnly, isPublic)}
            <span className="g-ds-note label">
              <span className="g-ds-title">Note</span><br />
              {readOnly ? null : (<>Selected analysis type: {absOlsTermLabel(kind)}<br /></>)}
              Content is designed for: {genericDS.klass_label}
            </span>
            {readOnly ?
              null : (
                <ButtonToolbar className="pull-right">
                  <GenButtonReload
                    klass={klass}
                    generic={genericDS}
                    fnReload={this.handleReload}
                  />
                </ButtonToolbar>
              )}
          </Panel.Body>
        </Panel>
      );
    }
    return null;
  }
}

GenericDSDetails.propTypes = {
  kind: PropTypes.string,
  genericDS: PropTypes.object,
  klass: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired,
  isPublic: PropTypes.bool,
};
GenericDSDetails.defaultProps = {
  kind: '',
  genericDS: {},
  klass: {},
  isPublic: false,
};

export default GenericDSDetails;
