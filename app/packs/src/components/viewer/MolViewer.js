/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

const urlRegex = /^(https?:\/\/)?(((([1-9]|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}([1-9]|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5]))|(([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}))(:(\d{1,5}))?(\/[\w\.-]*)*(\/)?(\?[^\s]*)?$/;
const isValidUrl = url => urlRegex.test(url);

const MolViewer = (props) => {
  const {
    endpoint, molContent
  } = props;
  const [serviceReady, setServiceReady] = useState(false);
  const ifRef = useRef();
  const ifRefCurrent = ifRef.current;

  const discoverService = (event) => {
    const { type, data } = event.data;
    // TODO: add a timeout to avoid infinite loop
    // TODO: make the type as configurable
    if (type === 'molviewer:state' && data?.state === 'ready') {
      setServiceReady(true);
    }
  };

  const postIt = () => {
    if (ifRefCurrent) {
      const { contentWindow } = ifRefCurrent;
      if (contentWindow) {
        molContent.text().then((text) => {
          const messageData = { payload: text };
          // TODO: add a timeout to avoid infinite loop
          // TODO: make the type as configurable
          contentWindow.postMessage({ type: 'kit:request-view', data: messageData }, '*');
        });
      }
    }
  };

  if (!isValidUrl(endpoint)) {
    return <Alert bsStyle="danger">This service is not ready. Please contact your system administrator.</Alert>;
  }

  useEffect(() => {
    if (isValidUrl(endpoint)) {
      window.addEventListener('message', discoverService);
      return () => {
        window.removeEventListener('message', discoverService);
      };
    }
    return null;
  }, []);

  useEffect(() => {
    if (serviceReady) postIt();
  }, [serviceReady, molContent]);

  return (
    <>
      {
        serviceReady ? null : <Alert bsStyle="danger">This service is offline. Please contact your system administrator.</Alert>
      }
      <div className="structure-frame-container">
        <iframe id="iframe_jsmol" ref={ifRef} src={endpoint} title="JSmol Web" className="frame-div" />
      </div>
    </>
  );
};

MolViewer.propTypes = {
  endpoint: PropTypes.string.isRequired,
  molContent: PropTypes.object.isRequired
};

export default MolViewer;
