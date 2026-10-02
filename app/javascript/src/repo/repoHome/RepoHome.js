import React, { Component } from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import PublicActions from 'src/repo/actions/PublicActions';
import PublicStore from 'src/repo/stores/PublicStore';
import { HomeFeature } from 'src/repo/repoHome/RepoCommon';
import RepoCardIntro from 'src/repo/repoHome/RepoCardIntro';
import RepoCardMoleculeArchive from 'src/repo/repoHome/RepoCardMoleculeArchive';
import RepoCardResearchData from 'src/repo/repoHome/RepoCardResearchData';
import RepoCardTopContributors from 'src/repo/repoHome/RepoCardTopContributors';
import RepoYearlyPublicationChart from 'src/repo/repoHome/RepoYearlyPublicationChart';
import { RepoCardReviewerIntro } from 'src/repo/repoHome/RepoCardReviewerIntro';
import WelcomeSearchBar from 'src/repo/repoHome/WelcomeSearchBar';
import Partners from 'src/repo/repoHome/RepoPartners';
import QuickEntryModal from 'src/repo/repoHome/QuickEntryModal';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';

const features = {
  metadata: {
    fa: 'fa fa-file-code-o',
    title: 'Metadata',
    intro:
      'Keep your research data findable and accessible and collect descriptions about the data. ' +
      'Based on DataCite Metadata Scheme.',
  },
  doi: {
    fa: 'fa fa-id-card-o',
    title: 'DOI',
    intro:
      'Tie Digital Object Identifier (DOI) to your research data. ' +
      'This registers your data in DataCite and makes it identifiable, ' +
      'searchable and citable.',
  },
  license: {
    fa: 'fa fa-creative-commons',
    title: 'Licenses',
    intro:
      'Choose which license is suitable for your research data to allow others to re-use your data.',
  },
  embargo: {
    fa: 'fa fa-ban',
    title: 'Embargo',
    intro:
      'Put an embargo on your data. This allows you to delay the publication of your research data. ' +
      'You can release to make your research data visible to the public whenever you are ready.',
  },
  oai: {
    fa: 'fa fa-tasks',
    title: 'OAI Provider',
    intro:
      'Exposes your research data using the Open Archives Initiative Protocol ' +
      'for Metadata Harvesting (OAI-PMH). OAI-PMH is a protocol developed for harvesting metadata ' +
      'and we support representing the metadata of your published research data.',
  },
  dataQuality: {
    fa: 'fa fa-diamond',
    title: 'Data Quality',
    intro:
      'Release your research data and pass an internal review that ensures data quality.',
  },
  peer: {
    fa: 'fa fa-users',
    title: 'Peer review',
    intro:
      'Before publication, you can share your data with external reviewers or the publishers.',
  },
  store: {
    fa: 'fa fa-database',
    title: 'Storage',
    intro:
      'Hosted by an experienced data center, ' +
      'Chemotion repository can store your research data reliably and securely.',
  },
  api: {
    fa: 'fa fa-connectdevelop',
    title: 'APIs',
    intro:
      'With Chemotion APIs, transfer data easily from your ELN to the Chemotion repository.',
  },
  labimotion: {
    fa: 'fa fa-empire',
    title: 'Extensive Customization',
    intro:
      'With LabIMotion: Tailor your modules or benefit from the availability of new elements, ' +
      "sections, and dataset templates that can be tailored to meet scientists' specific requirements.",
  },
};

class RepoHome extends Component {
  constructor() {
    super();
    this.state = {
      showReviewers: false,
      showQuickEntry: false,
      showSearch: false,
      showStats: false,
    };
    this.onChange = this.onChange.bind(this);
    this.onShow = this.onShow.bind(this);
    this.openQuickEntry = this.openQuickEntry.bind(this);
    this.closeQuickEntry = this.closeQuickEntry.bind(this);
    this.browsePublications = this.browsePublications.bind(this);
    this.toggleSearch = this.toggleSearch.bind(this);
    this.toggleStats = this.toggleStats.bind(this);
  }

  toggleSearch() {
    this.setState(prevState => ({ ...prevState, showSearch: !prevState.showSearch }));
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
    PublicActions.lastPublished();
    PublicActions.publishedStatics();
    PublicActions.topContributors(10, 365);
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(PublicState) {
    if (PublicState.lastPublished || PublicState.publishedStatics || PublicState.topContributors) {
      this.setState(prevState => ({
        ...prevState,
        lastPublished: PublicState.lastPublished,
        publishedStatics: PublicState.publishedStatics,
        topContributors: PublicState.topContributors,
      }));
    }
  }

  onShow() {
    this.setState(prevState => ({
      ...prevState,
      showReviewers: !prevState.showReviewers,
      showStats: false,
    }));
  }

  toggleStats() {
    this.setState(prevState => ({ showStats: !prevState.showStats, showReviewers: false }));
  }

  openQuickEntry() {
    this.setState({ showQuickEntry: true });
  }

  closeQuickEntry() {
    this.setState({ showQuickEntry: false });
  }

  browsePublications() {
    // PublicationSearchPage owns its own fetch + loading lifecycle.
    PublicActions.openRepositoryPage(`publications=${RepoNavListTypes.REACTION}`);
  }

  render() {
    const {
      publishedStatics, lastPublished, topContributors, showReviewers, showQuickEntry, showSearch,
      showStats,
    } = this.state;
    const hasContributors = topContributors && topContributors.length > 0;

    return (
      <Row className="repo-welcome">
        <Col
          xs={12}
          className="repo-header-section"
        >
          <div className="repo-header-logo">
            <img
              className="icon-chemotion"
              src="/images/repo/Chemotion-Repository-V1.svg"
              key="chemotion_full"
              alt="Chemotion Repository"
            />
          </div>
          <div className="repo-header-actions">
            <Button
              variant="primary"
              className="repo-header-action-btn"
              onClick={this.toggleSearch}
              aria-expanded={showSearch}
            >
              <i className="fa fa-search" aria-hidden="true" />&nbsp;Search
            </Button>
            <Button
              variant="primary"
              className="repo-header-action-btn"
              onClick={this.openQuickEntry}
            >
              <i className="fa fa-plus-circle" aria-hidden="true" />&nbsp;New Entry
            </Button>
            <Button
              variant="primary"
              className="repo-header-action-btn"
              onClick={this.browsePublications}
            >
              <i className="fa fa-book" aria-hidden="true" />&nbsp;Browse Publication
            </Button>
          </div>
          {showSearch && (
            <div className="repo-header-search">
              <WelcomeSearchBar onClose={this.toggleSearch} />
            </div>
          )}
        </Col>
        <QuickEntryModal
          show={showQuickEntry}
          onHide={this.closeQuickEntry}
        />
        <Col xs={12} className="repo-top-row">
          <Row className="g-0 w-100">
            <Col lg={3} md={12} sm={12} xs={12}>
              <RepoCardMoleculeArchive publishedStatics={publishedStatics} />
            </Col>
            <Col lg={6} md={12} sm={12} xs={12}>
              <RepoCardIntro lastPublished={lastPublished} />
            </Col>
            <Col lg={3} md={12} sm={12} xs={12}>
              <RepoCardResearchData publishedStatics={publishedStatics} />
            </Col>
          </Row>
        </Col>
        <Col xs={12} className="mt-3 mb-0 d-flex justify-content-center gap-2 flex-wrap">
          <Button
            variant="primary"
            className="repo-insights-btn"
            onClick={this.toggleStats}
            aria-expanded={showStats}
          >
            &nbsp;&nbsp;Publication Insights&nbsp;
            <i className={`fa fa-caret-${showStats ? 'up' : 'down'}`} aria-hidden="true" />
          </Button>
          <Button
            variant="primary"
            className="repo-insights-btn"
            onClick={this.onShow}
            aria-expanded={showReviewers}
          >
            &nbsp;&nbsp;Review Guidelines&nbsp;
            <i className={`fa fa-caret-${showReviewers ? 'up' : 'down'}`} aria-hidden="true" />
          </Button>
        </Col>
        {showStats && (
          <Col xs={12} className="repo-stats-section p-3">
            <Row className="g-3 align-items-stretch">
              <Col lg={hasContributors ? 9 : 12} md={12} xs={12}>
                <RepoYearlyPublicationChart />
              </Col>
              {hasContributors && (
                <Col lg={3} md={12} xs={12} className="repo-top-authors-row">
                  <RepoCardTopContributors topContributors={topContributors} />
                </Col>
              )}
            </Row>
          </Col>
        )}
        {showReviewers && (
          <Col xs={12} className="repo-stats-section p-3">
            <RepoCardReviewerIntro />
          </Col>
        )}
        <Col xs={12}>
          <Row>
            <Col xs={12}>
              <div className="home-title">
                <span>Features</span>
              </div>
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <Row className="feature-section">
                <Col lg={4} className="d-none d-lg-block" />
                <Col lg={4} xs={12}>
                  <HomeFeature
                    fa={features.peer.fa}
                    title={features.peer.title}
                    intro={features.peer.intro}
                  />
                </Col>
                <Col lg={4} className="d-none d-lg-block" />
              </Row>
              <Row className="feature-section">
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.store.fa}
                    title={features.store.title}
                    intro={features.store.intro}
                  />
                </Col>
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.metadata.fa}
                    title={features.metadata.title}
                    intro={features.metadata.intro}
                  />
                </Col>
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.doi.fa}
                    title={features.doi.title}
                    intro={features.doi.intro}
                  />
                </Col>
              </Row>
              <Row className="feature-section">
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.license.fa}
                    title={features.license.title}
                    intro={features.license.intro}
                  />
                </Col>
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.dataQuality.fa}
                    title={features.dataQuality.title}
                    intro={features.dataQuality.intro}
                  />
                </Col>
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.embargo.fa}
                    title={features.embargo.title}
                    intro={features.embargo.intro}
                  />
                </Col>
              </Row>
              <Row className="feature-section">
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.labimotion.fa}
                    title={features.labimotion.title}
                    intro={features.labimotion.intro}
                  />
                </Col>
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.oai.fa}
                    title={features.oai.title}
                    intro={features.oai.intro}
                  />
                </Col>
                <Col lg={4} md={4} xs={12}>
                  <HomeFeature
                    fa={features.api.fa}
                    title={features.api.title}
                    intro={features.api.intro}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
          <Row className="card-partners">
            <Col xs={12}>
              <div className="home-title">
                <span>Partners, Affiliations, APIs</span>
              </div>
            </Col>
            <Col xs={12}>
              <Partners start={0} end={8} />
            </Col>
          </Row>
        </Col>
      </Row>
    );
  }
}

export default RepoHome;
