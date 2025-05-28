import React from 'react';
import { ButtonGroup, DropdownButton, MenuItem } from 'react-bootstrap';

const menuItemStyle = { minHeight: '32px', padding: '6px 16px' };
const spanStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const menuItems = [
  {
    eventKey: '1',
    label: 'News',
    onClick: () =>
      window.open(
        'https://www.chemotion-repository.net/home/newsroom',
        '_blank',
        'noopener,noreferrer'
      ),
  },
  {
    eventKey: '2',
    label: 'Documentation',
    onClick: () =>
      window.open(
        'https://www.chemotion.net/docs/repo',
        '_blank',
        'noopener,noreferrer'
      ),
  },
  {
    divider: true,
  },
  {
    eventKey: '3',
    label: 'Contact Us',
    onClick: () => {
      window.location.href = 'mailto:chemotion-repository@lists.kit.edu';
    },
  },
];

const InfoSupportDropdown = () => (
  <ButtonGroup className="navCalendarButton">
    <DropdownButton
      title={
        <span>
          <i className="fa fa-info-circle" /> Info & Support
        </span>
      }
      id="bg-nested-dropdown"
      style={menuItemStyle}
      menuStyle={{ minWidth: '180px' }}
    >
      {menuItems.map((item, idx) =>
        item.divider ? (
          // eslint-disable-next-line react/no-array-index-key
          <MenuItem divider key={`divider-${idx}`} />
        ) : (
          <MenuItem
            eventKey={item.eventKey}
            style={menuItemStyle}
            onClick={item.onClick}
            key={item.eventKey}
          >
            <span style={spanStyle}>
              <span>{item.label}</span>
              <i className="fa fa-external-link" />
            </span>
          </MenuItem>
        )
      )}
    </DropdownButton>
  </ButtonGroup>
);

export default InfoSupportDropdown;
