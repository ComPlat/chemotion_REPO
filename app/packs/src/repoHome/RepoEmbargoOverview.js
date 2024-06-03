/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { Col, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { AffiliationMap } from 'repo-review-ui';
import { OrcidIcon } from 'src/repoHome/RepoCommon';
import RepoConst from 'src/components/chemrepo/common/RepoConst';
import StateLabel from 'src/components/chemrepo/common/StateLabel';
import EmbargoActions from 'src/stores/alt/repo/actions/EmbargoActions';

const renderAffiliations = ({ affiliations, affiliationMap }) => {
  const names = [];
  Object.keys(affiliationMap).map(affiliationId => {
    const ind = affiliationMap[affiliationId];
    names[ind] = affiliations[affiliationId];
    return null;
  });
  return (
    <div>
      {names.map((e, i) =>
        i === 0 ? null : (
          <div style={{ fontSize: 'small' }} key={uuid.v4()}>
            {i}. {e}
          </div>
        )
      )}
    </div>
  );
};

const renderAuthors = ({ creators, affiliationMap }) => {
  if (!creators) return null;
  return (
    <span>
      {creators.map(creator => (
        <div key={`auth_${creator.id}_${uuid.v4()}`}>
          <OrcidIcon orcid={creator.ORCID} />
          {creator.name}
          <sup>
            {creator.affiliationIds &&
              creator.affiliationIds
                .map(e => affiliationMap[e])
                .sort()
                .join()}
          </sup>
        </div>
      ))}
    </span>
  );
};

const renderOverview = ({ states, state }) => {
  return (
    <Col sm={4} md={4} style={{ display: 'flex', flexDirection: 'column' }}>
      {StateLabel(state)}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-evenly',
        }}
      >
        <div>
          <i className="icon-reaction" aria-hidden="true" />
          {` ${states[state].Reaction || 0} `}
        </div>
        <div>
          <i className="icon-sample" aria-hidden="true" />
          {` ${states[state].Sample || 0}`}
        </div>
      </div>
    </Col>
  );
};

const renderRecord = (rec, index, currentUser) => {
  const history = rec?.review?.history || [];
  const comment = history.length > 1 ? history[history.length - 2].comment : '';
  const { element_id: recId, taggable_data: taggableData } = rec;
  const { element_dois: dois = [] } = taggableData;
  const affiliationMap = AffiliationMap(taggableData.affiliation_ids);
  const states = { reviewed: {}, accepted: {}, pending: {} };

  dois.forEach(item => {
    const {
      label,
      id,
      element_id: elementId,
      state,
      element_type: elementType,
    } = item;
    if (!states[state]) {
      console.log(
        'label, id, elementId, elementType, state=',
        label,
        id,
        elementId,
        elementType,
        state
      );
      states[state] = {};
    }
    if (!states[state][elementType]) {
      states[state][elementType] = 0;
    }
    states[state][elementType] += 1;
  });

  const viewDetailBtn =
    currentUser.is_reviewer ||
    currentUser.is_submitter ||
    (rec?.review?.submitters || []).includes(currentUser?.id) ||
    currentUser?.type === RepoConst.U_TYPE.ANONYMOUS ? (
      <Button
        className="detail-button"
        onClick={() => EmbargoActions.getEmbargoElements(recId)}
      >
        View details
      </Button>
    ) : null;

  const viewComment =
    comment && (currentUser.is_reviewer || currentUser.is_submitter) ? (
      <span
        role="alert"
        className="alert alert-info"
        style={{ fontSize: 'small' }}
      >
        {comment}
      </span>
    ) : null;

  return (
    <Col sm={12} md={12} className="repo-ebg-line" key={index}>
      <Col sm={12} md={12} className="line-title">
        <h3>
          <i className="fa fa-database" aria-hidden="true" />
          {` ${taggableData.label} `}
          {viewDetailBtn}
          &nbsp;
          {viewComment}
        </h3>
      </Col>
      <Col sm={12} md={12}>
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ fontSize: '4em', minWidth: '80px' }}>
            <i className="fa fa-user-circle" aria-hidden="true" />
          </span>
          <span style={{ fontSize: '4em' }}>
            <h3 style={{ fontWeight: 'bolder' }}>
              <OrcidIcon orcid={taggableData.contributors?.ORCID} />
              {` ${taggableData.contributors?.name}`}
            </h3>
            <h4>
              {taggableData.contributors?.affiliations?.map((e, i) => (
                <React.Fragment key={uuid.v4()}>
                  <span style={{ wordWrap: 'break-word' }}>
                    {i + 1}. {e.replace(/,/g, ',\u00A0')}
                  </span>
                  <br />
                </React.Fragment>
              ))}
            </h4>
          </span>
        </div>
      </Col>
      <Col sm={6} md={6}>
        <h4>
          <b>Author(s):</b>
        </h4>{' '}
        {renderAuthors({ creators: taggableData.creators, affiliationMap })}
        {renderAffiliations({
          affiliations: taggableData.affiliations,
          affiliationMap,
        })}
      </Col>
      <Col sm={6} md={6} style={{ fontSize: 'x-large' }}>
        <h4>
          <b>Overview:</b>
        </h4>
        {renderOverview({ states, state: 'pending' })}
        {renderOverview({ states, state: 'reviewed' })}
        {renderOverview({ states, state: 'accepted' })}
      </Col>
    </Col>
  );
};

function RepoEmbargoOverview(props) {
  const { collections, currentUser } = props;

  if (collections?.length === 0) return null;

  const overview = collections.map((m, index) =>
    renderRecord(m, index, currentUser)
  );

  return overview;
}

RepoEmbargoOverview.propTypes = {
  collections: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUser: PropTypes.object.isRequired,
};

export default RepoEmbargoOverview;
