import React from 'react';
import { Button, Col, Row, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';
import RepoNavListTypes from 'src/repoHome/RepoNavListTypes';

const RepoCardStaticsBoard = (params) => {
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
    const tooltipView = <Tooltip id="id_icon_tip">Click to view publications</Tooltip>;
    const pubPage = {
      sample: `publications=${RepoNavListTypes.SAMPLE}`,
      reaction: `publications=${RepoNavListTypes.REACTION}`
    };
    return (
      <Row className="repo-statistic">
        <Col lg={12} md={12} sm={12}>
          <h3 style={{ textAlign: 'center' }}>research data repository</h3>
        </Col>
        <Col lg={12} md={12} sm={12} className="panel panel-info elem-info">
          <Col lg={12} md={12} sm={12} className="panel-heading dtl">
            <Row className="rl">
              <OverlayTrigger placement="top" overlay={tooltipView}>
                <Button className="animation-ring" bsStyle="link" onClick={() => { PublicActions.openRepositoryPage(pubPage.sample); PublicActions.getMolecules({ listType: 'sample' }); }}>
                  <i className="icon-sample" />
                </Button>
              </OverlayTrigger>
              <div className="tit">Samples</div>
            </Row>
          </Col>
          <Col lg={12} md={12} sm={12} className="panel-heading dtl">
            <Row className="rr">
              <div className="cnt">
                {stsSample.e_cnt}{' '}
                <OverlayTrigger placement="top" overlay={tooltipView}>
                  <Button bsStyle="link" onClick={() => { PublicActions.openRepositoryPage(pubPage.sample); PublicActions.getMolecules({ listType: 'sample' }); }}>
                    published
                  </Button>
                </OverlayTrigger>
              </div>
              <div className="italic-desc">{stsSampleReview.e_cnt} under review</div>
              <div className="italic-desc">{stsSampleEmbargo.e_cnt} under embargo</div>
            </Row>
          </Col>
        </Col>
        <Col lg={12} md={12} sm={12} className="panel panel-info elem-info">
          <Col lg={12} md={12} sm={12} className="panel-heading dtl">
            <Row className="rl">
              <OverlayTrigger placement="top" overlay={tooltipView}>
                <Button className="animation-ring" bsStyle="link" onClick={() => { PublicActions.openRepositoryPage(pubPage.reaction); PublicActions.getReactions(); }}>
                  <i className="icon-reaction" />
                </Button>
              </OverlayTrigger>
              <div className="tit">Reactions</div>
            </Row>
          </Col>
          <Col lg={12} md={12} sm={12} className="panel-heading dtl">
            <Row className="rr">
              <div className="cnt">
                {stsReaction.e_cnt}{' '}
                <OverlayTrigger placement="top" overlay={tooltipView}>
                  <Button bsStyle="link" onClick={() => { PublicActions.openRepositoryPage(pubPage.reaction); PublicActions.getReactions(); }}>
                    published
                  </Button>
                </OverlayTrigger>
              </div>
              <div className="italic-desc">{stsReactionReview.e_cnt} under review</div>
              <div className="italic-desc">{stsReactionEmbargo.e_cnt} under embargo</div>
            </Row>
          </Col>
        </Col>
        <Col lg={12} md={12} sm={12} className="panel panel-info elem-info">
          <Col lg={12} md={12} sm={12} className="panel-heading dtl">
            <Row className="rl">
              <i className="fa fa-area-chart i-ext" aria-hidden />
              <div className="tit">Analyses</div>
            </Row>
          </Col>
          <Col lg={12} md={12} sm={12} className="panel-heading dtl">
            <Row className="rr">
              <div className="cnt">{stsAnalysisCnt}&nbsp;<span className="tit">published</span></div>
              <div style={{ display: 'flex' }}>
                <div>Top 3:&nbsp;&nbsp;</div>
                <div className="italic-desc">
                  {stsAnalysisSort[0].e_cnt}&nbsp;{stsAnalysisSort[0].ex_type}
                  <br />
                  {stsAnalysisSort[1].e_cnt}&nbsp;{stsAnalysisSort[1].ex_type}
                  <br />
                  {stsAnalysisSort[2].e_cnt}&nbsp;{stsAnalysisSort[2].ex_type}
                </div>
              </div>
            </Row>
          </Col>
        </Col>
      </Row>
    );
  }
  return <div />;
};

export default RepoCardStaticsBoard;
