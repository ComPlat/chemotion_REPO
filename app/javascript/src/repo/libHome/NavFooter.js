import Aviator from 'aviator';
import React from 'react';
import { Nav, NavItem } from 'react-bootstrap';

function NavFooter() {
  const navItems = [
    { key: 'about', label: 'About', path: '/home/about', eventKey: '23' },
    {
      key: 'directive',
      label: 'Directive',
      path: '/home/directive',
      eventKey: '24',
    },
    {
      key: 'preservation',
      label: 'Preservation Strategy',
      path: '/home/preservation',
      eventKey: '25',
    },
    { key: 'imprint', label: 'Imprint', path: '/home/imprint', eventKey: '26' },
    { key: 'privacy', label: 'Privacy', path: '/home/privacy', eventKey: '27' },
  ];

  const handleNavigation = path => {
    Aviator.navigate(path);
  };

  return (
    <Nav fill className="nav-footer-even">
      {navItems.map(item => (
        <NavItem
          key={item.key}
          eventKey={item.eventKey}
          className="white-nav-item nav-footer-item"
          role="button"
          tabIndex={0}
          onClick={() => handleNavigation(item.path)}
        >
          <span>{item.label}</span>
        </NavItem>
      ))}
    </Nav>
  );
}

export default NavFooter;
