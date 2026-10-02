import React, { useEffect, useState } from 'react';
import {
  XAxis, YAxis,
  HorizontalGridLines,
  VerticalBarSeries, LineSeries, MarkSeries, LabelSeries,
  DiscreteColorLegend, FlexibleWidthXYPlot, Hint,
} from 'react-vis';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';

const COLORS = {
  Collection: '#6f42c1',
  Reaction: '#17a2b8',
  Sample: '#fd7e14',
  Container: '#f1c40f',
};
const LINE_COLOR = '#0c8599';
const STACK_ORDER = ['Collection', 'Reaction', 'Sample', 'Container'];
const PLOT_HEIGHT = 420;
const PLOT_MARGIN = {
  left: 60, right: 60, top: 20, bottom: 50,
};

const RepoYearlyPublicationChart = () => {
  const [data, setData] = useState({
    years: [], series: {}, totals: [], cumulative: [],
  });
  const [hint, setHint] = useState(null);

  useEffect(() => {
    PublicFetcher.yearlyPublicationStats()
      .then((json) => {
        if (json) setData(json);
      })
      .catch(err => console.log('error while loading yearly publication stats, message =', err));
  }, []);

  const { years, series, cumulative } = data;
  if (!years.length) return null;

  const stackTotals = years.map((_, i) => (
    STACK_ORDER.reduce((sum, k) => sum + ((series[k] && series[k][i]) || 0), 0)
  ));
  const yMaxBar = Math.max(1, ...stackTotals);
  const yMaxLine = Math.max(1, ...cumulative);
  const lineRatio = yMaxBar / yMaxLine;
  const yDomainTop = yMaxBar + Math.ceil(yMaxBar * 0.15);

  const barData = key => (series[key] || []).map((v, i) => ({
    x: years[i], y: v, value: v, kind: key,
  }));

  const segmentLabels = (key) => {
    const idx = STACK_ORDER.indexOf(key);
    const below = STACK_ORDER.slice(0, idx);
    return years.map((yr, i) => {
      const v = (series[key] && series[key][i]) || 0;
      const cumBelow = below.reduce((s, k) => s + ((series[k] && series[k][i]) || 0), 0);
      return { x: yr, y: cumBelow + (v / 2), label: v > 0 ? String(v) : '' };
    });
  };

  const lineData = cumulative.map((y, i) => ({
    x: years[i], y: y * lineRatio, value: y, kind: 'Total',
  }));
  const lineLabels = cumulative.map((y, i) => ({
    x: years[i],
    y: Math.min((y * lineRatio) + (yDomainTop * 0.04), yDomainTop),
    label: String(y),
  }));

  return (
    <div className="repo-yearly-chart">
      <div className="repo-yearly-chart-header">
        <h3>Publications per year</h3>
        <span className="repo-yearly-chart-sub">
          Yearly counts of published collections, reactions, samples and containers, with cumulative total
        </span>
      </div>
      <DiscreteColorLegend
        orientation="horizontal"
        items={[
          ...STACK_ORDER.map(key => ({ title: key, color: COLORS[key] })),
          { title: 'Total', color: LINE_COLOR },
        ]}
      />
      <div style={{ position: 'relative' }}>
        <FlexibleWidthXYPlot
          stackBy="y"
          height={PLOT_HEIGHT}
          margin={PLOT_MARGIN}
          xType="ordinal"
          yDomain={[0, yDomainTop]}
        >
          <HorizontalGridLines />
          <XAxis />
          <YAxis tickFormat={v => (Number.isInteger(v) ? v : '')} />
          <YAxis
            orientation="right"
            tickFormat={v => Math.round(v / lineRatio)}
          />
          {STACK_ORDER.map(key => (
            <VerticalBarSeries
              key={key}
              data={barData(key)}
              color={COLORS[key]}
              onValueMouseOver={v => setHint(v)}
              onValueMouseOut={() => setHint(null)}
            />
          ))}
        </FlexibleWidthXYPlot>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
        }}
        >
          <FlexibleWidthXYPlot
            height={PLOT_HEIGHT}
            margin={PLOT_MARGIN}
            xType="ordinal"
            yDomain={[0, yDomainTop]}
          >
            <LineSeries data={lineData} color={LINE_COLOR} strokeWidth={2} />
            <MarkSeries
              data={lineData}
              color={LINE_COLOR}
              size={5}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onValueMouseOver={v => setHint(v)}
              onValueMouseOut={() => setHint(null)}
            />
            <LabelSeries
              data={lineLabels}
              labelAnchorX="middle"
              labelAnchorY="text-after-edge"
              style={{
                fontSize: 11, fill: LINE_COLOR, fontWeight: 'bold', pointerEvents: 'none',
              }}
            />
            {STACK_ORDER.map(key => (
              <LabelSeries
                key={`lbl-${key}`}
                data={segmentLabels(key)}
                labelAnchorX="middle"
                labelAnchorY="central"
                style={{ fontSize: 10, fill: '#222', pointerEvents: 'none' }}
              />
            ))}
            {hint && (
              <Hint value={hint}>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{hint.x}</div>
                  <div>
                    {hint.kind}
                    :
                    {' '}
                    {hint.value}
                  </div>
                </div>
              </Hint>
            )}
          </FlexibleWidthXYPlot>
        </div>
      </div>
    </div>
  );
};

export default RepoYearlyPublicationChart;
