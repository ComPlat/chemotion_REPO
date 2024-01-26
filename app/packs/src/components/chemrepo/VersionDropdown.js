import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, MenuItem } from 'react-bootstrap';
import { isEmpty } from 'lodash';

import PublicActions from '../actions/PublicActions';

const VersionDropdown = (props) => {
  const { type, element } = props;

  const display = !isEmpty(element.versions);

  const handleSelect = (version) => {
    if (type === 'Reaction') {
      PublicActions.displayReaction(version.id);
    } else {
      PublicActions.selectSampleVersion(version);
    }
  };

  if (display) {
    return (
      <Dropdown style={{ marginTop: 10 }}>
        <Dropdown.Toggle bsSize="xsmall">
          Select a different Version of this {type.toLowerCase()}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {
            element.versions.map((version) => {
              const versionId = (type === 'Reaction') ? version.id : version.sample_id;
              const doi = version.taggable_data ? version.taggable_data.doi : version.doi;

              if (doi) {
                return (
                  <MenuItem
                    key={versionId}
                    onSelect={() => handleSelect(version)}
                    active={(element.id === versionId)}
                    className="version-dropdown-item"
                  >
                    {doi}
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
};

export default VersionDropdown;
