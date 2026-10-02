import React from 'react';
import { Button } from 'react-bootstrap';
import { Citation, literatureContent, RefByUserInfo } from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import { ChemotionId, CommentBtn, Doi } from 'src/repo/repoHome/RepoCommon';
import { formatPhysicalProps } from 'src/repo/chemrepo/publication-utils';
import RepoConst from 'src/repo/chemrepo/common/RepoConst';
import DecoupleInfo from 'src/repo/repoHome/DecoupleInfo';
import FundingDisplay from 'src/repo/chemrepo/funding/FundingDisplay';
import AddRefToPublication from 'src/repo/chemrepo/AddRefToPublication';
import PublicActions from 'src/repo/actions/PublicActions';

const PublicSample = (_props) => {
  const {
    canComment, embargo, handleAnalysesLink, handleCommentBtn, handleMaterialLink,
    isLogin, isPublished, isPublisher, isReviewer, onRefresh, element, sample, pubData,
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
      <Button id="public-sample-reaction-link" variant="link" onClick={() => { window.location = `/home/publications/reactions/${sample.reaction_ids[0]}`; }}>
        Is Product of a reaction <i className="icon-reaction fs-5" />
      </Button>
    </>
  ) : null;


  const analyticalLink = analyses.length > 0 ? (
    <>
      {reactionLink ? ',' : ''}&nbsp;&nbsp;
      <Button id="public-sample-analytical-link" variant="link" onClick={handleAnalysesLink}>
        has analytical data
      </Button>
    </>
  ) : null;

  const hasData = !!(sample.xvial && sample.xvial !== '');
  const materialLink = hasData ? (
    <>
      {analyticalLink ? ',' : ''}&nbsp;&nbsp;
      <Button id="public-sample-material-link" variant="link" onClick={handleMaterialLink}>
        has a record as physically available material
      </Button>
    </>
  ) : null;

  return (
    <div className="repo-public-sample-info">
      <span className="fw-bold mb-2">Sample type: </span>{sampleTypeDescription}
      <DecoupleInfo sample={sample} molecule={element.molecule} />
      <br />
      <Doi type="sample" id={sample.id} zipUrl={sample.zip_download_url} chemotionZipUrl={sample.chemotion_zip_url} doi={sample.doi} isPublished={isPublished} pid={pubData.id} />
      {sample.concept && <Doi type="sample" id={sample.id} doi={sample.concept.doi.full_doi} isPublished={isPublished} concept={true} pid={pubData.id} />}
      <ChemotionId id={pubData.id} type="sample" />
      {!reactionLink && sample.name && <h5><b>Sample name:</b>&nbsp;{sample.name}</h5>}
      {embargo}
      <div className="d-flex align-items-center">
        <span className="fw-bold">Relations of this sample: </span>{reactionLink}{analyticalLink}{materialLink}
      </div>
      <br />
      <h6>
        <span>
          <b>Reference{references.length > 1 ? 's' : null} in the Literature: </b>
          <CommentBtn {..._props} field="Reference" orgInfo={referencesText} onShow={handleCommentBtn} />
          <div><div>{references}</div></div>
          {(isPublisher || isReviewer || (isLogin && isPublished)) && (
            <AddRefToPublication
              elementType="sample"
              elementId={sample.id}
              isLogin={!!(isLogin && isPublished)}
              isPublisher={isPublisher}
              isReviewer={isReviewer}
              onAdded={typeof onRefresh === 'function'
                ? onRefresh
                : () => PublicActions.displayMolecule(
                  element?.molecule?.id ?? sample.molecule_id,
                  pubData.id,
                )}
            />
          )}
        </span>
      </h6>
      {sample.fundingReferences && sample.fundingReferences.length > 0 && (
        <>
          <h5>
            <b>Funding References:</b>
          </h5>
          <FundingDisplay elementId={sample.id} elementType="Sample" />
        </>
      )}
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
