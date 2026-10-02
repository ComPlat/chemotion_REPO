import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonToolbar, Form, Modal,
} from 'react-bootstrap';
import KetcherEditor from 'src/components/structureEditor/KetcherEditor';
import { getEditorById } from 'src/components/structureEditor/EditorsInstances';
import PublicActions from 'src/repo/actions/PublicActions';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';
import RepoNavListTypes from 'src/repo/repoHome/RepoNavListTypes';

const clampTanimoto = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || num > 1) return 0.3;
  return num;
};

const RepoStructureSearchModal = ({
  show, onHide, searchIn, onSearch, initialMolfile,
}) => {
  const [editor, setEditor] = useState(null);
  const [searchType, setSearchType] = useState('sub');
  const [tanimotoThreshold, setTanimotoThreshold] = useState(0.7);
  const [iframeHeight, setIframeHeight] = useState('600px');
  const ketcherRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const instance = await getEditorById('ketcher');
      if (!cancelled) setEditor(instance);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      const h = Math.max(480, window.innerHeight - 220);
      setIframeHeight(`${h}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const dispatchSearch = (molfile) => {
    const tanimoto = clampTanimoto(tanimotoThreshold);
    const selection = {
      molfile,
      search_type: searchType,
      tanimoto_threshold: tanimoto,
      search_by_method: 'structure',
      structure_search: true,
    };
    const listType = searchIn === 'dataPublications'
      ? RepoNavListTypes.REACTION
      : RepoNavListTypes.MOLECULE_ARCHIVE;
    const params = {
      advFlag: true,
      elementType: 'all',
      page: 1,
      perPage: 10,
      selection,
      listType,
      isSearch: true,
      defaultSearchValue: 'structure',
      queryMolfile: molfile,
    };
    PublicActions.openRepositoryPage(`publications=${listType}`);
    PublicActions.setSearchParams({
      ...params,
      searchType,
      tanimotoThreshold: tanimoto,
      showStructureEditor: false,
    });
    RepoLoadingActions.start();
    if (listType === RepoNavListTypes.REACTION) {
      PublicActions.getSearchReactions(params);
    } else {
      PublicActions.getSearchMolecules(params);
    }
  };

  const handleSearch = async () => {
    let molfile = null;
    if (ketcherRef.current && typeof ketcherRef.current.onSaveFileK2SC === 'function') {
      try {
        const result = await ketcherRef.current.onSaveFileK2SC();
        molfile = result?.ket2Molfile || null;
      } catch (e) {
        molfile = null;
      }
    }
    if (!molfile && editor?.structureDef?.editor?.getMolfile) {
      try {
        molfile = await editor.structureDef.editor.getMolfile();
      } catch (e) {
        molfile = null;
      }
    }
    onHide();
    if (!molfile) return;
    const lines = molfile.match(/[^\r\n]+/g) || [];
    if (lines[1] && lines[1].trim()[0] === '0') return;
    if (typeof onSearch === 'function') {
      onSearch(molfile, {
        searchType,
        tanimotoThreshold: clampTanimoto(tanimotoThreshold),
      });
      return;
    }
    dispatchSearch(molfile);
  };

  const handleReset = () => {
    const iframe = document.querySelector('#ketcher');
    if (iframe && iframe.contentWindow) iframe.contentWindow.location.reload();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="modal-xxxl"
      dialogClassName="modal-xxxl"
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <i className="fa fa-pencil-square-o" aria-hidden="true" />
          <span>Ketcher — Draw a structure to search</span>
          <a
            href="https://lifescience.opensource.epam.com/ketcher/"
            target="_blank"
            rel="noopener noreferrer"
            title="About Ketcher"
            aria-label="About Ketcher"
            className="text-decoration-none"
          >
            <i className="fa fa-info-circle" aria-hidden="true" />
          </a>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {editor ? (
          <KetcherEditor
            ref={ketcherRef}
            editor={editor}
            molfile={initialMolfile}
            iH={iframeHeight}
            iS={{ border: 'none' }}
          />
        ) : (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
            <i className="fa fa-spinner fa-pulse fa-2x fa-fw" aria-hidden="true" />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="justify-content-start flex-wrap gap-3">
        <ButtonToolbar className="gap-2">
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="info" onClick={handleReset}>Reset</Button>
          <Button variant="primary" onClick={handleSearch} disabled={!editor}>
            <i className="fa fa-search me-1" aria-hidden="true" />
            Search
          </Button>
        </ButtonToolbar>
        <Form className="d-inline-flex flex-nowrap align-items-center gap-3 m-0">
          <Form.Check
            type="radio"
            name="repoStructureSearchType"
            id="repoStructureSearchSub"
            value="sub"
            checked={searchType === 'sub'}
            onChange={e => setSearchType(e.target.value)}
            label="Substructure Search"
            className="m-0"
            inline
          />
          <Form.Check
            type="radio"
            name="repoStructureSearchType"
            id="repoStructureSearchSimilar"
            value="similar"
            checked={searchType === 'similar'}
            onChange={e => setSearchType(e.target.value)}
            label="Similarity Search"
            className="m-0"
            inline
          />
          <Form.Control
            type="text"
            size="sm"
            style={{ width: 70 }}
            value={tanimotoThreshold}
            onChange={e => setTanimotoThreshold(e.target.value)}
            disabled={searchType !== 'similar'}
          />
        </Form>
      </Modal.Footer>
    </Modal>
  );
};

RepoStructureSearchModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  searchIn: PropTypes.string.isRequired,
  // Optional: when provided, the modal hands the molfile back instead of
  // dispatching the legacy public search. Used by the faceted page.
  onSearch: PropTypes.func,
  // Molfile to pre-load into the editor when it opens, so a previously drawn
  // structure survives closing and reopening the editor.
  initialMolfile: PropTypes.string,
};

RepoStructureSearchModal.defaultProps = {
  onSearch: null,
  initialMolfile: '',
};

export default RepoStructureSearchModal;
