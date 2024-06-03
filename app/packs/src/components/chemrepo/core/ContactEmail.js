import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'react-bootstrap';

function ContactEmail(props) {
  const { label, email, size } = props;
  const handleSendEmail = () => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <Button bsSize={size} onClick={handleSendEmail}>
      <i className="fa fa-envelope-o" aria-hidden="true" />
      {` ${label}`}
    </Button>
  );
}

ContactEmail.propTypes = {
  label: PropTypes.string,
  email: PropTypes.string,
  size: PropTypes.string,
};

ContactEmail.defaultProps = {
  label: 'Contact Us',
  email: 'chemotion-repository@lists.kit.edu',
  size: 'small',
};

export default ContactEmail;
