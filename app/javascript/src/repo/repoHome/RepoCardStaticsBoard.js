import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PublicActions from 'src/repo/actions/PublicActions';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';
import { setPublicationSearchSeed } from 'src/repo/chemrepo/publicationSearch/searchSeed';

const formatCount = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return n;
  if (num >= 10000) return `${Math.round(num / 1000)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num;
};

const Legend = ({ items }) => (
  <span className="donut-legend">
    {items.map(it => (
      <span key={it.label} className="donut-legend-row">
        <span className="donut-legend-num">{it.value}</span>
        <span className="donut-legend-lbl">{it.label}</span>
      </span>
    ))}
  </span>
);

const RepoCardStaticsBoard = (params) => {
  const { publishedStatics } = params;
  if (!publishedStatics || publishedStatics.length === 0) return <div />;

  const stsSample = publishedStatics.find(p => (p.el_type === 'sample' && p.ex_type === 'sample'));
  const stsSampleReview = publishedStatics.find(p => (p.el_type === 'sample' && p.ex_type === 'sample-review'));
  const stsSampleEmbargo = publishedStatics.find(p => (p.el_type === 'sample' && p.ex_type === 'sample-embargo'));
  const stsReaction = publishedStatics.find(p => (p.el_type === 'reaction' && p.ex_type === 'reaction'));
  const stsReactionReview = publishedStatics.find(p => (p.el_type === 'reaction' && p.ex_type === 'reaction-review'));
  const stsReactionEmbargo = publishedStatics.find(p => (p.el_type === 'reaction' && p.ex_type === 'reaction-embargo'));
  const stsAnalysis = publishedStatics.filter(p => p.el_type === 'analysis');
  const stsAnalysisSort = stsAnalysis.sort((a, b) => a.e_cnt - b.e_cnt).reverse();
  const stsAnalysisCnt = stsAnalysisSort.length > 0
    ? stsAnalysisSort.map(e => Number(e.e_cnt)).reduce((acc, cur) => acc + cur, 0)
    : 0;

  const tooltipView = <Tooltip id="id_icon_tip">Click to view publications</Tooltip>;
  const goPublications = (elementType) => {
    setPublicationSearchSeed({ filters: { elementTypes: [elementType] } });
    PublicActions.openRepositoryPage(`publications=${RepoNavListTypes.REACTION}`);
  };

  const buildLegend = (published, review, embargo) => [
    { label: 'published', value: published ? Number(published.e_cnt) : 0 },
    { label: 'review', value: review ? Number(review.e_cnt) : 0 },
    { label: 'embargo', value: embargo ? Number(embargo.e_cnt) : 0 },
  ].filter(s => s.value > 0);

  const SampleCol = (
    <OverlayTrigger placement="top" overlay={tooltipView}>
      <Button
        variant="link"
        className="donut-col donut-col-link"
        onClick={() => goPublications('Sample')}
      >
        <span className="donut-col-main">
          <span className="stat-icon-slot">
            <i className="icon-sample" aria-hidden />
          </span>
          <span className="donut-col-headline">
            <span className="donut-col-label">Samples</span>
            <span className="donut-col-value">
              {formatCount(stsSample ? stsSample.e_cnt : 0)}
            </span>
          </span>
        </span>
        <Legend items={buildLegend(stsSample, stsSampleReview, stsSampleEmbargo)} />
      </Button>
    </OverlayTrigger>
  );

  const ReactionCol = (
    <OverlayTrigger placement="top" overlay={tooltipView}>
      <Button
        variant="link"
        className="donut-col donut-col-link"
        onClick={() => goPublications('Reaction')}
      >
        <span className="donut-col-main">
          <span className="stat-icon-slot">
            <i className="icon-reaction" aria-hidden />
          </span>
          <span className="donut-col-headline">
            <span className="donut-col-label">Reactions</span>
            <span className="donut-col-value">
              {formatCount(stsReaction ? stsReaction.e_cnt : 0)}
            </span>
          </span>
        </span>
        <Legend items={buildLegend(stsReaction, stsReactionReview, stsReactionEmbargo)} />
      </Button>
    </OverlayTrigger>
  );

  const analysisLegend = stsAnalysisSort.slice(0, 3).map(a => ({
    label: a.ex_type,
    value: Number(a.e_cnt),
  }));

  const AnalysisCol = stsAnalysisSort.length > 0 && (
    <div className="donut-col">
      <span className="donut-col-main">
        <span className="stat-icon-slot">
          <i className="fa fa-area-chart" aria-hidden />
        </span>
        <span className="donut-col-headline">
          <span className="donut-col-label">Analyses</span>
          <span className="donut-col-value">{formatCount(stsAnalysisCnt)}</span>
        </span>
      </span>
      <Legend items={analysisLegend} />
    </div>
  );

  return (
    <div className="repo-stat-strip">
      {SampleCol}
      {ReactionCol}
      {AnalysisCol}
    </div>
  );
};

export default RepoCardStaticsBoard;
