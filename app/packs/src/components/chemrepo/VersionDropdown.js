import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, MenuItem } from 'react-bootstrap';
import { isEmpty } from 'lodash';

import PublicActions from '../actions/PublicActions';

const VersionDropdown = (props) => {
  const { type, element } = props;

  const display = !isEmpty(element.versions);

  if (display) {
    return (
      <Dropdown pullRight>
        <Dropdown.Toggle bsSize="xsmall">
          Versions
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {
            element.versions.map((version) => {
              const versionId = (type === 'Reaction') ? version.reaction_id : version.sample_id;
              return (
                <MenuItem
                  key={versionId}
                  onSelect={() => PublicActions.selectVersion(type, version)}
                  active={(element.id === versionId)}
                >
                  {version.doi}
                </MenuItem>
              );
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
