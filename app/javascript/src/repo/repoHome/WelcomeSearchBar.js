import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Container, Form, InputGroup,
} from 'react-bootstrap';
import AsyncSelect from 'react-select/async';
import PublicActions from 'src/repo/actions/PublicActions';
import RepoStructureSearchModal from 'src/repo/chemrepo/search/RepoStructureSearchModal';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';
import RepoSearchFetcher from 'src/repo/fetchers/RepoSearchFetcher';
import { setPublicationSearchSeed } from 'src/repo/chemrepo/publicationSearch/searchSeed';

// Welcome-page search: pick a mode, enter a value (or draw a structure),
// and the chosen parameters are seeded into PublicationSearchPage. The
// faceted UI on the publications page picks them up on mount and runs
// the actual query, so this component stays a thin entry point.
const MODES = [
  { value: 'substance', label: 'Substance' },
  { value: 'author', label: 'Author' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'ontology', label: 'Analysis ontology' },
  { value: 'structure', label: 'Structure' },
];

// Maps a mode to the facet_values endpoint name and the seeded filter key.
const FACET_BY_MODE = { author: 'author', contributor: 'contributor', ontology: 'ontology' };
const FILTER_KEY_BY_MODE = { author: 'authors', contributor: 'contributors', ontology: 'ontologies' };

// Module-scope cache so the user's last mode/text/picked survive a
// close-and-reopen of the welcome search panel within the SPA session.
let cachedState = {
  mode: 'substance',
  text: '',
  pickedByMode: { author: null, contributor: null, ontology: null },
};

const FIELD_HEIGHT = 38;
const FIELD_FONT = '0.95rem';

const loadFacetOptions = (mode) => (input) => {
  const facet = FACET_BY_MODE[mode];
  if (!facet || !input || input.length < 2) return Promise.resolve([]);
  return RepoSearchFetcher.fetchFacetValues(facet, input, 20)
    .then((res) => (res && res.result ? res.result.map((o) => ({
      value: o.value,
      label: o.label || String(o.value),
    })) : []))
    .catch(() => []);
};

const WelcomeSearchBar = ({ onClose }) => {
  const [mode, setMode] = useState(cachedState.mode);
  const [text, setText] = useState(cachedState.text);
  const [pickedByMode, setPickedByMode] = useState(cachedState.pickedByMode);
  const [showStructureEditor, setShowStructureEditor] = useState(false);

  useEffect(() => {
    cachedState = { mode, text, pickedByMode };
  }, [mode, text, pickedByMode]);

  const picked = pickedByMode[mode] || null;
  const setPicked = (val) => setPickedByMode((prev) => ({ ...prev, [mode]: val }));

  const modeLabel = useMemo(
    () => (MODES.find((m) => m.value === mode) || MODES[0]).label,
    [mode]
  );

  const navigate = (seed) => {
    setPublicationSearchSeed(seed);
    PublicActions.openRepositoryPage(`publications=${RepoNavListTypes.REACTION}`);
    if (onClose) onClose();
  };

  const submit = (e) => {
    if (e) e.preventDefault();
    if (mode === 'substance') {
      const term = text.trim();
      if (!term) return;
      navigate({ q: term });
    } else if (mode === 'structure') {
      setShowStructureEditor(true);
    } else if (FILTER_KEY_BY_MODE[mode]) {
      if (!picked) return;
      navigate({ filters: { [FILTER_KEY_BY_MODE[mode]]: [picked.value] } });
    }
  };

  const handleStructureSave = (molfile, opts = {}) => {
    setShowStructureEditor(false);
    if (!molfile) return;
    const match = opts.searchType === 'similar' ? 'sim' : 'sub';
    navigate({ structureQuery: molfile, structureMatch: match });
  };

  // Override only the bits we need to match the row: pill borders defined
  // globally on .repo-search-card .react-select__control would otherwise
  // bleed in. Inner layout (valueContainer / singleValue / input) is left
  // alone so react-select 5's grid-based selected-value rendering works.
  const asyncSelectStyles = {
    container: (base) => ({ ...base, width: '100%', fontSize: FIELD_FONT }),
    control: (base, state) => ({
      ...base,
      borderRadius: 0,
      minHeight: FIELD_HEIGHT,
      height: FIELD_HEIGHT,
      borderColor: state.isFocused ? '#86b7fe' : '#ced4da',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
    }),
    placeholder: (base) => ({ ...base, color: '#6c757d' }),
    // Float the option menu above the carousel below the search card.
    // Without a portal the menu renders inline with react-select's default
    // z-index of 1, so the carousel's own stacking context covers the list.
    menuPortal: (base) => ({ ...base, zIndex: 2000 }),
  };

  // Stable reference per mode so AsyncSelect doesn't reset its internal
  // option cache (and lose the displayed selection) on every render.
  const loadOptions = useCallback(loadFacetOptions(mode), [mode]);

  const fieldStyle = { height: FIELD_HEIGHT, fontSize: FIELD_FONT };

  const renderValueInput = () => {
    if (mode === 'substance') {
      return (
        <Form.Control
          type="text"
          placeholder="IUPAC, InChI, InChIKey, SMILES, sum formula …"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={fieldStyle}
          autoFocus
        />
      );
    }
    if (mode === 'structure') {
      return (
        <Button
          variant="outline-secondary"
          onClick={() => setShowStructureEditor(true)}
          className="flex-grow-1 text-start"
          style={fieldStyle}
        >
          <i className="fa fa-paint-brush" aria-hidden="true" />
          &nbsp;Draw structure …
        </Button>
      );
    }
    return (
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <AsyncSelect
          cacheOptions
          defaultOptions={false}
          placeholder={`Search ${modeLabel.toLowerCase()} by name …`}
          value={picked}
          loadOptions={loadOptions}
          onChange={setPicked}
          styles={asyncSelectStyles}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        />
      </div>
    );
  };

  const submitDisabled = (
    (mode === 'substance' && !text.trim())
    || (FILTER_KEY_BY_MODE[mode] && !picked)
  );

  return (
    <>
      <RepoStructureSearchModal
        show={showStructureEditor}
        onHide={() => setShowStructureEditor(false)}
        onSearch={handleStructureSave}
        searchIn="dataPublications"
      />
      <Container className="repo-search-panel mt-3">
        <div className="repo-search-card mx-auto">
          <div className="repo-search-header">
            <p className="repo-search-hint mb-2">
              Search by substance, author, contributor, analysis ontology — or draw a structure.
            </p>
            {onClose && (
              <Button
                variant="link"
                className="repo-search-close"
                onClick={onClose}
                aria-label="Close search panel"
              >
                <i className="fa fa-times" aria-hidden="true" />
              </Button>
            )}
          </div>
          <Form onSubmit={submit}>
            <InputGroup>
              <Form.Select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{ ...fieldStyle, flex: '0 0 12rem' }}
                aria-label="Search by"
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Form.Select>
              {renderValueInput()}
              {mode !== 'structure' && (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitDisabled}
                  style={fieldStyle}
                >
                  <i className="fa fa-search" aria-hidden="true" />
                  &nbsp;Search
                </Button>
              )}
            </InputGroup>
          </Form>
        </div>
      </Container>
    </>
  );
};

WelcomeSearchBar.propTypes = {
  onClose: PropTypes.func,
};

WelcomeSearchBar.defaultProps = {
  onClose: null,
};

export default WelcomeSearchBar;
