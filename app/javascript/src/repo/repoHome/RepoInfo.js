import React, { useState, useEffect } from 'react';
import { Col, Row, Card } from 'react-bootstrap';
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

function HtmlContent({ html }) {
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    if (contentRef.current && html) {
      contentRef.current.innerHTML = html;
    }
  }, [html]);

  return <div ref={contentRef} />;
}

HtmlContent.propTypes = {
  html: PropTypes.string.isRequired,
};

const RepoInfo = ({ page }) => {
  const [content, setContent] = useState('');
  const [, setIsLoading] = useState(false);

  const fetchContent = () => {
    setIsLoading(true);
    fetch(pathMapping[page].path, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then((res) => res.text())
      .then((html) => {
        setContent(html);
        setIsLoading(false);
      })
      .catch((errorMessage) => {
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
        <Card style={{ borderColor: 'unset' }}>
          <Card.Header style={{ background: 'unset' }}>
            <Card.Title style={{ fontSize: '30px', fontWeight: 'bolder' }}>
              {pathMapping[page].title}
            </Card.Title>
          </Card.Header>
          <Card.Body
            style={{ overflowY: 'auto' }}
          >
            <HtmlContent html={content} />
          </Card.Body>
        </Card>
      </Col>
      <Col md={2} />
    </Row>
  );
};
RepoInfo.propTypes = {
  page: PropTypes.string.isRequired,
};

export default RepoInfo;
