import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';

const LdData = ({ type, id }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    PublicFetcher.getLD(type, id)
      .then(result => {
        // Basic validation - ensure we have valid data
        if (result && typeof result === 'object') {
          setData(result);
        }
      })
      .catch(error => {
        console.error('Error fetching LD data:', error);
      });
  }, [type, id]);

  // Secure JSON-LD content with proper escaping
  const secureContent = useMemo(() => {
    if (!data) return null;

    try {
      // Critical: Escape dangerous characters to prevent XSS
      return JSON.stringify(data)
        .replace(/</g, '\\u003c') // Prevent </script> injection
        .replace(/>/g, '\\u003e') // Prevent script tag injection
        .replace(/\u2028/g, '\\u2028') // Line separator
        .replace(/\u2029/g, '\\u2029'); // Paragraph separator
    } catch (e) {
      console.error('Error processing JSON-LD:', e);
      return null;
    }
  }, [data]);

  return (
    <span>
      {secureContent && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: secureContent }}
        />
      )}
    </span>
  );
};

LdData.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
};

export default LdData;
