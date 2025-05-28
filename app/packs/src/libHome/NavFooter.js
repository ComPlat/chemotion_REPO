import Aviator from 'aviator';
import React from 'react';
import { Nav, NavItem } from 'react-bootstrap';

function NavFooter() {
  const navItems = [
    { key: 'home', label: 'Home', path: '/home', eventKey: '21' },
    {
      key: 'publications',
      label: 'Publications',
      path: '/home/publications',
      eventKey: '22',
    },
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
    <Nav justified style={{ margin: 0 }}>
      {navItems.map(item => (
        <NavItem
          key={item.key}
          eventKey={item.eventKey}
          role="button"
          tabIndex={0}
          onClick={() => handleNavigation(item.path)}
        >
          {item.label}
        </NavItem>
      ))}
    </Nav>
  );
}

export default NavFooter;
