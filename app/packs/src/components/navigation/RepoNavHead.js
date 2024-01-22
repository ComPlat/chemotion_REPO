import React from 'react';
import { NavDropdown, Navbar, MenuItem } from 'react-bootstrap';

const Title = (
  <span>
    <img alt="chemotion-" src="/images/repo/Repository_logo.png" style={{ width: '20%' }} />
    {' '}
    Repository
  </span>
);

function NavHead() {
  return (
    <Navbar.Brand>
      <NavDropdown title={Title} className="navig-brand navig-smaller-font" id="bg-nested-dropdown-brand">
        <MenuItem eventKey="21" href="/home/welcome/">
          Home
        </MenuItem>
        <MenuItem eventKey="22" href="/home/publications">
          Publications
        </MenuItem>
        <MenuItem eventKey="23" href="/home/about">
          About
        </MenuItem>
        <MenuItem eventKey="24" href="/home/directive">
          Directive
        </MenuItem>
        <MenuItem eventKey="25" href="/home/preservation">
          Preservation Strategy
        </MenuItem>
      </NavDropdown>
    </Navbar.Brand>
  );
}

NavHead.propTypes = {
};

export default NavHead;
