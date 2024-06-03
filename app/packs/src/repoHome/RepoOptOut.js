import React, { useEffect, useState } from 'react';
import { Row, Col } from 'react-bootstrap';

const OPT_OUT = 'matomo-opt-out';
const OPT_OUT_URL = process.env.MATOMO_URL;
const OPT_SRC_PARAMS = [
  'module=CoreAdminHome',
  'action=optOutJS',
  `divId=${OPT_OUT}`,
  'language=auto',
  'backgroundColor=FFFFFF',
  'fontColor=000000',
  'fontSize=16px',
  'fontFamily=Arial',
  'showIntro=1',
];

const OPT_SRC = `${OPT_OUT_URL}?${OPT_SRC_PARAMS.join('&')}`;

const MatomoOptOutPage = () => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = OPT_SRC;
    script.async = true;

    script.onerror = () => {
      console.error('Failed to load Matomo opt-out script');
      setHasError(true);
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove the script
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
      <Col md={2} />
      <Col md={8}>
        <h1 style={{ textAlign: 'center' }}>Matomo Opt Out</h1>
        {hasError && (
          <div className="alert alert-danger">
            Failed to load the opt-out page. Please try again later.
          </div>
        )}
        <div id={OPT_OUT}></div>
      </Col>
      <Col md={2} />
    </Row>
  );
};

export default MatomoOptOutPage;
