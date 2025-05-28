import React, { useState, useEffect } from 'react';
import { Col, Row, Panel } from 'react-bootstrap';
import { Parser } from 'html-to-react';
import PropTypes from 'prop-types';

const pathMapping = {
  directive: {
    title: 'Directive to use the service',
    path: '/directives/directives.html',
  },
  preservation: {
    title: 'Preservation Strategy',
    path: '/preservation/strategy.html',
  },
  imprint: {
    title: 'Imprint',
    path: '/legals/imprint.html',
  },
  privacy: {
    title: 'Privacy',
    path: '/policy/privacy.html',
  },
};

const RepoInfo = ({ page }) => {
  const [content, setContent] = useState();
  const [, setIsLoading] = useState(false);

  const fetchContent = () => {
    setIsLoading(true);
    fetch(pathMapping[page].path, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(res => res.text())
      .then(html => {
        setContent(Parser().parse(html));
        setIsLoading(false);
      })
      .catch(errorMessage => {
        console.log(errorMessage);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchContent();
  }, [page]);

  return (
    <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
      <Col md={2} />
      <Col md={8}>
        <Panel style={{ borderColor: 'unset' }}>
          <Panel.Heading style={{ background: 'unset' }}>
            <Panel.Title style={{ fontSize: '30px', fontWeight: 'bolder' }}>
              {pathMapping[page].title}
            </Panel.Title>
          </Panel.Heading>
          <Panel.Body
            style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}
          >
            {content}
          </Panel.Body>
        </Panel>
      </Col>
      <Col md={2} />
    </Row>
  );
};
RepoInfo.propTypes = {
  page: PropTypes.string.isRequired,
};

export default RepoInfo;
