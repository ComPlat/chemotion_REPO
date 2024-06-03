import React from 'react';
import NavFooter from 'src/libHome/NavFooter';

function Footer() {
  return (
    <footer
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        zIndex: '1000',
        backgroundColor: 'white',
        minHeight: '20px',
        display: 'flex',
        fontSize: '12px',
      }}
    >
      <NavFooter />
    </footer>
  );
}

export default Footer;
