import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'react-bootstrap';

const ContactEmail = (props) => {
  const handleSendEmail = () => {
    window.location.href = `mailto:${props.email}`;
  };

  return (
    <Button bsSize="small" onClick={handleSendEmail}>
      <i className="fa fa-envelope-o" aria-hidden="true" />{` ${props.label}`}
    </Button>
  );
};

ContactEmail.propTypes = {
  label: PropTypes.string,
  email: PropTypes.string,
};

ContactEmail.defaultProps = { label: 'Contact Us', email: 'chemotion-repository@lists.kit.edu' };

export default ContactEmail;
