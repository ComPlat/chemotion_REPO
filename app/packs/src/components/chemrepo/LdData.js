import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';

const LdData = ({ type, id }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    PublicFetcher.getLD(type, id).then((result) => {
      setData(result);
    });
  }, []);

  return (
    <>
      { data ? <script type="application/ld+json">{JSON.stringify(data)}</script> : null }
    </>
  );
};

LdData.propTypes = { type: PropTypes.string.isRequired, id: PropTypes.number.isRequired };
export default LdData;
