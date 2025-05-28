import React, { useEffect, useContext } from 'react';
import { observer } from 'mobx-react';
import { RepoStoreContext } from 'src/stores/RepoRootStore';

const FundingDisplay = observer(({ elementType, elementId }) => {
  const { fundingStore } = useContext(RepoStoreContext);
  const { fundings, loadFundings, loading, error, refreshFlag } = fundingStore;

  useEffect(() => {
    if (elementType && elementId) {
      loadFundings(elementType, elementId, true);
    }
  }, [loadFundings, elementType, elementId, refreshFlag]);

  const fundingKey = `${elementType}_${elementId}`;
  const currentFundings = fundings.get ? fundings.get(fundingKey) || [] : [];

  if (loading) return <div>Loading funding information...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!currentFundings || currentFundings.length === 0) return null;

  return (
    <ul style={{ listStyle: 'none' }}>
      {currentFundings.map((fund, idx) => (
        <li
          key={`funding_${fund.fundingId || idx}`}
          style={{
            display: 'block',
            padding: '8px 0px 0px 0px',
            borderBottom:
              idx < currentFundings.length - 1 ? '1px solid #eee' : 'none',
          }}
        >
          <div style={{ marginBottom: '4px' }}>
            <strong>
              <i className="fa fa-trophy" /> Funded by:
            </strong>{' '}
            {fund.funderName}
            {fund.funderIdentifier && fund.funderIdentifierType && (
              <span
                style={{
                  marginLeft: '8px',
                  color: '#666',
                  fontSize: '0.9em',
                }}
              >
                ({fund.funderIdentifierType}: {fund.funderIdentifier})
              </span>
            )}
          </div>
          {(fund.awardTitle || fund.awardNumber || fund.awardUri) && (
            <div
              style={{
                fontSize: '0.9em',
                color: '#555',
                marginLeft: '16px',
              }}
            >
              <div>
                <strong>Award:</strong> {fund.awardTitle}
                {(fund.awardUri || fund.awardNumber) && (
                  <>
                    {' '}
                    (
                    {fund.awardUri && (
                      <a
                        href={fund.awardUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#337ab7' }}
                      >
                        {fund.awardUri}
                      </a>
                    )}
                    {fund.awardUri && fund.awardNumber && '; '}
                    {fund.awardNumber && <>number: {fund.awardNumber}</>})
                  </>
                )}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
});

export default FundingDisplay;
