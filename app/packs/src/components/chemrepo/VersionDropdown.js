/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, MenuItem } from 'react-bootstrap';
import { isNil } from 'lodash';

const VersionDropdown = (props) => {
  const { type, element, versions, onChange } = props;
  const elementVersions = versions || element.versions
  const display = !isNil(elementVersions) && elementVersions.filter((element) => !isNil(element)).length > 1;

  if (display) {
    return (
      <Dropdown id={`version-dropdown-${type}-${element.id}`} style={{ marginTop: 10 }}>
        <Dropdown.Toggle bsSize="xsmall">
          Select a different Version of this {type.toLowerCase()}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {
            elementVersions.filter((element) => !isNil(element)).map((version) => {
              // const versionId = isNil(version.id) ? version.sample_id : version.id;
              // const doi = version.taggable_data ? version.taggable_data.doi : (version.doi || version.dataset_doi);

              return (
                <MenuItem
                  key={version.id}
                  onSelect={() => onChange(version)}
                  active={(element.id === version.id)}
                  className="version-dropdown-item"
                >
                  {version.doi}
                </MenuItem>
              );


              return null;
            })
          }
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  return null;
};

VersionDropdown.propTypes = {
  type: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default VersionDropdown;
