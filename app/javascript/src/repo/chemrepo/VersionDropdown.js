/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { isNil } from 'lodash';

const VersionDropdown = (props) => {
  const { type, element, versions, onChange } = props;
  const elementVersions = versions || element.versions;
  const display = !isNil(elementVersions) && elementVersions.filter((element) => !isNil(element)).length > 1;

  if (display) {
    return (
      <Dropdown
        id={`version-dropdown-${type}-${element.id}`}
        style={{ marginTop: 10 }}
      >
        <Dropdown.Toggle size="sm">
          Select a different Version of this {type.toLowerCase()}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {elementVersions
            .filter(el => !isNil(el))
            .map(version => (
              <Dropdown.Item
                key={version.id}
                onClick={() => onChange(version)}
                active={element.id === version.id}
                className="version-dropdown-item"
              >
                {version.doi}
              </Dropdown.Item>
            ))}
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  return null;
};

VersionDropdown.propTypes = {
  type: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  versions: PropTypes.array,
  onChange: PropTypes.func.isRequired,
};

VersionDropdown.defaultProps = {
  versions: null,
};

export default VersionDropdown;
