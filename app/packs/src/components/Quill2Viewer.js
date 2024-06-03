import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Quill from 'quill2';
import { isEqual } from 'lodash';
import { keepSupSub } from 'src/utilities/quillFormat';

function Quill2Viewer({ value, preview }) {
  const quillViewerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!viewerRef.current) {
      const defaultOptions = {
        theme: 'bubble',
        readOnly: true,
        modules: {
          toolbar: null,
        },
      };
      viewerRef.current = new Quill(quillViewerRef.current, defaultOptions);
      const oriValue = value;
      const initialValue = preview ? keepSupSub(oriValue) : oriValue;
      viewerRef.current.setContents(initialValue);
    }
  }, []);

  useEffect(() => {
    if (viewerRef.current && !isEqual(viewerRef.current.getContents(), value)) {
      viewerRef.current.setContents(value);
    }
  }, [value]);

  return preview ? (
    <div className="quill-viewer">
      <div ref={quillViewerRef} />
    </div>
  ) : (
    <span ref={quillViewerRef} />
  );
}

Quill2Viewer.propTypes = {
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  preview: PropTypes.bool,
};

Quill2Viewer.defaultProps = {
  value: [],
  preview: false,
};

export default Quill2Viewer;
