import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { InputGroup } from 'react-bootstrap';
import AutoCompleteInput from 'src/apps/mydb/elements/list/search/AutoCompleteInput';
import SuggestionsFetcher from 'src/fetchers/SuggestionsFetcher';
import RepoStructureSearchModal from 'src/repo/chemrepo/search/RepoStructureSearchModal';

// Bridges the legacy AutoCompleteInput (which fires onSelectionChange with
// a `{ name, search_by_method }` shape) into the faceted-search params:
// the parent only needs the plain text to send as `q`, and a molfile when a
// structure search is requested.
const SearchBar = ({
  query, onQueryChange, structureQuery, onStructureChange, structureMatch, onStructureMatchChange,
}) => {
  const [showStructureEditor, setShowStructureEditor] = useState(false);

  const handleSelectionChange = (selection) => {
    if (!selection) {
      onQueryChange('');
      return;
    }
    const term = typeof selection.name === 'string'
      ? selection.name
      : (selection.name?.name || '');
    onQueryChange(term.trim());
  };

  // Resets only the drawn structure query; the text field keeps its own clear
  // (the input's × button), and the filters have their own "Clear all".
  const handleResetStructure = () => {
    onStructureChange('');
  };

  const handleStructureSave = (molfile, opts = {}) => {
    setShowStructureEditor(false);
    if (!molfile) return;
    if (opts.searchType === 'similar') {
      onStructureMatchChange('sim');
    } else if (opts.searchType === 'sub') {
      onStructureMatchChange('sub');
    }
    onStructureChange(molfile);
  };

  const editTitle = structureQuery
    ? 'Structure search active — click to edit the drawn structure'
    : 'Draw molecule to search by structure';

  return (
    <div className="repo-search-bar d-flex flex-column gap-2 mb-3">
      <AutoCompleteInput
        inputAttributes={{ placeholder: 'IUPAC, InChI, InChIKey, SMILES, sum formula …' }}
        inputDisabled={false}
        suggestionsAttributes={{ style: { marginTop: 4, width: 320, maxHeight: 400 } }}
        suggestions={(input) => SuggestionsFetcher.fetchSuggestionsForCurrentUser(
          'all', input, 'public', false
        )}
        onSelectionChange={handleSelectionChange}
        onClear={() => onQueryChange('')}
      />
      <InputGroup size="sm" className="d-flex flex-nowrap">
        <select
          className="form-select"
          value={structureMatch}
          onChange={(e) => onStructureMatchChange(e.target.value)}
          title="Structure match mode"
        >
          <option value="sub">Substructure</option>
          <option value="sim">Similarity</option>
        </select>
        {structureQuery && (
          <InputGroup.Text
            className="search-input__icon"
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer', borderRight: 'none' }}
            onClick={handleResetStructure}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleResetStructure(); }}
            title="Reset structure search"
          >
            <i className="fa fa-times" aria-hidden="true" />
          </InputGroup.Text>
        )}
        <InputGroup.Text
          className="search-input__icon"
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer' }}
          onClick={() => setShowStructureEditor(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowStructureEditor(true); }}
          title={editTitle}
        >
          <i className="fa fa-paint-brush" aria-hidden="true" />
        </InputGroup.Text>
      </InputGroup>
      <RepoStructureSearchModal
        show={showStructureEditor}
        onHide={() => setShowStructureEditor(false)}
        onSearch={handleStructureSave}
        searchIn="dataPublications"
        initialMolfile={structureQuery}
      />
      {(query || structureQuery) && (
        <div className="small text-muted text-truncate">
          {structureQuery ? `Structure (${structureMatch})` : `Text: ${query}`}
        </div>
      )}
    </div>
  );
};

SearchBar.propTypes = {
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
  structureQuery: PropTypes.string.isRequired,
  onStructureChange: PropTypes.func.isRequired,
  structureMatch: PropTypes.string.isRequired,
  onStructureMatchChange: PropTypes.func.isRequired,
};

export default SearchBar;
