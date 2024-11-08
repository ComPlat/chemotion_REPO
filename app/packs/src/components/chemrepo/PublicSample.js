import React from 'react';
import { Button } from 'react-bootstrap';
import { Citation, literatureContent, RefByUserInfo } from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import { ChemotionId, CommentBtn, Doi } from 'src/repoHome/RepoCommon';
import { formatPhysicalProps } from 'src/components/chemrepo/publication-utils';
import RepoConst from 'src/components/chemrepo/common/RepoConst';
import DecoupleInfo from 'src/repoHome/DecoupleInfo';

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
  if (sample.decoupled && element.molecule.inchikey === RepoConst.INCHIKEY_DUMMY) {
    sampleTypeDescription = 'Includes only undefined structural components';
  } else if (sample.decoupled && element.molecule.inchikey !== RepoConst.INCHIKEY_DUMMY) {
    sampleTypeDescription = 'Includes a fragment with defined structure';
  }

  const referencesText = canComment && sample.literatures
    ? sample.literatures.map(lit => literatureContent(lit, true)).join('')
    : '';

  const { meltingPoint, boilingPoint, showPhysicalProps } = formatPhysicalProps(sample);
  const referencesPhysicalProp = canComment && (!!meltingPoint || !!boilingPoint)
  ? `Melting point:[${meltingPoint}]; Boiling point:[${boilingPoint}]`
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
      <DecoupleInfo sample={sample} molecule={element.molecule} />
      <br />
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
      {
        (!isPublished || showPhysicalProps) && (
          <>
          <br />
          <div>
            <b>Physical Properties:</b>
            <CommentBtn {..._props} field="Physical Properties" orgInfo={referencesPhysicalProp} onShow={handleCommentBtn} />
            <div>Melting point: {meltingPoint}</div>
            <div>Boiling point: {boilingPoint}</div>
          </div>
          </>
        )
      }
    </div>
  );
};

export default PublicSample;
