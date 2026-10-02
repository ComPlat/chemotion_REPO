import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';
import Select from 'react-select';

const bundleLabel = (col) => col?.taggable_data?.label || `Embargo_${col?.element_id}`;

const toOption = (col) => ({
  value: col.element_id,
  name: bundleLabel(col),
  label: bundleLabel(col),
});

const EmbargoBundleModal = ({
  show,
  onHide,
  element,
  bundles,
  sourceEmbargo,
  onConfirm,
  confirmLabel,
  allowCreateNew,
}) => {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!show) setTarget(null);
  }, [show]);

  const sourceId = sourceEmbargo?.element_id;
  const options = [
    ...(allowCreateNew
      ? [{ value: '0', name: 'new', label: '— Create a new Embargo Bundle —' }]
      : []),
    ...(bundles || [])
      .filter((col) => col.element_id !== sourceId)
      .map(toOption),
  ];

  const fromLabel = sourceEmbargo?.taggable_data?.label;
  const el = element || {};

  const handleConfirm = () => {
    if (!target) return;
    onConfirm(target);
  };

  return (
    <Modal centered size="lg" show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{el.type}: [{el.title}]</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted mb-3">
          Move {el.type} <strong>[{el.title}]</strong>
          {fromLabel && <> from <strong>[{fromLabel}]</strong></>} to:
        </p>
        <Select
          value={target}
          onChange={setTarget}
          options={options}
          className="select-assign-collection"
          placeholder="Select an embargo bundle"
        />
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-start">
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" disabled={!target} onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

EmbargoBundleModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  element: PropTypes.shape({
    type: PropTypes.string,
    title: PropTypes.string,
  }),
  bundles: PropTypes.arrayOf(PropTypes.object),
  sourceEmbargo: PropTypes.object,
  confirmLabel: PropTypes.string,
  allowCreateNew: PropTypes.bool,
};

EmbargoBundleModal.defaultProps = {
  element: null,
  bundles: [],
  sourceEmbargo: null,
  confirmLabel: 'Move Embargoed Bundle',
  allowCreateNew: true,
};

export default EmbargoBundleModal;
