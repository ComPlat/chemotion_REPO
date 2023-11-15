import React from 'react';
import { Carousel } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import PublicActions from 'src/stores/alt/repo/actions/PublicActions';

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

const RepoCardLatestPublish = ({ lastPublished }) => {
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
    return (
      <div className="card-well-competition card-latest">
        <Carousel className="carl-spt" indicators={false} interval={6000}>
          <Carousel.Item className="carl-spt-item">
            <div className="img">
              <a title="Click to view details" onClick={() => PublicActions.displayMolecule(sample.molecule.id)}>
                <SVG src={svgPathSample} key={svgPathSample} className="carl-sample" />
              </a>
              <Carousel.Caption className="caption">
                Published {timeInterval(pubTagSample.published_at || pubTagSample.doi_reg_at || pubTagSample.queued_at)} by {sample.contributor}
              </Carousel.Caption>
            </div>
          </Carousel.Item>
          <Carousel.Item className="carl-spt-item">
            <div className="img">
              <a title="Click to view details" onClick={() => PublicActions.displayReaction(reaction.id)}>
                <SVG src={svgPathReaction} key={svgPathReaction} className="carl-sample" />
              </a>
              <Carousel.Caption className="caption">
                Published {timeInterval(pubTagReaction.published_at || pubTagReaction.doi_reg_at || pubTagReaction.queued_at)} by {reaction.contributor}
              </Carousel.Caption>
            </div>
          </Carousel.Item>
        </Carousel>
      </div>
    );
  }
  return <div />;
};

export default RepoCardLatestPublish;
