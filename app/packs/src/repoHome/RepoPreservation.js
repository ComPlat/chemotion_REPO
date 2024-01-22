import React, { useState, useEffect } from 'react';
import { Col, Row, Panel } from 'react-bootstrap';
import { Parser } from 'html-to-react';

export default function RepoPreservation() {
  const [content, setContent] = useState();

  useEffect(() => {
    fetch('/preservation/strategy.html', { credentials: 'same-origin' })
      .then(res => res.text())
      .then(html => {
        // const parser = new HtmlToReactParser();
        setContent(Parser().parse(html));
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }, []);

  return (
    <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
      <Col md={2} />
      <Col md={8}>
        <Panel style={{ borderColor: 'unset' }}>
          <Panel.Heading style={{ background: 'unset' }}>
            <Panel.Title style={{ fontSize: '30px', fontWeight: 'bolder' }}>
              Preservation Strategy
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
}
