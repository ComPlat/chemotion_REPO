import React from 'react';
import { Carousel } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import PublicActions from 'src/repo/actions/PublicActions';

const timeInterval = (_date) => {
  let date = _date;
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
  const seconds = Math.floor((new Date() - date) / 1000);
  const intrvlTypes = [
    [31536000, 'year', 'a'],
    [2592000, 'month', 'a'],
    [604800, 'week', 'a'],
    [86400, 'day', 'a'],
    [3600, 'hour', 'an'],
    [60, 'minute', 'a'],
    [1, 'second', 'a'],
  ];
  let intrvlCount = 0;
  const intrvlType = intrvlTypes.find((e) => {
    intrvlCount = Math.floor(seconds / e[0]);
    return intrvlCount >= 1;
  });
  return `${intrvlCount === 1 ? intrvlType[2] : intrvlCount} ${intrvlType[1]}${intrvlCount > 1 ? 's' : ''} ago`;
};

const publishedAt = (tag) => tag.published_at || tag.doi_reg_at || tag.queued_at;

const renderPublishedItem = ({ key, svgPath, onClick, tag, contributor }) => (
  <Carousel.Item key={key} className="carl-spt-item" style={{ height: '220px' }}>
    <div className="img d-flex flex-column align-items-center justify-content-center" style={{ height: '220px', width: '100%' }}>
      <a title="Click to view details" onClick={onClick} className="d-flex align-items-center justify-content-center" style={{ height: '160px', width: '100%', overflow: 'hidden' }}>
        <SVG
          src={svgPath}
          key={svgPath}
          className="carl-sample"
          style={{ maxHeight: '150px', width: '100%', height: 'auto', objectFit: 'contain' }}
        />
      </a>
      <Carousel.Caption className="caption position-relative text-center py-2" style={{ position: 'relative', bottom: 'auto', background: 'none', overflow: 'hidden', fontSize: '0.85rem', lineHeight: '1.2' }}>
        Published {timeInterval(publishedAt(tag))} by {contributor}
      </Carousel.Caption>
    </div>
  </Carousel.Item>
);

const RepoCardLatestPublish = ({ lastPublished }) => {
  if (!lastPublished) return <div />;
  const { sample, reaction } = lastPublished;
  const sampleSvgPath = sample && (sample.sample_svg_file
    ? `/images/samples/${sample.sample_svg_file}`
    : `/images/molecules/${sample.molecule.molecule_svg_file}`);
  const reactionSvgPath = reaction && `/images/reactions/${reaction.reaction_svg_file}`;

  return (
    <div className="card-well-competition card-latest w-100" style={{ height: '220px', overflow: 'hidden' }}>
      <Carousel className="carl-spt" indicators={false} interval={3000} style={{ height: '220px', width: '100%' }}>
        {sample && renderPublishedItem({
          key: 'sample',
          svgPath: sampleSvgPath,
          onClick: () => PublicActions.displayMolecule(sample.molecule.id),
          tag: sample.tag || {},
          contributor: sample.contributor,
        })}
        {reaction && renderPublishedItem({
          key: 'reaction',
          svgPath: reactionSvgPath,
          onClick: () => PublicActions.displayReaction(reaction.id),
          tag: reaction.tag || {},
          contributor: reaction.contributor,
        })}
      </Carousel>
    </div>
  );
};

export default RepoCardLatestPublish;
