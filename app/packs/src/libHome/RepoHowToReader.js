import React, { Component } from 'react';
import { Panel, Row, Col } from 'react-bootstrap';
import uuid from 'uuid';
import PublicStore from '../components/stores/PublicStore';
import QuillViewer from '../components/QuillViewer';
import { DateFormatYMDLong } from '../libHome/RepoCommon';

export default class RepoHowToReader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      howto: PublicStore.getState().howto || { title: '', content: {}, article: [] }
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    if (state.howto) {
      this.setState(prevState => ({
        ...prevState, howto: state.howto
      }));
    }
  }

  coverImage() {
    let imageUrl = '';
    const { howto } = this.state;
    if (typeof (howto) !== 'undefined' && howto &&
      typeof (howto.cover_image) !== 'undefined' && howto.cover_image) {
      imageUrl = `/howto/${howto.cover_image}`;
    } else {
      return (
        <div style={{ textAlign: 'center', height: 'auto' }}>
          <i className="fa fa-quote-left fa-2x" aria-hidden="true" />
          <span style={{ fontSize: '3em', fontWeight: 'bold' }}>&nbsp;HOW TO&nbsp;</span>
          <i className="fa fa-quote-right fa-2x" aria-hidden="true" style={{ position: 'absolute' }} />
        </div>
      );
    }

    return (
      <span>
        <img
          src={imageUrl}
          style={{
            display: 'block',
            maxHeight: '100%',
            maxWidth: '100%',
          }}
          alt=""
        />
      </span>
    );
  }

  render() {
    const { howto } = this.state;
    return (
      <Row className="howto_page">
        <Col md={2} />
        <Col md={8} sm={12}>
          <Panel className="newsreader_panel" style={{ border: 'unset' }}>
            <Panel.Heading>
              <Row>
                <Col md={6} sm={12}>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold', wordBreak: 'break-word' }}>{howto.title}</div>
                  <div className="news_author">
                    <i className="fa fa-user-circle" aria-hidden="true" />
                    &nbsp;{howto.creator_name}
                    <p />
                    <i className="fa fa-calendar" aria-hidden="true" />&nbsp;Published on&nbsp;{DateFormatYMDLong(howto.published_at ? howto.published_at : howto.created_at)},&nbsp;
                    updated on&nbsp;{DateFormatYMDLong(howto.updated_at ? howto.updated_at : howto.published_at)}
                  </div>
                </Col>
                <Col md={6} sm={12}>
                  {this.coverImage()}
                </Col>
                <Col md={12} sm={12}>
                  <div style={{ position: 'relative', marginTop: '10px' }}>
                    <a style={{ cursor: 'pointer' }} onClick={() => Aviator.navigate('/home/howto')}>Back to How-To</a>
                  </div>
                </Col>
              </Row>
              <div className="heading_separator" style={{ borderWidth: '0.5px' }} />
            </Panel.Heading>
            <Panel.Body>
              <Col lg={1} md={2}><div /></Col>
              <Col lg={10} md={8} sm={12}>
                <div className="news_quillviewer">
                  {
                    howto.article ?
                    howto.article.map((s) => {
                      if (s.art === 'txt') {
                        return <QuillViewer key={uuid.v4()} value={s.quill} />;
                      }
                      if (s.art === 'img') {
                        return (
                          <div key={uuid.v4()}>
                            <img src={`/howto/${s.pfad}`} alt="" />
                            <br />
                          </div>
                        );
                      }
                    }) : <div />
                  }
                </div>
              </Col>
              <Col lg={1} md={2}><div /></Col>
            </Panel.Body>
          </Panel>
        </Col>
        <Col md={2} />
      </Row>
    );
  }
}
