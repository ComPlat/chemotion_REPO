import React from 'react';
import { Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PublicActions from 'src/repo/actions/PublicActions';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';
import { setPublicationSearchSeed } from 'src/repo/chemrepo/publicationSearch/searchSeed';

const buildName = (c) => {
  const parts = [c.first_name, c.last_name].filter(Boolean);
  const full = parts.join(' ').trim();
  return full || c.name_abbreviation || `User #${c.user_id}`;
};

const initials = (c) => {
  const fi = (c.first_name || '').trim().charAt(0);
  const li = (c.last_name || '').trim().charAt(0);
  const combo = `${fi}${li}`.toUpperCase();
  if (combo) return combo;
  return (c.name_abbreviation || '?').slice(0, 2).toUpperCase();
};

const searchByContributor = (c) => {
  setPublicationSearchSeed({ filters: { contributors: [c.user_id] } });
  PublicActions.openRepositoryPage(`publications=${RepoNavListTypes.REACTION}`);
};

const RepoCardTopContributors = ({ topContributors }) => {
  if (!topContributors || topContributors.length === 0) return null;

  return (
    <Card className="repo-top-authors h-100 w-100">
      <Card.Header className="border-0">
        <h3>Top contributors of the past year</h3>
        <span className="repo-top-authors-sub">
          Most prolific submitters of samples and reactions published in the last 365 days
        </span>
      </Card.Header>
      <Card.Body>
        <ol className="repo-top-authors-list">
          {topContributors.map((c, idx) => {
            const rank = idx + 1;
            const tip = (
              <Tooltip id={`tip-contributor-${c.user_id}`}>
                Show publications by {buildName(c)}
              </Tooltip>
            );
            return (
              <li
                key={c.user_id}
                className={`top-author-row top-author-rank-${rank <= 3 ? rank : 'n'}`}
              >
                <OverlayTrigger placement="top" overlay={tip}>
                  <button
                    type="button"
                    className="top-author-btn"
                    onClick={() => searchByContributor(c)}
                  >
                    <span className="top-author-rank">{rank}</span>
                    <span className="top-author-avatar" aria-hidden>
                      {initials(c)}
                    </span>
                    <span className="top-author-name">{buildName(c)}</span>
                    <span className="top-author-count">
                      <span className="top-author-count-num">{c.pub_count}</span>
                      <span className="top-author-count-lbl">
                        publication{c.pub_count === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>
                </OverlayTrigger>
              </li>
            );
          })}
        </ol>
      </Card.Body>
    </Card>
  );
};

export default RepoCardTopContributors;
