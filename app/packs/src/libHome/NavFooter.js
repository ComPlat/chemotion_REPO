import Aviator from 'aviator';
import React from 'react';
import { Nav, NavItem } from 'react-bootstrap';

function NavFooter() {
  return (
    <Nav justified>
      <NavItem
        eventKey="21"
        role="button"
        tabIndex={0}
        onClick={() => Aviator.navigate('/home')}
      >
        Home
      </NavItem>
      <NavItem
        eventKey="22"
        role="button"
        tabIndex={-1}
        onClick={() => Aviator.navigate('/home/publications')}
      >
        Publications
      </NavItem>
      <NavItem
        eventKey="23"
        title="Item"
        role="button"
        tabIndex={-1}
        onClick={() => Aviator.navigate('/home/about')}
      >
        About
      </NavItem>
      <NavItem
        eventKey="24"
        role="button"
        tabIndex={-1}
        onClick={() => Aviator.navigate('/home/directive')}
      >
        Directive
      </NavItem>
      <NavItem
        eventKey="25"
        role="button"
        tabIndex={-1}
        onClick={() => Aviator.navigate('/home/preservation')}
      >
        Preservation Strategy
      </NavItem>
    </Nav>
  );
}

export default NavFooter;
