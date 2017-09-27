import React, { Component } from 'react';
import { Col, Row } from 'react-bootstrap';
import { orderBy } from 'lodash';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import ArticleFetcher from '../components/fetchers/ArticleFetcher';
import { BackSoonPage, DateFormatYMDLong } from '../libHome/RepoCommon';

const renderEditRead = (article, isEditor) => {
  if (isEditor === true) {
    return (
      <div style={{ position: 'relative' }}>
        <a style={{ cursor: 'pointer' }} onClick={() => Aviator.navigate(`/home/howtoeditor/${article.key}`)}><i className="fa fa-pencil" />&nbsp;Edit&nbsp;</a>
        <a style={{ cursor: 'pointer' }} onClick={() => Aviator.navigate(`/home/howto/${article.key}`) }><i className="fa fa-wpexplorer" />&nbsp;Read more</a>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <a style={{ cursor: 'pointer' }} onClick={() => Aviator.navigate(`/home/howto/${article.key}`)}><i className="fa fa-wpexplorer" />&nbsp;Read more</a>
    </div>
  );
};


const mainImage = (howto) => {
  let imageUrl = '';
  if (typeof (howto) !== 'undefined' && howto
    && typeof (howto.cover_image) !== 'undefined' && howto.cover_image) {
    imageUrl = `/howto/${howto.cover_image}`;
  }
  return (
    <div style={{ maxWidth: '100%', height: 'auto' }}>
      {
        imageUrl === '' ?
          <div style={{ textAlign: 'center', width: '100%', height: 'auto', whiteSpace: 'nowrap' }}>
            <i className="fa fa-quote-left fa-2x" aria-hidden="true" />
            <span style={{ fontSize: '3em', fontWeight: 'bold' }}>&nbsp;HOW TO&nbsp;</span>
            <i className="fa fa-quote-right fa-2x" aria-hidden="true" style={{ position: 'absolute' }} />
          </div>
          :
          <img
            src={imageUrl}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto'
            }}
            alt=""
          />
      }
    </div>
  );
};

export default class RepoHowTo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      howtos: PublicStore.getState().howtos || [],
      isEditor: false
    };
    this.onChange = this.onChange.bind(this);
    this.initial = this.initial.bind(this);
  }

  componentDidMount() {
    this.initial();
    PublicStore.listen(this.onChange);
    PublicActions.howtos();
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    if (state.howtos) {
      this.setState(prevState => ({
        ...prevState, howtos: state.howtos
      }));
    }
    if (state.isEditor) {
      this.setState(prevState => ({
        ...prevState, isEditor: state.isEditor
      }));
    }
  }

  initial() {
    ArticleFetcher.initialHowTo()
      .then((result) => {
        this.setState({
          isEditor: result.is_howto_editor
        });
      });
  }

  render() {
    let { howtos } = this.state;
    const { isEditor } = this.state;
    howtos = isEditor ? howtos : howtos.filter(d => new Date() > new Date(d.published_at));
    howtos = orderBy(
      howtos,
      (o) => {
        if (!o.published_at || o.published_at === '') return o.created_at;
        return o.published_at;
      },
      'desc'
    );

    return howtos.length > 0 ? (
      <Row className="howto_page">
        <Col lg={12} md={12}>
          <NewsList howtos={howtos} isEditor={isEditor} />
        </Col>
      </Row>
    ) :
      <Row className="howto_page" style={{ textAlign: 'center' }}>
        <Col md={12}>
          <BackSoonPage />
        </Col>
      </Row>;
  }
}

const NewsColSmall = (param) => {
  const { howto, isEditor } = param;
  return (
    <Col lg={12} md={12} sm={12} className="news_column">
      <div className="news_card_content">
        <div className="news_card_s">
          <Col md={4} sm={12}>{mainImage(howto)}</Col>
          <Col md={8} sm={12}>
            <div className="card_info">
              <div className="info">
                <h1 style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '50px' }}>{howto.title}</h1>
                <div className="news_content_card_s">
                  <p />
                  {howto.firstParagraph}
                  <p />
                </div>
              </div>
            </div>
            <div className="read">
              {renderEditRead(howto, isEditor)}
            </div>
          </Col>
        </div>
        <div className="news_card_badge_s">
          <i className="fa fa-user-circle" aria-hidden="true" />&nbsp;<span>{howto.creator_name}</span>&nbsp;
          <i className="fa fa-calendar" aria-hidden="true" />&nbsp;<span>Published on {DateFormatYMDLong(howto.published_at ? howto.published_at : howto.created_at)}</span>
          <span>, updated on {DateFormatYMDLong(howto.updated_at ? howto.updated_at : howto.published_at)}</span>
        </div>
      </div>
    </Col>
  );
};

const NewsList = (param) => {
  const { howtos } = param;
  return howtos.length > 0 ? (
    <Row>
      <Col md={1} />
      <Col md={10} sm={12} style={{ display: 'flex', flexDirection: 'column' }}>
        <Row>
          {
            howtos.map(a => (<NewsColSmall isEditor={param.isEditor} key={`news_col_${a.key}`} howto={a} />))
          }
        </Row>
      </Col>
      <Col md={1} />
    </Row>
  ) : <div />;
};

