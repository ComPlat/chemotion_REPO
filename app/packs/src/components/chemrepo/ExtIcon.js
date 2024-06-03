import React from 'react';
import PublicStore from 'src/stores/alt/repo/stores/PublicStore';
import UIStore from 'src/stores/alt/stores/UIStore';

function getCollectionIcon(_collectionLabel) {
  const uiExtension = UIStore.getState().u || PublicStore.getState().u;
  const { collectionIcons } = uiExtension;
  if (!_collectionLabel || !collectionIcons) return null;
  return collectionIcons.find(c => c.label === _collectionLabel)?.icons[0];
}

function ExtIcon(_collectionLabel) {
  const icon = getCollectionIcon(_collectionLabel);
  if (!icon || !icon.filename) return null;
  const { filename, title } = icon;

  return (
    <img
      alt={filename}
      src={`/images/repo/${filename}`}
      className="ext-icon"
      title={title || filename}
    />
  );
}

function ExtInfo(_collectionLabel) {
  const icon = getCollectionIcon(_collectionLabel);
  if (!icon || !icon.info) return null;
  const { info } = icon;

  return (
    <div>
      <b>Additional Information:</b>
      {info}
    </div>
  );
}

export { ExtIcon, ExtInfo };
