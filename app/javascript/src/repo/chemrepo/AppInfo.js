import React, { useState, useEffect } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';

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

const versionLinkDefs = [
  { label: 'ELN', url: 'https://www.chemotion.net/docs/eln', key: 'elnVersion' },
  { label: 'LabIMotion', url: 'https://www.chemotion.net/docs/labimotion', key: 'labimotionVersion' },
  { label: 'Spectra Viewer APP', url: null, key: 'spectraVersion' },
];

const docLink = (href, text) => (
  <a href={href} target="_blank" rel="noreferrer">
    {text} <i className="fa fa-external-link" />
  </a>
);

const AppInfo = () => {
  const [version, setVersion] = useState(UIStore.getState().version || {});
  const [activeTab, setActiveTab] = useState('topics');

  useEffect(() => {
    const onUiStoreChange = (state) => setVersion(state.version || {});
    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);

  return (
    <div className="news-box">
      <div className="news-box__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'topics'}
          className={`news-box__tab${activeTab === 'topics' ? ' news-box__tab--active' : ''}`}
          onClick={() => setActiveTab('topics')}
        >
          Popular Topics
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'version'}
          className={`news-box__tab${activeTab === 'version' ? ' news-box__tab--active' : ''}`}
          onClick={() => setActiveTab('version')}
        >
          Version
          {version.version && (
            <span className="news-box__badge ms-2">{version.version}</span>
          )}
        </button>
      </div>

      {activeTab === 'topics' && (
        <section className="news-box__section">
          <div className="news-box__header news-box__header--end">
            <span className="news-box__header-link">
              {docLink('https://chemotion.net/docs/repo', 'Full Guide')}
            </span>
          </div>
          <ul className="news-box__list">
            {topics.map(topic => (
              <li key={topic.url} className="news-box__list-item">
                {docLink(topic.url, topic.label)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTab === 'version' && (
        <section className="news-box__section">
          <div className="news-box__sublabel">supports</div>
          <ul className="news-box__list">
            {versionLinkDefs.map(item => (
              <li key={item.label} className="news-box__list-item">
                {item.url ? docLink(item.url, item.label) : <span>{item.label}</span>}
                <span className="news-box__version-num">{version[item.key] || 'N/A'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default AppInfo;
