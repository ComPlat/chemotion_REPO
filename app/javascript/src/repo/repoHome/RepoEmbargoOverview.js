/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { AffiliationMap } from 'src/repo/repoHome/RepoReviewCommon';
import RepoConst from 'src/repo/chemrepo/common/RepoConst';
import EmbargoActions from 'src/repo/actions/EmbargoActions';
import OrcidIcon from 'src/repo/chemrepo/common/Orcid';

const stateClass = {
  pending: 'bg-warning',
  reviewed: 'bg-primary',
  accepted: 'bg-success'
};

const renderStatusBlock = ({ states, state }) => {
  return (
    <div className="status-block">
       <div className={`status-label ${stateClass[state]}`}>
         {state}
       </div>
       <div className="status-values">
         <div className="val-item">
            <i className="icon-reaction" aria-hidden="true" title="Reaction" />
            <span className="val-num">{states[state].Reaction || 0}</span>
         </div>
         <div className="val-item">
            <i className="icon-sample" aria-hidden="true" title="Sample" />
            <span className="val-num">{states[state].Sample || 0}</span>
         </div>
       </div>
    </div>
  );
};

const renderAffiliations = ({ affiliations, affiliationMap }) => {
  const names = [];
  Object.keys(affiliationMap || {}).forEach((affiliationId) => {
    const ind = affiliationMap[affiliationId];
    if (!names[ind]) {
      names[ind] = affiliations[affiliationId];
    }
  });

  return names.map((e, i) =>
    i === 0 ? null : (
      <div className="aff-item" key={uuid.v4()} style={{ marginBottom: '2px' }}>
        {i}. {e}
      </div>
    )
  );
};

const renderAuthors = ({ creators, affiliationMap }) => {
  if (!creators || creators.length === 0) return null;
  return creators.map(creator => (
    <div className="author-item-simple" key={`auth_${creator.id}_${uuid.v4()}`} style={{ marginBottom: '2px' }}>
      {OrcidIcon({ orcid: creator.ORCID })}
      {creator.name}
      <sup>
        {creator.affiliationIds &&
          creator.affiliationIds
            .map(e => affiliationMap[e])
            .sort()
            .join(',')}
      </sup>
    </div>
  ));
};

const RecordRow = ({ rec, index, currentUser }) => {
  const [authorsExpanded, setAuthorsExpanded] = useState(false);
  const [commentExpanded, setCommentExpanded] = useState(false);

  const history = rec?.review?.history || [];
  const comment = [...history].reverse().find(h => h.comment)?.comment || '';
  const { element_id: recId, taggable_data: taggableData } = rec;
  const { element_dois: dois = [] } = taggableData;
  const affiliationMap = AffiliationMap(taggableData.affiliation_ids, taggableData.affiliations);
  const states = { reviewed: {}, accepted: {}, pending: {} };

  dois.forEach(item => {
    const { state, element_type: elementType } = item;
    if (!states[state]) states[state] = {};
    if (!states[state][elementType]) states[state][elementType] = 0;
    states[state][elementType] += 1;
  });

  const canViewDetail =
    currentUser.is_reviewer ||
    currentUser.is_submitter ||
    (rec?.review?.submitters || []).includes(currentUser?.id) ||
    currentUser?.type === RepoConst.U_TYPE.ANONYMOUS;

  return (
    <div className="embargo-row" key={index}>
        {/* RECORD ID COLUMN */}
        <div
            className={canViewDetail ? "record-id-col" : "record-id-col disabled"}
            onClick={() => canViewDetail && EmbargoActions.getEmbargoElements(recId)}
            role="button"
            tabIndex={0}
        >
            {taggableData.label}
        </div>

        {/* LEAD RESEARCHER COLUMN */}
        <div className="leader-col">
            <div className="leader-avatar">
                <i className="fa fa-user-circle" aria-hidden="true" />
            </div>
            <div className="leader-info">
                <div className="leader-name">
                    {OrcidIcon({ orcid: taggableData.contributors?.ORCID })}
                    {taggableData.contributors?.name || 'N/A'}
                </div>
                <div className="leader-aff">
                    {taggableData.contributors?.affiliations?.join('; ')}
                </div>
            </div>
        </div>

        {/* AUTHORS & AFFILIATIONS COLUMN */}
        <div className="authors-col">
            <div className={`authors-compact ${authorsExpanded ? 'expanded' : ''}`}>
                {renderAuthors({ creators: taggableData.creators, affiliationMap })}
                {renderAffiliations({ affiliations: taggableData.affiliations, affiliationMap })}
            </div>
            {((taggableData.creators?.length || 0) + (Object.keys(affiliationMap || {}).length || 0) > 3) && (
                <button className="toggle-btn" onClick={() => setAuthorsExpanded(!authorsExpanded)}>
                    {authorsExpanded ? 'Show Less' : 'Show More'}
                </button>
            )}
        </div>

        {/* OVERVIEW COLUMN */}
        <div className="overview-col">
            {renderStatusBlock({ states, state: 'pending' })}
            {renderStatusBlock({ states, state: 'reviewed' })}
            {renderStatusBlock({ states, state: 'accepted' })}
        </div>

        {/* COMMENT COLUMN */}
        <div className="comment-col">
            <div className={`comment-compact ${commentExpanded ? 'expanded' : ''}`}>
                {comment}
            </div>
            {comment.length > 50 && (
                <button className="toggle-btn" onClick={() => setCommentExpanded(!commentExpanded)}>
                    {commentExpanded ? 'Show Less' : 'Show More'}
                </button>
            )}
        </div>
    </div>
  );
};

RecordRow.propTypes = {
  rec: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  currentUser: PropTypes.object.isRequired,
};

function RepoEmbargoOverview(props) {
  const { collections, currentUser } = props;

  if (collections?.length === 0) return null;

  return (
    <div className="repo-embargo-container">
      <div className="embargo-table-scroll-wrapper">
          <div className="embargo-table-header">
             <div>Embargo ID</div>
             <div>Contributor</div>
             <div>Authors &amp; Affiliations</div>
             <div>Overview</div>
             <div>Comment</div>
          </div>
          {collections.map((m, index) =>
            <RecordRow key={index} rec={m} index={index} currentUser={currentUser} />
          )}
      </div>
    </div>
  );
}

RepoEmbargoOverview.propTypes = {
  collections: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUser: PropTypes.object.isRequired,
};

export default RepoEmbargoOverview;
