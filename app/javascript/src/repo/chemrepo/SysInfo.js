import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import ContactEmail from 'src/repo/chemrepo/core/ContactEmail';

const sessSysInfoClosed = 'infoBarClosed';
const infoLink = (href, text) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {text}
    </a>
  );
};

function SysInfo({ onClose }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const closed = sessionStorage.getItem(sessSysInfoClosed);
    if (closed === 'true') {
      setShow(false);
      if (onClose) onClose();
    }
  }, [onClose]);

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem(sessSysInfoClosed, 'true');
    if (onClose) onClose();
  };

  return (
    show && (
      <div role="alert" className="alert alert-info mb-0">
        <div className="d-flex align-items-center w-100">
          <i className="fa fa-bullhorn me-3" aria-hidden="true">
            {' '}
            &#41;&#41;&#41;
          </i>
          <div className="d-flex flex-grow-1">
            <div className="flex-grow-1 fw-bold">
              <span>
                New to the Repository? Check the{' '}
                {infoLink(
                  'https://chemotion.net/docs/repo/settings_preparation',
                  'Settings and Preparation',
                )}{' '}
                guide.{' '}
              </span>
              <span>
                Starting your research? Review our{' '}
                {infoLink(
                  'https://www.chemotion.net/docs/repo/workflow/new',
                  'How to provide data',
                )}{' '}
                instructions.{' '}
              </span>
              <span>
                Learn more in{' '}
                {infoLink('https://www.chemotion.net/docs/repo', 'How-To')}{' '}
                section, and feel free to reach out via{' '}
                <ContactEmail label="" size="xsm" />
                {' or '}
                <Button
                  variant='outline-primary'
                  size="xsm"
                  onClick={() =>
                    window.open(
                      'https://github.com/ComPlat/chemotion_REPO',
                      '_blank',
                    )
                  }
                >
                  <img
                    src="/images/repo/mark-github.svg"
                    className="pubchem-logo"
                    alt="Chemotion Repository at GitHub"
                    title="Chemotion Repository at GitHub"
                  />
                </Button>
              </span>
            </div>
            <div className="d-flex justify-content-end">
              <Button size="xsm" variant="info" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  );
}

export default SysInfo;
