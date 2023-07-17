/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

const MolViewer = (props) => {
  const {
    cliendId, endpoint, molContent
  } = props;
  const [serviceReady, setServiceReady] = useState(false);
  const ifRef = useRef();
  const ifRefCurrent = ifRef.current;

  const discoverService = (event) => {
    const { type, data } = event.data;
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
          contentWindow.postMessage({ type: `${cliendId}:request-view`, data: messageData }, '*');
        });
      }
    }
  };

  if (!endpoint) {
    return <Alert bsStyle="danger">This service is not ready. Please contact your system administrator.</Alert>;
  }

  useEffect(() => {
    if (endpoint) {
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
  cliendId: PropTypes.string.isRequired,
  endpoint: PropTypes.string.isRequired,
  molContent: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired
};

export default MolViewer;
