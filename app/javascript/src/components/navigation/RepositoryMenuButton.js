import React, { useState, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';

function ExternalItem({ title, href }) {
  return (
    <Dropdown.Item
      className="d-flex gap-3 align-items-baseline justify-content-between"
      href={href}
      target="_blank"
    >
      {title}
      <i className="fa fa-external-link" />
    </Dropdown.Item>
  );
}

export default function RepositoryMenuButton({ linkToEln = false }) {
  const [version, setVersion] = useState({});
  useEffect(() => {
    const onUiStoreChange = (state) => setVersion(state.version);
    UIStore.listen(onUiStoreChange);
    onUiStoreChange(UIStore.getState());
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);
  const hasVersions = version && Object.keys(version).length > 1;

  return (
    <Dropdown>
      <Dropdown.Toggle variant="topbar">
        <i className="fa fa-info-circle me-1" />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item href="/home">Home</Dropdown.Item>
        <Dropdown.Item href="/home/publications">Publications</Dropdown.Item>
        <Dropdown.Item href="/home/about">About</Dropdown.Item>
        <Dropdown.Item href="/home/directive">Directive</Dropdown.Item>
        <Dropdown.Item href="/home/preservation">Preservation Strategy</Dropdown.Item>
        <Dropdown.Item href="/home/imprint">Imprint</Dropdown.Item>
        <Dropdown.Item href="/home/privacy">Privacy</Dropdown.Item>
        <Dropdown.Divider />
        <ExternalItem title="Documentation" href="https://chemotion.net/docs/repo" />
        <ExternalItem title="Report an issue on Github" href="https://github.com/ComPlat/chemotion_REPO/issues" />
        <Dropdown.Divider />
        {hasVersions && (
          <Dropdown.ItemText className="d-flex flex-column text-muted">
            {Object.entries(version)
              .filter(([k]) => !['elnVersion', 'labimotionVersion', 'spectraVersion'].includes(k))
              .map(([k, v]) => (
                <span key={k} className="d-flex justify-content-between">
                  <span>
                    {k}
                    :
                  </span>
                  <span style={{ userSelect: 'text' }}>
                    {k === 'version' ? v : (v ?? '').substring(0, 8)}
                  </span>
                </span>
              ))}
          </Dropdown.ItemText>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
