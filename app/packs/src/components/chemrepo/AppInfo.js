import React from 'react';
import { Button } from 'react-bootstrap';
import ContactEmail from 'src/components/chemrepo/core/ContactEmail';

const topics = [
  {
    label: 'Settings & Preparation',
    url: 'https://chemotion.net/docs/repo/settings_preparation',
  },
  {
    label: 'Details & Standards',
    url: 'https://chemotion.net/docs/repo/details_standards',
  },
  {
    label: 'Review Process',
    url: 'https://chemotion.net/docs/repo/workflow/review',
  },
  {
    label: 'Citation & References',
    url: 'https://chemotion.net/docs/repo/references',
  },
  {
    label: 'Fundings & Awards',
    url: 'https://chemotion.net/docs/repo/fundings',
  },
];

const versionLinks = [
  {
    label: 'ELN',
    url: 'https://www.chemotion.net/docs/eln',
    version: () => window.APP_VERSION.eln_version || 'N/A',
  },
  {
    label: 'LabIMotion',
    url: 'https://www.chemotion.net/docs/labimotion',
    version: () => window.APP_VERSION.labimotion_version || 'N/A',
  },
  {
    label: 'Spectra Viewer APP',
    url: null,
    version: () => window.APP_VERSION.spectra_version || 'N/A',
  },
];

const AppInfo = () => (
  <div className="news-box">
    <div>
      <div style={{ marginBottom: '0.2em' }}>
        <strong>Popular Topics</strong> (
        <a
          href="https://chemotion.net/docs/repo"
          target="_blank"
          rel="noreferrer"
        >
          Full Guide <i className="fa fa-external-link" />
        </a>
        )
      </div>
      {topics.map(topic => (
        <div key={topic.url} style={{ marginBottom: '0.2em' }}>
          &ndash;{' '}
          <a href={topic.url} target="_blank" rel="noreferrer">
            {topic.label} <i className="fa fa-external-link" />
          </a>
        </div>
      ))}
    </div>
    <div style={{ borderTop: '1px solid #ccc', margin: '0.4em 0' }} />
    <div>
      <div>
        <strong>Contact Us</strong> via <ContactEmail label="" size="xsmall" />{' '}
        or{' '}
        <Button
          bsSize="xsmall"
          onClick={() =>
            window.open('https://github.com/ComPlat/chemotion_REPO', '_blank')
          }
        >
          <img
            src="/images/repo/github-mark.svg"
            alt="Chemotion Repository at GitHub"
            title="Chemotion Repository at GitHub"
            style={{ width: '16px', height: '16px', verticalAlign: 'middle' }}
          />
        </Button>
      </div>
      <div style={{ borderTop: '1px solid #ccc', margin: '0.4em 0' }} />
      <div style={{ color: '#666', fontSize: '0.9em' }}>
        <strong>Version: {window.APP_VERSION.version}</strong>
        <div style={{ fontSize: '0.95em' }}>
          Includes
          <div>
            {versionLinks.map(item => (
              <div key={item.label}>
                &ndash;{' '}
                {item.url ? (
                  <>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.label} <i className="fa fa-external-link" />
                    </a>{' '}
                  </>
                ) : (
                  <>{item.label} </>
                )}
                {item.version()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AppInfo;
