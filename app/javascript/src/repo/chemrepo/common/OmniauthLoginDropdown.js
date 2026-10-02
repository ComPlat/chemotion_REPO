import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';

const omniauthLabel = (icon, name) => {
  if (icon) {
    return <img src={`/images/providers/${icon}`} alt={name} title={name} />;
  }
  return name;
};

const OmniauthLoginDropdown = ({
  providers,
  size,
  variant,
  className,
  toggleClassName,
  toggleStyle,
  toggleLabel,
  toggleId,
}) => {
  const keys = providers ? Object.keys(providers) : [];
  if (keys.length === 0) return null;

  return (
    <Dropdown className={className}>
      <Dropdown.Toggle
        size={size}
        variant={variant}
        id={toggleId}
        className={toggleClassName}
        style={toggleStyle}
      >
        {toggleLabel}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {keys.map((key) => {
          const provider = providers[key];
          const label = provider.label || key;
          return (
            <Dropdown.Item
              key={key}
              href={`/users/auth/${key}`}
              className="d-flex align-items-center gap-2"
            >
              {omniauthLabel(provider.icon, label)}
              <span>{label}</span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
};

OmniauthLoginDropdown.propTypes = {
  providers: PropTypes.objectOf(
    PropTypes.shape({
      icon: PropTypes.string,
      label: PropTypes.string,
    })
  ),
  size: PropTypes.string,
  variant: PropTypes.string,
  className: PropTypes.string,
  toggleClassName: PropTypes.string,
  toggleStyle: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  toggleLabel: PropTypes.node,
  toggleId: PropTypes.string,
};

OmniauthLoginDropdown.defaultProps = {
  providers: {},
  size: undefined,
  variant: 'primary',
  className: '',
  toggleClassName: '',
  toggleStyle: undefined,
  toggleLabel: 'Login\u2026',
  toggleId: 'omniauth-login-toggle',
};

export default OmniauthLoginDropdown;
