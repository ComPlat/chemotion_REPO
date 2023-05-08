import React from 'react';
import { Button } from 'react-bootstrap';
import { Citation, literatureContent, RefByUserInfo } from '../LiteratureCommon';
import { ChemotionId, CommentBtn, Doi } from '../../libHome/RepoCommon';

const PublicSample = (_props) => {
  const {
    canComment, embargo, handleAnalysesLink, handleCommentBtn, handleMaterialLink, isPublished, element, sample, pubData
  } = _props;

  const analyses = sample?.analyses?.children?.[0]?.children ?? [];
  const references = sample.literatures ? sample.literatures.map(lit => (
    <li key={`li_${lit.id}`} style={{ display: 'flex' }}>
      <RefByUserInfo info={lit.ref_added_by} litype={lit.litype} />&nbsp;
      <Citation key={lit.id} literature={lit} />
    </li>
  )) : [];

  let sampleTypeDescription = 'Consists of molecule with defined structure';
  if (sample.decoupled && element.molecule.inchikey === 'DUMMY') {
    sampleTypeDescription = 'Includes only undefined structural components';
  } else if (sample.decoupled && element.molecule.inchikey !== 'DUMMY') {
    sampleTypeDescription = 'Includes a fragment with defined structure';
  }

  const referencesText = canComment && sample.literatures
    ? sample.literatures.map(lit => literatureContent(lit, true)).join('')
    : '';

  const reactionLink = sample.reaction_ids?.length > 0 ? (
    <>
      &nbsp;
      <Button id="public-sample-reaction-link" bsStyle="link" onClick={() => { window.location = `/home/publications/reactions/${sample.reaction_ids[0]}`; }}>
        Is Product of a reaction <i className="icon-reaction" />
      </Button>
    </>
  ) : null;


  const analyticalLink = analyses.length > 0 ? (
    <>
      {reactionLink ? ',' : ''}&nbsp;&nbsp;
      <Button id="public-sample-analytical-link" bsStyle="link" onClick={handleAnalysesLink}>
        has analytical data
      </Button>
    </>
  ) : null;

  const hasData = !!(sample.xvial && sample.xvial !== '');
  const materialLink = hasData ? (
    <>
      {analyticalLink ? ',' : ''}&nbsp;&nbsp;
      <Button id="public-sample-material-link" bsStyle="link" onClick={handleMaterialLink}>
        has a record as physically available material
      </Button>
    </>
  ) : null;

  return (
    <div className="repo-public-sample-info">
      <b>Sample type: </b>{sampleTypeDescription}
      <Doi type="sample" id={sample.id} doi={sample.doi} isPublished={isPublished} />
      <ChemotionId id={pubData.id} type="sample" />
      {embargo}
      <h5>
        <b>Relations of this sample: </b>{reactionLink}{analyticalLink}{materialLink}
      </h5>
      <br />
      <h5>
        <span>
          <b>Reference{references.length > 1 ? 's' : null} in the Literature: </b>
          <CommentBtn {..._props} field="Reference" orgInfo={referencesText} onShow={handleCommentBtn} />
          <div><div>{references}</div></div>
        </span>
      </h5>
    </div>
  );
};

export default PublicSample;
