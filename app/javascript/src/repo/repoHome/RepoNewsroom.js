import React, { Component } from 'react';
import { Col, Row, Container, Button } from 'react-bootstrap';
import { orderBy, slice } from 'lodash';
import PublicActions from 'src/repo/actions/PublicActions';
import PublicStore from 'src/repo/stores/PublicStore';
import ArticleFetcher from 'src/repo/fetchers/ArticleFetcher';
import { DateFormatYMDLong } from 'src/repo/repoHome/RepoCommon';
import BackSoonPage from 'src/repo/chemrepo/BackSoonPage';

const FALLBACK_COVER = '/images/repo/news_cover.png';

const coverUrl = (article) => {
  if (article && article.cover_image) return `/newsroom/${article.cover_image}`;
  return FALLBACK_COVER;
};

const articleDate = article => (
  DateFormatYMDLong(article.published_at ? article.published_at : article.created_at)
);

const isDraft = article => (
  !article.published_at || new Date() < new Date(article.published_at)
);

const CategoryTag = ({ label = 'News' }) => (
  <span className="bbc-tag">{label}</span>
);

const DraftTag = ({ article, isEditor }) => {
  if (!isEditor || !isDraft(article)) return null;
  return <span className="bbc-tag bbc-tag--draft">Draft</span>;
};

const Meta = ({ article }) => (
  <div className="bbc-meta">
    <span className="bbc-meta-date">{articleDate(article)}</span>
    {article.creator_name && (
      <>
        <span className="bbc-meta-sep" aria-hidden="true">|</span>
        <span className="bbc-meta-author">{article.creator_name}</span>
      </>
    )}
  </div>
);

const EditBtn = ({ article, isEditor }) => {
  if (!isEditor) return null;
  return (
    <Button
      variant="outline-secondary"
      size="sm"
      className="bbc-edit-btn"
      onClick={(e) => {
        e.stopPropagation();
        Aviator.navigate(`/home/newseditor/${article.key}`);
      }}
    >
      <i className="fa fa-pencil me-1" />Edit
    </Button>
  );
};

const ReadCue = () => (
  <span className="bbc-read" aria-hidden="true">
    Read full story
    <i className="fa fa-angle-right ms-2" />
  </span>
);

const articleNavProps = (article) => {
  const go = () => Aviator.navigate(`/home/newsroom/${article.key}`);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      go();
    }
  };
  return {
    role: 'link',
    tabIndex: 0,
    onClick: go,
    onKeyDown: onKey,
    'aria-label': article.title,
  };
};

const FeaturedArticle = ({ article, isEditor }) => (
  <article className="bbc-featured bbc-clickable" {...articleNavProps(article)}>
    <div className="bbc-featured-media">
      <img src={coverUrl(article)} alt="" />
    </div>
    <div className="bbc-featured-body">
      <div className="bbc-tag-row">
        <CategoryTag label="Featured" />
        <DraftTag article={article} isEditor={isEditor} />
      </div>
      <h2 className="bbc-featured-title">{article.title}</h2>
      <p className="bbc-featured-excerpt">{article.firstParagraph}…</p>
      <Meta article={article} />
      <div className="bbc-actions">
        <ReadCue />
        <EditBtn article={article} isEditor={isEditor} />
      </div>
    </div>
  </article>
);

const NewsItem = ({ article, isEditor }) => (
  <article className="bbc-item bbc-clickable" {...articleNavProps(article)}>
    <div className="bbc-item-media">
      <img src={coverUrl(article)} alt="" loading="lazy" />
    </div>
    <div className="bbc-item-body">
      <div className="bbc-tag-row">
        <CategoryTag />
        <DraftTag article={article} isEditor={isEditor} />
      </div>
      <h3 className="bbc-item-title">{article.title}</h3>
      <p className="bbc-item-excerpt">{article.firstParagraph}…</p>
      <Meta article={article} />
      <div className="bbc-actions">
        <ReadCue />
        <EditBtn article={article} isEditor={isEditor} />
      </div>
    </div>
  </article>
);

const NewsGrid = ({ articles, isEditor }) => {
  if (!articles.length) return null;
  return (
    <section className="bbc-grid">
      <header className="bbc-section-header">
        <h2>More stories</h2>
      </header>
      <Row className="g-3">
        {articles.map(article => (
          <Col key={`news_col_${article.key}`} lg={3} md={4} sm={6} xs={12}>
            <NewsItem article={article} isEditor={isEditor} />
          </Col>
        ))}
      </Row>
    </section>
  );
};

const EmptyState = () => (
  <div className="bbc-empty">
    <BackSoonPage />
  </div>
);

export default class RepoNewsroom extends Component {
  constructor(props) {
    super(props);
    this.state = {
      articles: PublicStore.getState().articles || [],
      isEditor: false,
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
    if (state.articles) this.setState({ articles: state.articles });
    if (state.isEditor) this.setState({ isEditor: state.isEditor });
  }

  initial() {
    ArticleFetcher.initial().then((result) => {
      this.setState({ isEditor: result?.is_article_editor || false });
    });
  }

  render() {
    const { isEditor } = this.state;
    let { articles } = this.state;

    articles = isEditor
      ? articles
      : articles.filter(d => new Date() > new Date(d.published_at));
    articles = orderBy(
      articles,
      o => (o.published_at && o.published_at !== '' ? o.published_at : o.created_at),
      'desc'
    );

    const hasArticles = articles.length > 0;

    return (
      <div className="bbc-newsroom">
        <div className="bbc-bar" aria-hidden="true" />
        <Container fluid className="bbc-container">
          <Row className="justify-content-center">
            <Col lg={11} xl={10} xxl={9}>
              <header className="bbc-masthead">
                <h1>Newsroom</h1>
                <p>Announcements, releases and updates from the Chemotion Repository.</p>
              </header>

              {hasArticles ? (
                <>
                  <FeaturedArticle article={articles[0]} isEditor={isEditor} />
                  <NewsGrid articles={slice(articles, 1)} isEditor={isEditor} />
                </>
              ) : (
                <EmptyState />
              )}
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}
