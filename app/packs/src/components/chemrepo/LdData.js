import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';

function LdData({ type, id }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    PublicFetcher.getLD(type, id)
      .then(result => {
        setData(result);
      })
      .catch(error => {
        console.error('Error fetching LD data:', error);
      });
  }, [type, id]);

  return (
    <span>
      {data && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      )}
    </span>
  );
}

LdData.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
};

export default LdData;
