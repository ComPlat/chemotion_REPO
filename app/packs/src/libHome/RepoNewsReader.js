import React, { Component } from 'react';
import { Panel, Row, Col } from 'react-bootstrap';
import uuid from 'uuid';
import PublicStore from '../components/stores/PublicStore';
import QuillViewer from '../components/QuillViewer';
import { DateFormatYMDLong } from '../libHome/RepoCommon';

export default class RepoNewsReader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      news: PublicStore.getState().news || { title: '', content: {}, article: [] }
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
    if (state.news) {
      this.setState(prevState => ({
        ...prevState, news: state.news
      }));
    }
  }

  coverImage() {
    let imageUrl = '/images/chemnews.png';
    const { news } = this.state;
    if (typeof (news) !== 'undefined' && news &&
      typeof (news.cover_image) !== 'undefined' && news.cover_image) {
      imageUrl = `/newsroom/${news.cover_image}`;
    }
    return (
      <span style={{ display: 'flex', justifyContent: 'center', alignContent: 'center' }}>
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
    const { news } = this.state;
    return (
      <Row style={{ maxWidth: '2000px', margin: 'auto', minHeight: '85vh' }}>
        <Col md={12} >
          <Col md={2} />
          <Col md={8} sm={12}>
            <div className="chemotion_news">
              <img alt="Chemotion-Repository" src="/images/logo.png" style={{ width: '50px', height: 'auto', marginTop: '-10px' }} />
              &nbsp;Chemotion&nbsp;News
            </div>
          </Col>
          <Col md={2} />
        </Col>
        <Col md={12}>
          <Row>
            <Col md={2} />
            <Col md={8} sm={12}>
              <Panel className="newsreader_panel" style={{ border: 'unset' }}>
                <Panel.Heading>
                  <Row>
                    <Col md={6} sm={12}>
                      <h2 style={{ fontWeight: 'bold' }}>{news.title}</h2>
                      <div className="news_author">
                        <i className="fa fa-user-circle" aria-hidden="true" />
                        &nbsp;{news.creator_name}
                        &nbsp;&nbsp;&nbsp;<i className="fa fa-calendar" aria-hidden="true" />&nbsp;{DateFormatYMDLong(news.published_at ? news.published_at : news.created_at)}
                      </div>
                    </Col>
                    <Col md={6} sm={12}>
                      {this.coverImage()}
                    </Col>
                  </Row>
                  <br />
                  <div className="heading_separator" />
                </Panel.Heading>
                <Panel.Body>
                  <Col lg={1} md={2}><div /></Col>
                  <Col lg={10} md={8} sm={12}>
                    <div className="news_quillviewer">
                      {
                        news.article ?
                          news.article.map((s) => {
                            if (s.art === 'txt') {
                              return <QuillViewer key={uuid.v4()} value={s.quill} />;
                            }
                            if (s.art === 'img') {
                              return (
                                <div key={uuid.v4()}>
                                  <img src={`/newsroom/${s.pfad}`} alt="" />
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
        </Col>
      </Row>
    );
  }
}
