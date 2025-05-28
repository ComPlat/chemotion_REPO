import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Alert } from 'react-bootstrap';
import PublicFetcher from 'src/repo/fetchers/PublicFetcher';

// RDF format configurations
const RDF_FORMATS = {
  json: {
    ext: 'json',
    label: 'JSON-LD (.json)',
    fetcher: (type, id) =>
      PublicFetcher.getRDF('jsonld', type, id, {
        responseType: 'jsonld',
        errorPrefix: 'Error fetching JSON-LD',
      }),
    downloader: (type, id) => PublicFetcher.downloadRDF('jsonld', type, id),
    formatData: data => JSON.stringify(data, null, 2),
  },
  ttl: {
    ext: 'ttl',
    label: 'Turtle (.ttl)',
    fetcher: (type, id) =>
      PublicFetcher.getRDF('turtle', type, id, {
        responseType: 'text',
        errorPrefix: 'Error fetching RDF Turtle',
      }),
    downloader: (type, id) => PublicFetcher.downloadRDF('turtle', type, id),
    formatData: data => data,
  },
  nt: {
    ext: 'nt',
    label: 'N-Triples (.nt)',
    fetcher: (type, id) =>
      PublicFetcher.getRDF('ntriples', type, id, {
        responseType: 'text',
        errorPrefix: 'Error fetching RDF N-Triples',
      }),
    downloader: (type, id) => PublicFetcher.downloadRDF('ntriples', type, id),
    formatData: data => data,
  },
};

const FORMAT_KEYS = Object.keys(RDF_FORMATS);

/**
 * RdfDataViewer component provides buttons to view/download RDF data in different formats
 */
const RdfDataViewer = ({ type, id }) => {
  const [rdf, setRdf] = useState({ data: null, format: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRdfData = async formatKey => {
    setLoading(true);
    setError(null);
    try {
      const format = RDF_FORMATS[formatKey];
      const data = await format.fetcher(type, id);
      setRdf({
        data: format.formatData(data),
        format: format.ext,
      });
    } catch (err) {
      setError(err.message);
      setRdf({ data: null, format: null });
    } finally {
      setLoading(false);
    }
  };

  const downloadRdf = formatKey => {
    try {
      const format = RDF_FORMATS[formatKey];
      format.downloader(type, id);
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper function to render buttons for a given action
  const renderButtons = (action, actionText) => (
    <ButtonToolbar>
      {FORMAT_KEYS.map(formatKey => {
        const format = RDF_FORMATS[formatKey];
        const isDisabled = action === fetchRdfData && loading;
        return (
          <Button
            bsStyle="primary"
            key={formatKey}
            onClick={() => action(formatKey)}
            disabled={isDisabled}
          >
            {actionText === 'Download'
              ? `Download ${format.label}`
              : format.label}
          </Button>
        );
      })}
    </ButtonToolbar>
  );

  return (
    <div>
      <div className="mb-3">
        <h5>
          <b>Download RDF Files:</b>
        </h5>
        {renderButtons(downloadRdf, 'Download')}
      </div>

      <div className="mb-3">
        <h5>
          <b>View RDF Data:</b>
        </h5>
        {renderButtons(fetchRdfData, 'View')}
      </div>

      <br />

      {loading && (
        <Alert bsStyle="info">
          Loading RDF data...
          <i className="fa fa-spinner fa-pulse fa-fw" />
        </Alert>
      )}

      {error && (
        <Alert bsStyle="danger">
          <strong>Error:</strong> {error}
          {error.includes('400') && (
            <div>
              <small>
                Note: RDF conversion is only available for Sample and Reaction
                publications. Other publication types are not yet supported.
              </small>
            </div>
          )}
        </Alert>
      )}

      {rdf.data && (
        <div>
          <h5>RDF Data ({rdf.format}):</h5>
          <pre
            style={{
              background: '#f5f5f5',
              padding: '10px',
              border: '1px solid #ddd',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '12px',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
            }}
          >
            {rdf.data}
          </pre>
        </div>
      )}
    </div>
  );
};

RdfDataViewer.propTypes = {
  type: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
};

export default RdfDataViewer;
