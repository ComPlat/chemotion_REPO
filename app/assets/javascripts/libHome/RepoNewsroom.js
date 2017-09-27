import React, { Component } from 'react';
import { Col, Row } from 'react-bootstrap';
import { orderBy, slice } from 'lodash';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import ArticleFetcher from '../components/fetchers/ArticleFetcher';
import { BackSoonPage, DateFormatYMDLong } from '../libHome/RepoCommon';

const renderEditRead = (article, isEditor) => {
  if (isEditor === true) {
    return (
      <div className="readedit">
        <a style={{ cursor: 'pointer' }} onClick={() => Aviator.navigate(`/home/newseditor/${article.key}`)}><i className="fa fa-pencil" />&nbsp;Edit&nbsp;</a>
        <a style={{ cursor: 'pointer' }} onClick={() => Aviator.navigate(`/home/newsroom/${article.key}`)}><i className="fa fa-wpexplorer" />&nbsp;Read more</a>
      </div>
    );
  }

  return (
    <div className="readedit">
      <a style={{ cursor: 'pointer' }} onClick={() => Aviator.navigate(`/home/newsroom/${article.key}`)}><i className="fa fa-wpexplorer" />&nbsp;Read more</a>
    </div>
  );
};


const mainImage = (article) => {
  let imageUrl = '/images/chemnews.png';
  if (typeof (article) !== 'undefined' && article
   && typeof (article.cover_image) !== 'undefined' && article.cover_image) {
    imageUrl = `/newsroom/${article.cover_image}`;
  }
  return (
    <div style={{ maxWidth: '100%', height: 'auto' }}>
      <img
        src={imageUrl}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
        }}
        alt=""
      />
    </div>
  );
};

export default class RepoNewsroom extends Component {
  constructor(props) {
    super(props);
    this.state = {
      articles: PublicStore.getState().articles || [],
      isEditor: false
    };
    this.onChange = this.onChange.bind(this);
    this.initial = this.initial.bind(this);
  }

  componentDidMount() {
    this.initial();
    PublicStore.listen(this.onChange);
    PublicActions.articles();
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    if (state.articles) {
      this.setState(prevState => ({
        ...prevState, articles: state.articles
      }));
    }
    if (state.isEditor) {
      this.setState(prevState => ({
        ...prevState, isEditor: state.isEditor
      }));
    }
  }

  initial() {
    ArticleFetcher.initial()
      .then((result) => {
        this.setState({
          isEditor: result.is_article_editor
        });
      });
  }

  render() {
    let { articles } = this.state;
    const { isEditor } = this.state;
    articles = isEditor ? articles : articles.filter(d => new Date() > new Date(d.published_at));
    articles = orderBy(
      articles,
      (o) => {
        if (!o.published_at || o.published_at === '') return o.created_at;
        return o.published_at;
      },
      'desc'
    );

    return articles.length > 0 ? (
      <Row style={{ maxWidth: '2000px', margin: 'auto', minHeight: 'calc(80vh)' }}>
        <Col md={12}>
          <Row>
            <Col md={2} />
            <Col md={8} sm={12}>
              <LatestNews article={articles[0]} isEditor={isEditor} />
            </Col>
            <Col md={2} />
          </Row>
          <NewsList articles={slice(articles, 1)} isEditor={isEditor} />
        </Col>
      </Row>
    ) : <Row style={{ maxWidth: '2000px', margin: 'auto', textAlign: 'center', height: 'calc(80vh)' }}><Col md={12}><BackSoonPage /></Col></Row>;
  }
}

const LatestNews = ({ article, isEditor }) => {
  return (
    <div className="news_latest_block">
      <div className="ribbon ribbon-top-right" style={{ right: '5px' }}><span>Latest</span></div>
      <Col md={4} sm={12}>{mainImage(article)}</Col>
      <Col md={8} sm={12}>
        <Col md={12} sm={12}>
          <span className="news_title">{article.title}</span>
          <div className="news_content">
            <p />
            {article.firstParagraph}
            <p />
          </div>
          <div>
            {renderEditRead(article, isEditor)}
          </div>
        </Col>
        <Col md={12} sm={12}>
          <div className="heading_separator" />
          <div className="news_author">
            <i className="fa fa-user-circle" aria-hidden="true" />&nbsp;{article.creator_name}&nbsp;&nbsp;&nbsp;
            <i className="fa fa-calendar" aria-hidden="true" />&nbsp;{DateFormatYMDLong(article.published_at ? article.published_at : article.created_at)}
          </div>
        </Col>
      </Col>
    </div>
  );
};

const NewsList = ({ articles, isEditor }) => {
  return articles.length > 0 ? (
    <Row>
      <Col md={2} />
      <Col md={8} sm={12}>
        <Row>
          <div className="news_time_box">
            {
              articles.map(a => (<NewsTBox isEditor={isEditor} key={`news_col_${a.key}`} article={a} />))
            }
          </div>
        </Row>
      </Col>
      <Col md={2} />
    </Row>
  ) : <div />;
};

const NewsTBox = ({ article, isEditor }) => {
  return (
    <ul>
      <li>
        <span />
        <div className="title">{article.title}</div>
        <div className="content">{article.firstParagraph}</div>

        <div className="author">
          <i className="fa fa-user-circle" aria-hidden="true" />&nbsp;<span>&nbsp;{article.creator_name}</span>
          {renderEditRead(article, isEditor)}
        </div>
        <div className="created_at">
          <span><i className="fa fa-calendar" />&nbsp;{DateFormatYMDLong(article.published_at ? article.published_at : article.created_at)}</span><span />
        </div>
      </li>
    </ul>
  );
};
