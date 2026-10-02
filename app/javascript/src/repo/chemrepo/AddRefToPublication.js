import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Button, Col, Modal, Row,
} from 'react-bootstrap';
import LiteraturesFetcher from 'src/repo/fetchers/LiteraturesFetcher';
import Literature from 'src/models/Literature';
import {
  Citation, LiteralType, LiteratureInput,
  doiValid, sanitizeDoi,
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import { createCitationTypeMap } from 'src/apps/mydb/elements/details/literature/CitationTools';

const Cite = require('citation-js');

const buildEmpty = (elementType) => {
  const keys = Object.keys(createCitationTypeMap(elementType || ''));
  return {
    title: '',
    url: '',
    doi: '',
    doi_isbn: '',
    isbn: '',
    year: '',
    litype: keys[0] || 'citedOwn',
    refs: {},
  };
};

const isDoiReady = (form) => doiValid(form.doi_isbn || '');
const isManualReady = (form) => (
  (form.title || '').trim() !== ''
  && ((form.url || '').trim() !== '' || (form.doi || '').trim() !== '')
);

const AddRefToPublication = ({
  elementType, elementId, isPublisher, isReviewer, onAdded,
}) => {
  if (!isPublisher && !isReviewer) return null;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(buildEmpty(elementType));
  const [msg, setMsg] = useState(null);

  const citationTypeMap = createCitationTypeMap(elementType || '');

  const resetForm = () => {
    setForm(buildEmpty(elementType));
    setMsg(null);
  };

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
    resetForm();
  };

  const handleInputChange = (field, event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const payloadFrom = (lit) => ({
    is_new: true,
    doi: lit.doi ? (sanitizeDoi(lit.doi) || '') : '',
    isbn: lit.isbn || '',
    url: (lit.url || '').trim().replace(/ +/g, ' '),
    title: (lit.title || '').trim().replace(/ +/g, ' '),
    litype: lit.litype,
    refs: lit.refs && Object.keys(lit.refs).length > 0
      ? { bibtex: lit.refs.bibtex, bibliography: lit.refs.bibliography }
      : undefined,
  });

  const postReference = async (payload) => {
    await LiteraturesFetcher.postElementReference({
      element: { type: elementType, id: elementId },
      literature: payload,
    });
    if (typeof onAdded === 'function') onAdded();
    setForm(buildEmpty(elementType));
    setMsg(null);
    setBusy(false);
    setOpen(false);
  };

  const fetchDoiAndAdd = async () => {
    const rawDoi = form.doi_isbn;
    if (!doiValid(rawDoi)) return;
    setBusy(true);
    setMsg(null);
    try {
      const json = await Cite.async(sanitizeDoi(rawDoi));
      let enriched = { ...form, doi: rawDoi };
      if (json && json.data && json.data.length > 0) {
        const data = json.data[0];
        const citation = new Cite(data);
        enriched = {
          ...enriched,
          title: data.title || enriched.title || '',
          year: (data.issued && data.issued['date-parts'] && data.issued['date-parts'][0]) || enriched.year,
          refs: {
            bibtex: citation.format('bibtex'),
            bibliography: json.format('bibliography'),
          },
        };
      }
      await postReference(payloadFrom(enriched));
    } catch (err) {
      const text = (err && err.error) || `Could not fetch metadata for DOI ${rawDoi}.`;
      setMsg({ variant: 'danger', text });
      setBusy(false);
    }
  };

  const manualAdd = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await postReference(payloadFrom(form));
    } catch (err) {
      const text = (err && err.error) || 'Could not add reference.';
      setMsg({ variant: 'danger', text });
      setBusy(false);
    }
  };

  const citationLiterature = new Literature({
    title: form.title,
    url: form.url,
    doi: form.doi,
    isbn: form.isbn,
    year: form.year,
    refs: form.refs,
    litype: form.litype,
  });

  return (
    <div className="repo-add-reference mt-2">
      <Button size="sm" variant="outline-primary" onClick={() => setOpen(true)}>
        <i className="fa fa-plus" />&nbsp;Add reference
      </Button>
      <Modal show={open} onHide={handleClose} backdrop="static" size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Add reference</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-2">
            <Col xs={8}>
              <LiteratureInput
                literature={form}
                handleInputChange={handleInputChange}
                field="doi_isbn"
                readOnly={busy}
                placeholder="DOI: 10.... or http://dx.doi.org/10..."
              />
            </Col>
            <Col xs={3}>
              <LiteralType
                val={form.litype}
                handleInputChange={handleInputChange}
                disabled={busy}
                citationMap={citationTypeMap}
              />
            </Col>
            <Col xs={1} className="d-flex align-items-center justify-content-center">
              <Button
                variant="primary"
                size="sm"
                disabled={!isDoiReady(form) || busy}
                onClick={fetchDoiAndAdd}
                title="Fetch metadata for this DOI and add the reference"
              >
                <i className="fa fa-plus" />
              </Button>
            </Col>
          </Row>
          <Row className="mb-2">
            <Col>
              <Citation literature={citationLiterature} />
            </Col>
          </Row>
          <Row className="mb-2">
            <Col xs={7}>
              <LiteratureInput
                literature={form}
                handleInputChange={handleInputChange}
                field="title"
                readOnly={busy}
                placeholder="Title..."
              />
            </Col>
            <Col xs={4}>
              <LiteratureInput
                literature={form}
                handleInputChange={handleInputChange}
                field="url"
                readOnly={busy}
                placeholder="URL..."
              />
            </Col>
            <Col xs={1} className="d-flex align-items-center justify-content-center">
              <Button
                variant="primary"
                size="sm"
                disabled={!isManualReady(form) || busy}
                onClick={manualAdd}
                title="Add reference from title/URL"
              >
                <i className="fa fa-plus" />
              </Button>
            </Col>
          </Row>
          {msg && (
            <Alert className="mt-2 mb-0 py-1" variant={msg.variant}>
              {msg.text}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" disabled={busy} onClick={resetForm}>
            Clear
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

AddRefToPublication.propTypes = {
  elementType: PropTypes.oneOf(['sample', 'reaction', 'research_plan']).isRequired,
  elementId: PropTypes.number.isRequired,
  isPublisher: PropTypes.bool,
  isReviewer: PropTypes.bool,
  onAdded: PropTypes.func,
};

AddRefToPublication.defaultProps = {
  isPublisher: false,
  isReviewer: false,
  onAdded: null,
};

export default AddRefToPublication;
