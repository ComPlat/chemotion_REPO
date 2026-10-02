import React from 'react'
import { NavDropdown, Navbar, Dropdown } from 'react-bootstrap';

const Title = <span><img alt="chemotion-" src="/images/repo/logo.png" style={{ width: '20%' }} /> Repository</span>

const NavHead = () => {
  const isHome = window.location.href.match(/\/home/)
  return(
    <Navbar.Brand>
      <NavDropdown title={Title} className="navig-brand navig-smaller-font" id="bg-nested-dropdown-brand">
        <Dropdown.Item eventKey="21" href="/home/welcome/">
          Home
        </Dropdown.Item>
        <Dropdown.Item eventKey="22" href="/home/publications">
          Publications
        </Dropdown.Item>
        <Dropdown.Item eventKey="23" href="/home/about">
          About
        </Dropdown.Item>
        <Dropdown.Item eventKey="24" href="/home/directive">
          Directive
        </Dropdown.Item>
      </NavDropdown>
    </Navbar.Brand>
  )
}

export default NavHead;
