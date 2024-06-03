import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import ContactEmail from 'src/components/chemrepo/core/ContactEmail';

const sessSysInfoClosed = 'infoBarClosed';
const infoLink = (href, text) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ color: '#1890ff' }}
    >
      {text}
    </a>
  );
};

function SysInfo() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const closed = sessionStorage.getItem(sessSysInfoClosed);
    if (closed === 'true') {
      setShow(false);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem(sessSysInfoClosed, 'true');
  };

  return (
    show && (
      <div
        role="alert"
        className="alert alert-info"
        style={{ marginBottom: 'unset' }}
      >
        <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          <i
            className="fa fa-bullhorn"
            aria-hidden="true"
            style={{ marginRight: '10px' }}
          >
            {' '}
            &#41;&#41;&#41;
          </i>
          <div
            style={{
              display: 'flex',
              flexGrow: '1',
              marginRight: '20px',
            }}
          >
            <div style={{ flexGrow: '1', fontWeight: 'bold' }}>
              <span>
                New to the Repository? Check the{' '}
                {infoLink(
                  'https://chemotion.net/docs/repo/settings_preparation',
                  'Settings and Preparation'
                )}{' '}
                guide.{' '}
              </span>
              <span>
                Starting your research? Review our{' '}
                {infoLink(
                  'https://www.chemotion.net/docs/repo/workflow/new',
                  'How to provide data'
                )}{' '}
                instructions.{' '}
              </span>
              <span>
                Learn more in{' '}
                {infoLink('https://www.chemotion.net/docs/repo', 'How-To')}{' '}
                section, and feel free to reach out via{' '}
                <ContactEmail label="" size="xs" />
                {' or '}
                <Button
                  bsSize="xs"
                  onClick={() =>
                    window.open(
                      'https://github.com/ComPlat/chemotion_REPO',
                      '_blank'
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
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button bsSize="xs" bsStyle="info" onClick={handleClose}>
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
