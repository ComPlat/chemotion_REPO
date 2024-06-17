import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, MenuItem } from 'react-bootstrap';
import { isNil } from 'lodash';

import PublicActions from '../actions/PublicActions';

const VersionDropdown = (props) => {
  const { type, element, onChange } = props;
  const display = !isNil(element.versions) && element.versions.filter((element) => !isNil(element)).length > 1;

  if (display) {
    return (
      <Dropdown id={`version-dropdown-${type}-${element.id}`} style={{ marginTop: 10 }}>
        <Dropdown.Toggle bsSize="xsmall">
          Select a different Version of this {type.toLowerCase()}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {
            element.versions.filter((element) => !isNil(element)).map((version) => {
              const versionId = isNil(version.id) ? version.sample_id : version.id;
              const doi = version.taggable_data ? version.taggable_data.doi : version.doi;

              if (doi) {
                return (
                  <MenuItem
                    key={versionId}
                    onSelect={() => onChange(version)}
                    active={(element.id === versionId)}
                    className="version-dropdown-item"
                  >
                    {doi.full_doi || doi}
                  </MenuItem>
                );
              }

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
  element: PropTypes.oneOf(['sample', 'reaction']).isRequired,
  onChange: PropTypes.func.isRequired
};

export default VersionDropdown;
