import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';

import ModalExport from 'src/apps/mydb/elements/list/selectionActions/ModalExport';
import ModalReactionExport from 'src/apps/mydb/elements/list/selectionActions/ModalReactionExport';
import ModalExportCollection from 'src/apps/mydb/collections/ModalExportCollection';
import ModalImportCollection from 'src/apps/mydb/collections/importSamples/ModalImportCollection';

function SelectionExportButton() {
  const [modal, showModal] = useState(null);
  const hideModal = () => showModal(null);

  const modalContent = ((m) => {
    switch (m) {
      case 'export': return <ModalExport onHide={hideModal} />;
      case 'exportReaction': return <ModalReactionExport onHide={hideModal} />;
      case 'exportCollection': return <ModalExportCollection onHide={hideModal} />;
      case 'importCollection': return <ModalImportCollection onHide={hideModal} />;
      default: return null;
    }
  })(modal);

  return (
    <>
      <Dropdown id="export-dropdown">
        <Dropdown.Toggle variant="light" size="sm" title="Export" aria-label="Export">
          <i className="icon-arrow-up-from-bracket me-1" aria-hidden="true" />
          <span className="selection-action-text-label">Export</span>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item
            onClick={() => showModal('export')}
            title="Export to spreadsheet"
          >
            Export samples from selection
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => showModal('exportReaction')}
            title="Export reaction smiles to csv"
          >
            Export reactions from selection
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item
            onClick={() => showModal('exportCollection')}
            title="Export as ZIP archive"
          >
            Export collections
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => showModal('importCollection')}
            title="Import collections from ZIP archive"
          >
            Import collections
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      {modalContent}
    </>
  );
}

export default SelectionExportButton;
