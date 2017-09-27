import React from 'react';
import { Col, Row, Panel } from 'react-bootstrap';
import { Parser } from 'html-to-react';

export default class RepoDirective extends React.Component {
  constructor() {
    super();
    this.state = {
      content: <div />
    };
  }

  componentDidMount() {
    fetch('/directives/directives.html', { credentials: 'same-origin' })
      .then(res => res.text())
      .then((html) => {
        // const parser = new HtmlToReactParser();
        this.setState({ content: Parser().parse(html) });
      })
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  render() {
    return (
      <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
        <Col md={3} />
        <Col md={6}>
          <Panel>
            <Panel.Heading>
              <Panel.Title>Directive to use the service</Panel.Title>
            </Panel.Heading>
            <Panel.Body style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {this.state.content}
            </Panel.Body>
          </Panel>
        </Col>
        <Col md={3} />
      </Row>
    );
  }
};
