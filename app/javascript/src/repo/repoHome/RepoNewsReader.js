import React, { Component } from 'react';
import { Row, Col, Container, Button } from 'react-bootstrap';
import PublicStore from 'src/repo/stores/PublicStore';
import Quill2Viewer from 'src/repo/others/Quill2Viewer';
import { DateFormatYMDLong } from 'src/repo/repoHome/RepoCommon';

const FALLBACK_COVER = '/images/repo/news_cover.png';

const coverUrl = (news) => {
  if (news && news.cover_image) return `/newsroom/${news.cover_image}`;
  return FALLBACK_COVER;
};

const publishedDate = news => (
  DateFormatYMDLong(news.published_at ? news.published_at : news.created_at)
);

const FOOTER_LINKS = [
  {
    href: 'https://lists.kit.edu/sympa/subscribe/chemotion-repository',
    icon: 'fa fa-envelope-open-o',
    title: 'Subscribe',
    sub: 'Get the Chemotion newsletter',
    external: true,
  },
  {
    href: 'https://github.com/ComPlat/chemotion_REPO',
    icon: 'fa fa-users',
    title: 'Join the community',
    sub: 'Connect with Chemotion users',
    external: true,
  },
  {
    href: 'mailto:chemotion-repository@lists.kit.edu',
    icon: 'fa fa-paper-plane-o',
    title: 'Email us',
    sub: 'chemotion-repository@lists.kit.edu',
    external: false,
  },
];

const ArticleFooter = () => (
  <footer className="bbcr-footer">
    <h3 className="bbcr-footer-title">Stay connected</h3>
    <div className="bbcr-footer-grid">
      {FOOTER_LINKS.map(link => (
        <a
          key={link.href}
          className="bbcr-footer-link"
          href={link.href}
          {...(link.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        >
          <i className={link.icon} aria-hidden="true" />
          <div>
            <div className="bbcr-footer-lh">{link.title}</div>
            <div className="bbcr-footer-sub">{link.sub}</div>
          </div>
        </a>
      ))}
    </div>
  </footer>
);

const ArticleBody = ({ article }) => {
  if (!article || !article.length) return null;
  return article.map((s, i) => {
    if (s.art === 'txt') {
      return (
        <div key={`sec-${i}`} className="bbcr-section bbcr-text">
          <Quill2Viewer value={s.quill} />
        </div>
      );
    }
    if (s.art === 'img') {
      return (
        <figure key={`sec-${i}`} className="bbcr-figure">
          <img src={`/newsroom/${s.pfad}`} alt="" loading="lazy" />
          {s.caption && <figcaption>{s.caption}</figcaption>}
        </figure>
      );
    }
    return null;
  });
};

export default class RepoNewsReader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      news: PublicStore.getState().news || { title: '', content: {}, article: [] },
    };
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
    this.scrollToTop();
  }

  componentDidUpdate(_prevProps, prevState) {
    if (prevState.news?.key !== this.state.news?.key) {
      this.scrollToTop();
    }
  }

  scrollToTop() {
    const scroller = document.querySelector('.home-content-with-fixed-header');
    if (scroller) scroller.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    if (state.news) {
      this.setState(prev => ({ ...prev, news: state.news }));
    }
  }

  render() {
    const { news } = this.state;

    return (
      <div className="bbc-reader">
        <div className="bbc-bar" aria-hidden="true" />
        <Container fluid className="bbcr-container">
          <Row className="justify-content-center">
            <Col lg={10} xl={8}>
              <Button
                variant="link"
                className="bbcr-back"
                onClick={() => Aviator.navigate('/home/newsroom')}
              >
                <i className="fa fa-angle-left me-2" />Back to Newsroom
              </Button>

              <article className="bbcr-article">
                <header className="bbcr-header">
                  <span className="bbc-tag">News</span>
                  <h1 className="bbcr-title">{news.title}</h1>
                  <div className="bbcr-meta">
                    <span className="bbcr-meta-date">{publishedDate(news)}</span>
                    {news.creator_name && (
                      <>
                        <span className="bbcr-meta-sep" aria-hidden="true">|</span>
                        <span className="bbcr-meta-author">By {news.creator_name}</span>
                      </>
                    )}
                  </div>
                </header>

                <figure className="bbcr-cover">
                  <img src={coverUrl(news)} alt="" />
                </figure>

                <div className="bbcr-body">
                  <ArticleBody article={news.article} />
                </div>

                <ArticleFooter />
              </article>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}
