import React, { Component } from 'react';
import { Col, Row } from 'react-bootstrap';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import PublicStore from 'src/stores/alt/repo/stores/PublicStore';
import { HomeFeature } from 'src/repoHome/RepoCommon';
import RepoCardStaticsBoard from 'src/repoHome/RepoCardStaticsBoard';
import RepoCardIntro from 'src/repoHome/RepoCardIntro';
import RepoCardMoleculeArchive from 'src/repoHome/RepoCardMoleculeArchive';
import {
  RepoCardReviewerIntro,
  RepoCardReviewerIntroBtn,
} from 'src/repoHome/RepoCardReviewerIntro';
import PublicSearchIcons from 'src/components/chemrepo/search/PublicSearchIcons';
import Partners from 'src/repoHome/RepoPartners';

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
  // usage: {
  //   fa: 'fa fa-bar-chart',
  //   title: 'Usage',
  //   intro: 'Assess your research data and track the published research data......'
  // },
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
    this.state = { showReviewers: false };
    this.onChange = this.onChange.bind(this);
    this.onShow = this.onShow.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
    PublicActions.lastPublished();
    PublicActions.publishedStatics();
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(PublicState) {
    if (PublicState.lastPublished || PublicState.publishedStatics) {
      this.setState(prevState => ({
        ...prevState,
        lastPublished: PublicState.lastPublished,
        publishedStatics: PublicState.publishedStatics,
      }));
    }
  }

  onShow() {
    this.setState(prevState => ({
      ...prevState,
      showReviewers: !prevState.showReviewers,
    }));
  }

  render() {
    const { publishedStatics, lastPublished, showReviewers } = this.state;

    return (
      <Row className="repo-welcome">
        <Col
          lg={12}
          md={12}
          sm={12}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            className="icon-chemotion"
            src="/images/repo/Chemotion-V1.png"
            key="chemotion_full"
            alt="Chemotion Repository"
          />
          <PublicSearchIcons />
        </Col>
        <Col md={12} sm={12}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Col md={3} sm={12}>
              <RepoCardMoleculeArchive publishedStatics={publishedStatics} />
            </Col>
            <Col md={6} sm={12}>
              <RepoCardIntro lastPublished={lastPublished} />
            </Col>
            <Col md={3} sm={12}>
              <RepoCardStaticsBoard publishedStatics={publishedStatics} />
            </Col>
          </div>
        </Col>
        <Col md={12} sm={12}>
          <Row>
            <Col md={12} sm={12}>
              <Row>
                <Col md={12} sm={12}>
                  <div className="home-title">
                    <span>Features</span>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
          <Row>
            <Col md={1} smHidden />
            <Col md={10} sm={12}>
              <Row className="feature">
                <Col md={4} smHidden />
                <Col md={4} sm={12}>
                  <HomeFeature
                    extraStyle={{ display: 'flex', flexWrap: 'wrap' }}
                    fa={features.peer.fa}
                    title={features.peer.title}
                    intro={features.peer.intro}
                    extra={
                      <RepoCardReviewerIntroBtn
                        show={showReviewers}
                        onClick={() => this.onShow()}
                      />
                    }
                  />
                </Col>
                <Col md={4} smHidden />
              </Row>
              {showReviewers && <RepoCardReviewerIntro />}
              <Row className="feature">
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.store.fa}
                    title={features.store.title}
                    intro={features.store.intro}
                  />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.metadata.fa}
                    title={features.metadata.title}
                    intro={features.metadata.intro}
                  />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.doi.fa}
                    title={features.doi.title}
                    intro={features.doi.intro}
                  />
                </Col>
              </Row>
              <Row className="feature">
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.license.fa}
                    title={features.license.title}
                    intro={features.license.intro}
                  />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.dataQuality.fa}
                    title={features.dataQuality.title}
                    intro={features.dataQuality.intro}
                  />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.embargo.fa}
                    title={features.embargo.title}
                    intro={features.embargo.intro}
                  />
                </Col>
              </Row>
              <Row className="feature">
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.labimotion.fa}
                    title={features.labimotion.title}
                    intro={features.labimotion.intro}
                  />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.oai.fa}
                    title={features.oai.title}
                    intro={features.oai.intro}
                  />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature
                    fa={features.api.fa}
                    title={features.api.title}
                    intro={features.api.intro}
                  />
                </Col>
              </Row>
            </Col>
            <Col md={1} smHidden />
          </Row>
          <Row className="card-partners">
            <Col md={12} sm={12}>
              <Row>
                <Col md={12} sm={12}>
                  <div className="home-title">
                    <span>Partners, Affiliations, APIs</span>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={1} smHidden />
                <Col md={10} sm={12}>
                  <Partners start={0} end={4} />
                  <Partners start={4} end={8} />
                </Col>
                <Col md={1} smHidden />
              </Row>
            </Col>
          </Row>
        </Col>
      </Row>
    );
  }
}

export default RepoHome;
