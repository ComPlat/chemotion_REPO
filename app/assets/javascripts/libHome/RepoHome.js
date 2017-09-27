import React, {Component} from 'react'
import { Label, Col, Row, Panel, ButtonToolbar, Button, Carousel, Thumbnail, Table, Well} from 'react-bootstrap'
import SVG from 'react-inlinesvg'

import PublicActions from '../components/actions/PublicActions'
import PublicStore from '../components/stores/PublicStore'
import { HomeFeature } from './RepoCommon';

const PartnersInfo = (info) => {
  const { header, img, content } = info
  const imgSrc = `/images/repo/${img}`

  return (
    <Thumbnail alt={header} src={imgSrc} className="partners-info" key={img}>
      <div className="info">
        <h4>{header}</h4>
        <p>{content}</p>
      </div>
    </Thumbnail>
  );
}

const Infos = [
  {
    header: "Database API",
    img: "OAI.png",
    content: "The molecule and dataset metadata are available via a low-barrier mechanism for repository interopability.",
  }, {
    header: "KIT Stiftung",
    img: "KITStiftung.png",
    content: "The KIT foundation honors excellent contributions to chemistry research with the Chemotion Award.",
  }, {
    header: "re3data",
    img: "re3data.png",
    content: "Karlsruhe Institute of Technology Registry of Research Data Repositories",
  }, {
    header: "Inchitrust",
    img: "InChITRUST.png",
    content: "The KIT has a Supporter Membership.",
  }, {
    header: "Datacite",
    img: "DataCite.png",
    content: "Helping you to find, access, and reuse data.",
  }, {
    header: "Pubmed",
    img: "pubchem.jpg",
    content: "All compounds are automatically registered with PubChem.",
  }, {
    header: "Thomson Reuters",
    img: "DCIbadge.png",
    content: "Datasets are automatically registered at the Data Citation Index.",
  }, {
    header: "DFG",
    img: "ri_logo.png",
    content: "Listed in the DFG catalogue for Research Infrastructures.",
  }
]

const timeInterval = (date) => {
  if (!date) { return null; }
  switch (typeof date) {
    case 'number':
      break;
    case 'string':
      date = +new Date(date);
      break;
    case 'object':
      if (date.constructor === Date) date = date.getTime();
      break;
    default:
      date = +new Date();
  }
  let seconds = Math.floor((new Date() - date) / 1000);
  let intrvlTypes = [
    [31536000, 'year', 'a'],
    [2592000, 'month', 'a'],
    [604800, 'week', 'a'],
    [86400, 'day', 'a'],
    [3600, 'hour', 'an'],
    [60, 'minute', 'a'],
    [1, 'second', 'a'],
  ]
  let intrvlCount = 0
  let intrvlType = intrvlTypes.find((e) => {
    intrvlCount = Math.floor(seconds / e[0])
    return intrvlCount >= 1
  })
  return `${intrvlCount === 1 ? intrvlType[2] : intrvlCount} ${intrvlType[1]}${intrvlCount > 1 ? 's' : ''} ago`;
}

const CardLatestPublish = ({ lastPublished }) => {
  if (lastPublished) {
    const { sample, reaction } = lastPublished;
    const svgPathSample = sample.sample_svg_file
      ? `/images/samples/${sample.sample_svg_file}`
      : `/images/molecules/${sample.molecule.molecule_svg_file}`;
    const pubTagSample = sample.tag || {};
    const svgPathReaction = reaction
      ? `/images/reactions/${reaction.reaction_svg_file}`
      : '/images/no_image_180.svg';
    const pubTagReaction = reaction.tag || {};
    const spanStyle = {
      color: 'black', textShadow: 'none', textAlign: 'justify', fontSize: 'medium'
    };


    return (
      <div className="card-well-competition">
        <Carousel className="carl-spt" indicators={false} interval={6000}>
          <Carousel.Item className="carl-spt-item">
            <a title="Click to view details" style={{ cursor: 'pointer' }} onClick={() => PublicActions.displayMolecule(sample.molecule.id)}>
              <SVG src={svgPathSample} key={svgPathSample} className="carl-sample" />
            </a>
            <Carousel.Caption className="caption">
              <span style={spanStyle}>Published {timeInterval(pubTagSample.published_at || pubTagSample.doi_reg_at || pubTagSample.queued_at)} by {sample.contributor}</span>
            </Carousel.Caption>
          </Carousel.Item>
          <Carousel.Item className="carl-spt-item">
            <a title="Click to view details" style={{ cursor: 'pointer' }} onClick={() => PublicActions.displayReaction(reaction.id)}>
              <SVG src={svgPathReaction} key={svgPathReaction} className="carl-sample" />
            </a>
            <Carousel.Caption className="caption">
    <span style={spanStyle}>Published {timeInterval(pubTagReaction.published_at || pubTagReaction.doi_reg_at || pubTagReaction.queued_at)} by {reaction.contributor}</span>
            </Carousel.Caption>
          </Carousel.Item>
        </Carousel>
      </div>
    );
  }
  return <div />;
};

const CardSample = ({ lastPublishedSample }) => {
  const sample = lastPublishedSample;
  let svgPath = '/images/no_image_180.svg';
  // let href = ''

  if (sample) {
    svgPath = sample.svgPath
      ? `/images/samples/${sample.sample_svg_file}`
      : `/images/molecules/${sample.molecule.molecule_svg_file}`
    // href = `/molecules/${sample.molecule.id}`;
    const pubTag = sample.tag && sample.tag.taggable_data['publication'] || {}

    return (
      <div className="card-well">
        <div style={{ backgroundColor: 'white' }}>
          <SVG style={{ backgroundColor: 'white' }} src={svgPath} key={svgPath}/>
        </div>
        <p style={{ textAlign: 'centered' }}>Published { timeInterval(pubTag.published_at || pubTag.doi_reg_at || pubTag.queued_at)} by {pubTag.creators[0].name}</p>
        <ButtonToolbar>
          <Button
            onClick={() =>PublicActions.displayMolecule(sample.molecule.id)}
            bsStyle="primary"
            // href={href}
          >
            View
          </Button>
        </ButtonToolbar>
      </div>
    )
  }
  return (
    <div className="card-well">
      <SVG src={'/images/wild_card/no_image_180.svg'} />

      <ButtonToolbar>
        <Button bsStyle="primary" >
          View
        </Button>
      </ButtonToolbar>
    </div>
  )
}

const CardIntro = () => {
  return (
    <div className="card-well">
      <ImgTitle />
    </div>
  )
}

const ImgTitle = () => {
  return (
    <Row>
      <Col md={6}>
        <img
          className="icon-chemotion"
          src="/images/repo/chemotion_full.svg"
          key="chemotion_full"
          alt="icon"
        />
      </Col>
      <Col md={6}>
        <h2 className="repository-for" >
          Repository for molecules, reactions and research data
        </h2>
      </Col>
      <Col md={12} >
        <h3>Visibility and Impact</h3>
        <ul>
          <li>
            Publish your structures, attach your characterization data, and make them citable via DOI
          </li>
          <li>
            Automated registration at various scientific data providers
          </li>
          <li>
            Long-term archival - from scientists for scientists
          </li>
          <li>
            <h4 style={{ display: 'inline' }}><Label style={{ backgroundColor: '#ff5555', textShadow: '2px 2px #555' }}>NEW</Label></h4>
            <i>&nbsp;Now, publish your Reactions</i>
          </li>
        </ul>
      </Col>
    </Row>
  )
}

const StaticsBoard = (params) => {
  const { publishedStatics } = params;
  if (publishedStatics && publishedStatics.length !== 0) {
    const stsSample = publishedStatics.find(p => (p.el_type === 'sample' && p.ex_type === 'sample'));
    const stsSampleReview = publishedStatics.find(p => (p.el_type === 'sample' && p.ex_type === 'sample-review'));
    const stsSampleEmbargo = publishedStatics.find(p => (p.el_type === 'sample' && p.ex_type === 'sample-embargo'));
    const stsReaction = publishedStatics.find(p => (p.el_type === 'reaction' && p.ex_type === 'reaction'));
    const stsReactionReview = publishedStatics.find(p => (p.el_type === 'reaction' && p.ex_type === 'reaction-review'));
    const stsReactionEmbargo = publishedStatics.find(p => (p.el_type === 'reaction' && p.ex_type === 'reaction-embargo'));
    const stsAnalysis = publishedStatics.filter(p => p.el_type === 'analysis');
    const stsAnalysisSort = stsAnalysis.sort((a, b) => a.e_cnt - b.e_cnt).reverse();
    const stsAnalysisCnt = stsAnalysisSort
      .map(e => Number(e.e_cnt)).reduce((accumulator, currentValue) => accumulator + currentValue);

    const csInfo = {
      borderBottomWidth: '6px', paddingLeft: 'unset', paddingRight: 'unset', borderColor: '#3a9fd3', marginBottom: '10px'
    };
    const csHead = {
      backgroundColor: 'unset', color: 'unset', fontSize: '2rem', border: 'none', textAlign: 'center', paddingLeft: 'unset', paddingRight: 'unset'
    };

    return (
      <Row className="card-well-competition">
        <Col lg={12} md={12} sm={12} className="panel panel-info" style={csInfo}>
          <Col lg={6} md={6} sm={6} className="panel-heading" style={csHead}>
            <Row style={{ lineHeight: 'normal', fontWeight: 'bolder' }}>
              <div style={{ fontSize: '6rem' }}><i className="icon-sample" /></div>
              <div style={{ fontSize: '1.6rem' }}>Samples</div>
            </Row>
          </Col>
          <Col lg={6} md={6} sm={6} className="panel-heading" style={csHead}>
            <Row style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.6rem', color: '#3a9fd3', marginBottom: '-14px' }}>published</div>
              <div style={{ fontSize: '4rem' }}>{stsSample.e_cnt}</div>
              <div className="italic-desc">{stsSampleReview.e_cnt} under review</div>
              <div className="italic-desc">{stsSampleEmbargo.e_cnt} under embargo</div>
            </Row>
          </Col>
        </Col>
        <Col lg={12} md={12} sm={12} className="panel panel-info" style={csInfo}>
          <Col lg={6} md={6} sm={6} className="panel-heading" style={csHead}>
            <Row style={{ lineHeight: 'normal', fontWeight: 'bolder' }}>
              <div style={{ fontSize: '6rem' }}><i className="icon-reaction" /></div>
              <div style={{ fontSize: '1.6rem' }}>Reactions</div>
            </Row>
          </Col>
          <Col lg={6} md={6} sm={6} className="panel-heading" style={csHead}>
            <Row style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.6rem', color: '#3a9fd3', marginBottom: '-14px' }}>published</div>
              <div style={{ fontSize: '4rem' }}>{stsReaction.e_cnt}</div>
              <div className="italic-desc">{stsReactionReview.e_cnt} under review</div>
              <div className="italic-desc">{stsReactionEmbargo.e_cnt} under embargo</div>
            </Row>
          </Col>
        </Col>
        <Col lg={12} md={12} sm={12} className="panel panel-info" style={csInfo}>
          <Col lg={6} md={6} sm={6} className="panel-heading" style={{ ...csHead, padding: '0px' }}>
            <Row style={{ lineHeight: 'normal', fontWeight: 'bolder', display: 'inline' }}>
              <div style={{ fontSize: '5rem' }}><i className="fa fa-area-chart" aria-hidden /></div>
              <div style={{ fontSize: '1.6rem' }}>Analyses</div>
            </Row>
          </Col>
          <Col lg={6} md={6} sm={6} className="panel-heading" style={{ ...csHead, padding: '0px' }}>
            <Row style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '4rem' }}>{stsAnalysisCnt}</div>
              <div style={{ fontSize: '1.4rem', fontStyle: 'italic', display: 'inline-block' }}>Top 3:&nbsp;&nbsp;
                <span style={{ float: 'right' }}>
                  <div className="italic-desc">{stsAnalysisSort[0].e_cnt}&nbsp;{stsAnalysisSort[0].ex_type}</div>
                  <div className="italic-desc">{stsAnalysisSort[1].e_cnt}&nbsp;{stsAnalysisSort[1].ex_type}</div>
                  <div className="italic-desc">{stsAnalysisSort[2].e_cnt}&nbsp;{stsAnalysisSort[2].ex_type}</div>
                </span>
              </div>
            </Row>
          </Col>
        </Col>
      </Row>
    );
  }
  return <div />;
};

class RepoHome extends Component {
  constructor(props) {
    super()
    this.state = {
    };
    this.onChange = this.onChange.bind(this);
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
        publishedStatics: PublicState.publishedStatics
      }));
    }
  }

  render() {
    const features = {
      metadata: {
        fa: 'fa fa-file-code-o',
        title: 'Metadata',
        intro: 'Keep your research data findable and accessible and collect descriptions about the data. Based on DataCite Metadata Scheme 4.0.'
      },
      doi: {
        fa: 'fa fa-id-card-o',
        title: 'DOI',
        intro: 'Tie Digital Object Identifier (DOI) to your research data. This registers your data in DataCite and makes it identifiable, searchable and citable.'
      },
      license: {
        fa: 'fa fa-creative-commons',
        title: 'Licenses',
        intro: 'Choose which license is suitable for your research data to allow others to re-use your data.'
      },
      embargo: {
        fa: 'fa fa-ban',
        title: 'Embargo',
        intro: 'Put an embargo on your data. This allows you to delay the publication of your research data. You can release to make your research data visible to the public whenever you are ready.'
      },
      // usage: {
      //   fa: 'fa fa-bar-chart',
      //   title: 'Usage',
      //   intro: 'Assess your research data and track the published research data......'
      // },
      // oai: {
      //   fa: 'fa fa-tasks',
      //   title: 'OAI Provider',
      //   intro: 'Exposes your research data using the Open Archives Initative Protocol for Metadata Harvesting (OAI-PMH). OAI-PMH is a protocol developed for harvesting metadata and we support representing the metadata of your published research data.'
      // },
      dataQuality: {
        fa: 'fa fa-diamond',
        title: 'Data Quality',
        intro: 'Release your research data and pass an internal review that ensures data quality.'
      },
      peer: {
        fa: 'fa fa-external-link',
        title: 'Peer review',
        intro: 'Before publication, you can share your data with external reviewers or the publishers.'
      },
      store: {
        fa: 'fa fa-database',
        title: 'Storage',
        intro: 'Hosted by an experienced data center, Chemotion repository can store your research data reliably and securely.'
      },
      api: {
        fa: 'fa fa-connectdevelop',
        title: 'APIs',
        intro: 'With Chemotion APIs, transfer data easily from your ELN to the repository.'
      }
    };

    return (
      <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
        <Col md={12}>
          <Row>
            <Col md={3} sm={12}>
              <CardLatestPublish lastPublished={this.state.lastPublished} />
            </Col>
            <Col md={6} sm={12}>
              <CardIntro />
            </Col>
            <Col md={3} sm={12}>
              <StaticsBoard publishedStatics={this.state.publishedStatics} />
            </Col>
          </Row>
          <Row>
            <Col md={2} sm={12}>&nbsp;</Col>
            <Col md={8} sm={12}>
              <Row>
                <Col md={12} sm={12}>
                  <div className="home-title">
                    <span>
                      Features
                    </span>
                  </div>
                </Col>
              </Row>
              <Row className="feature">
                <Col md={4} sm={12}>
                  <HomeFeature fa={features.store.fa} title={features.store.title} intro={features.store.intro} />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature fa={features.metadata.fa} title={features.metadata.title} intro={features.metadata.intro} />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature fa={features.doi.fa} title={features.doi.title} intro={features.doi.intro} />
                </Col>
              </Row>
              <Row className="feature">
                <Col md={4} sm={12}>
                  <HomeFeature fa={features.license.fa} title={features.license.title} intro={features.license.intro} />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature fa={features.dataQuality.fa} title={features.dataQuality.title} intro={features.dataQuality.intro} />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature fa={features.embargo.fa} title={features.embargo.title} intro={features.embargo.intro} />
                </Col>
              </Row>
              <Row className="feature">
                <Col md={2} sm={12}>
                  <div />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature fa={features.peer.fa} title={features.peer.title} intro={features.peer.intro} />
                </Col>
                <Col md={4} sm={12}>
                  <HomeFeature fa={features.api.fa} title={features.api.title} intro={features.api.intro} />
                </Col>
                <Col md={2} sm={12}>
                  <div />
                </Col>
              </Row>
            </Col>
            <Col md={2} sm={12}>&nbsp;</Col>
          </Row>
          <Row className="card-partners">
            <Col md={12} sm={12}>
              <Row>
                <Col md={12} sm={12}>
                  <div className="home-title">
                    <span>
                      Partners, Affiliations, APIs
                    </span>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={12} sm={12}>
                  <div className="partner-row" >
                    { Infos.map((info, index) => PartnersInfo(info, index)) }
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Col>
      </Row>
    );
  }
}

export default RepoHome;
