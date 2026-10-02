import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ButtonToolbar } from 'react-bootstrap';
import { GenInterface } from 'chem-generic-ui';

// Reusable styles
const styles = {
  triggerButton: {
    marginLeft: '5px',
  },
  modalBody: {
    maxHeight: '70vh',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
};

// Constants for reusability
const MODAL_CONFIG = {
  dialogClassName: 'news-preview-dialog',
  titleTemplate: name => `Template Example for ${name}`,
  buttonTitle: 'View Template Example',
};

const RepoGenericTemplateModal = ({ element, name }) => {
  const [modalShow, setModalShow] = useState(false);
  const [currentElement, setCurrentElement] = useState(element);

  // Sync local state with prop changes
  useEffect(() => {
    setCurrentElement(element);
  }, [element]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleModalShow = useCallback(() => setModalShow(true), []);
  const handleModalHide = useCallback(() => setModalShow(false), []);

  // Handle element changes from GenInterface
  const handleElementChange = useCallback(updatedElement => {
    setCurrentElement(updatedElement);
  }, []);

  // Memoize the element with properties to avoid recreating on each render
  const elementWithProperties = useMemo(
    () => ({
      ...currentElement,
      properties: currentElement.properties_release || {},
    }),
    [currentElement]
  );

  // Memoized GenInterface props to prevent unnecessary re-renders
  const genInterfaceProps = useMemo(
    () => ({
      generic: elementWithProperties,
      fnChange: handleElementChange,
      isPreview: false,
      isActiveWF: false,
      fnNavi: () => {},
    }),
    [elementWithProperties, handleElementChange]
  );

  return (
    <>
      <Button
        onClick={handleModalShow}
        style={styles.triggerButton}
        title={MODAL_CONFIG.buttonTitle}
        size="sm"
      >
        <i className="fa fa-eye" />
        &nbsp;View Example
      </Button>

      <Modal
        show={modalShow}
        onHide={handleModalHide}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {MODAL_CONFIG.title}
            {name ? ` for ${name}` : ''}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={styles.modalBody}>
          <GenInterface
            generic={genInterfaceProps.generic}
            fnChange={genInterfaceProps.fnChange}
            isPreview={genInterfaceProps.isPreview}
            isActiveWF={genInterfaceProps.isActiveWF}
            fnNavi={genInterfaceProps.fnNavi}
          />
        </Modal.Body>

        <Modal.Footer>
          <ButtonToolbar>
            <Button variant="warning" onClick={handleModalHide}>
              Close
            </Button>
          </ButtonToolbar>
        </Modal.Footer>
      </Modal>
    </>
  );
};

RepoGenericTemplateModal.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.number,
    elementType: PropTypes.string,
    properties_release: PropTypes.shape({}),
  }).isRequired,
  name: PropTypes.string.isRequired,
};

export default RepoGenericTemplateModal;
