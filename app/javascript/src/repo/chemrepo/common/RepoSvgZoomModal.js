import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';

const RepoSvgZoomModal = ({
  svgPath, title, description, buttonClassName,
}) => {
  const [show, setShow] = useState(false);

  const open = (e) => {
    e.stopPropagation();
    setShow(true);
  };
  const close = () => setShow(false);

  const tooltip = `Open ${title.toLowerCase()} in a larger view with zoom and pan`;

  return (
    <>
      <Button
        size="sm"
        variant="light"
        onClick={open}
        className={`position-absolute top-0 end-0 m-2 z-2 opacity-75 ${buttonClassName || ''}`.trim()}
        title={tooltip}
        aria-label={tooltip}
      >
        <i className="fa fa-search-plus" aria-hidden="true" />
      </Button>
      <Modal
        show={show}
        onHide={close}
        size="xl"
        centered
        onClick={(e) => e.stopPropagation()}
      >
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body
          className="d-flex flex-column"
          style={{ height: '75vh', overflow: 'hidden' }}
        >
          {description && <p className="text-muted small mb-2 flex-shrink-0">{description}</p>}
          <div
            className="svg-file-zoom-pan-container flex-grow-1"
            style={{ overflow: 'hidden', minHeight: 0 }}
          >
            <SvgFileZoomPan svgPath={svgPath} duration={0} resize />
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

RepoSvgZoomModal.propTypes = {
  svgPath: PropTypes.string.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  buttonClassName: PropTypes.string,
};

RepoSvgZoomModal.defaultProps = {
  title: 'Reaction scheme',
  description: 'Use the mouse wheel (or pinch) to zoom in and out, and drag to pan. Close this dialog to return to the list.',
  buttonClassName: '',
};

export default RepoSvgZoomModal;
