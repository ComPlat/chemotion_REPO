import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Button, Form, Row, Col, Alert, ProgressBar, Badge, ListGroup,
} from 'react-bootstrap';
import Select from 'react-select';
import RepositoryFetcher from 'src/repo/fetchers/RepositoryFetcher';
import UserSettingsFetcher from 'src/fetchers/UserSettingsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import Literature from 'src/models/Literature';
import {
  Citation, LiteralType, LiteratureInput,
  doiValid, sanitizeDoi,
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import { createCitationTypeMap } from 'src/apps/mydb/elements/details/literature/CitationTools';
import { isNmrPass } from 'src/repo/repoHome/analysis-utils';
import { hNmrCheckMsg, cNmrCheckMsg } from 'src/utilities/ElementUtils';
import { contentToText } from 'src/utilities/quillFormat';
import AnalysisEditor from 'src/components/container/AnalysisEditor';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import { extractInstrumentFromFile } from 'src/repo/repoHome/instrumentExtractors';

const Cite = require('citation-js');
import RepoLoginOptions from 'src/repo/chemrepo/user/RepoLoginOptions';
import { ExtendedSignInForm } from 'src/components/navigation/NavNewSession';

const MY_DATA_LABEL = 'My Data';

const findCollectionByLabel = (nodes, label) => {
  if (!Array.isArray(nodes)) return null;
  const target = label.trim().toLowerCase();
  for (const node of nodes) {
    if ((node?.label || '').trim().toLowerCase() === target) return node;
    const found = findCollectionByLabel(node?.children, label);
    if (found) return found;
  }
  return null;
};

const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/;
// Wizard steps, in submission order.
const STEPS = [
  { key: 'sample', label: 'Sample' },
  { key: 'author', label: 'Author' },
  { key: 'analyses', label: 'Analyses' },
];

const stepIndex = (key) => STEPS.findIndex((s) => s.key === key);

const REF_CITATION_MAP = createCitationTypeMap('sample');
const DEFAULT_LITYPE = Object.keys(REF_CITATION_MAP).filter((k) => k !== 'uncategorized')[0] || 'citedOwn';

const blankReference = () => ({
  id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  title: '',
  url: '',
  doi: '',
  doi_isbn: '',
  isbn: '',
  year: '',
  litype: DEFAULT_LITYPE,
  refs: {},
});

const ANALYSIS_DOC_BASE = 'https://chemotion.net/docs/repo/details_standards/analysis_test';
const ANALYSIS_TYPES = [
  { value: '', label: '— Select analysis type —', docSlug: null },
  { value: 'CHMO:0000593 | 1H nuclear magnetic resonance spectroscopy (1H NMR)', label: '1H NMR', docSlug: 'nmr' },
  { value: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)', label: '13C NMR', docSlug: 'nmr' },
  { value: 'CHMO:0000470 | mass spectrometry (MS)', label: 'MS', docSlug: 'ms' },
  { value: 'CHMO:0000630 | infrared spectroscopy (IR)', label: 'IR', docSlug: 'ir' },
  { value: 'CHMO:0001009 | high-performance liquid chromatography (HPLC)', label: 'HPLC', docSlug: 'hplc' },
  { value: 'CHMO:0000497 | gas chromatography-mass spectrometry (GC-MS)', label: 'GC-MS', docSlug: 'gc-ms' },
  { value: 'CHMO:0001007 | thin-layer chromatography (TLC)', label: 'TLC', docSlug: 'tlc' },
  { value: 'CHMO:0000156 | X-ray diffraction (XRD)', label: 'XRD', docSlug: 'xrd' },
  { value: 'CHMO:0001075 | elemental analysis (EA)', label: 'Elemental analysis', docSlug: 'ea' },
];

const docLinkForType = (typeValue) => {
  const t = ANALYSIS_TYPES.find((x) => x.value === typeValue);
  return t && t.docSlug ? `${ANALYSIS_DOC_BASE}/${t.docSlug}` : null;
};

const emptyDelta = () => ({ ops: [{ insert: '' }] });

const blankAnalysis = () => ({
  id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  type: '',
  instrument: '',
  content: emptyDelta(),
  files: [],
});

// Adapt a QuickEntry flat analysis into the shape isDatasetPass / isNmrPass expect.
const adaptAnalysisForChecks = (analysis) => ({
  is_deleted: false,
  extended_metadata: {
    kind: analysis.type || '',
    content: analysis.content || emptyDelta(),
  },
  children: [
    {
      is_deleted: false,
      extended_metadata: { instrument: analysis.instrument || '' },
      attachments: (analysis.files || []).map((f) => ({
        filename: f.name || '',
        is_deleted: false,
      })),
    },
  ],
});

const LICENSE_OPTIONS = ['CC BY-SA', 'CC BY', 'CC0', 'No License'];

const blankForm = {
  name: '',
  smiles: '',
  molfile: '',
  molfileName: '',
  purity: '1.0',
  meltingPoint: '',
  boilingPoint: '',
  description: '',
  externalLabel: '',
  orcid: '',
  license: 'CC BY-SA',
};

const QuickEntryModal = ({ show, onHide, onSubmitted }) => {
  const [mode, setMode] = useState(null); // null | 'full' | 'minimal'
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blankForm);
  const [analyses, setAnalyses] = useState([]);
  const [references, setReferences] = useState([]);
  const [newRef, setNewRef] = useState(blankReference());
  const [refBusy, setRefBusy] = useState(false);
  const [refMessage, setRefMessage] = useState(null);
  const [affiliations, setAffiliations] = useState([]);
  const [affLoading, setAffLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(UserStore.getState()?.currentUser || null);
  const [collaborations, setCollaborations] = useState([]);
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [coAuthors, setCoAuthors] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [addGroupLead, setAddGroupLead] = useState(false);
  const [onBehalfOfAuthors, setOnBehalfOfAuthors] = useState(false);
  const [orcidSaving, setOrcidSaving] = useState(false);
  const [orcidStatus, setOrcidStatus] = useState(null);
  const [textTemplate, setTextTemplate] = useState({});
  // The structure must be verified on the server before the user can leave the sample step.
  const [moleculeVerified, setMoleculeVerified] = useState(false);
  const [moleculeVerifying, setMoleculeVerifying] = useState(false);
  const [moleculeInfo, setMoleculeInfo] = useState(null);
  const [moleculeError, setMoleculeError] = useState(null);

  const onUserChange = useCallback((state) => {
    if (state && 'currentUser' in state) {
      setCurrentUser(state.currentUser || null);
    }
  }, []);

  useEffect(() => {
    UserStore.listen(onUserChange);
    return () => UserStore.unlisten(onUserChange);
  }, [onUserChange]);

  // Pull predefined chemistry text templates (NMR / EA / IR / …) so the
  // AnalysisEditor toolbar buttons render the same as the main app.
  useEffect(() => {
    const handler = (state) => {
      const tt = state && state.sample;
      setTextTemplate(tt && typeof tt.toJS === 'function' ? tt.toJS() : (tt || {}));
    };
    TextTemplateStore.listen(handler);
    const initial = TextTemplateStore.getState()?.sample;
    setTextTemplate(initial && typeof initial.toJS === 'function' ? initial.toJS() : (initial || {}));
    return () => TextTemplateStore.unlisten(handler);
  }, []);

  const updateAnalysisTextTemplates = useCallback((tpl) => {
    TextTemplateActions.updateTextTemplates('sample', tpl);
  }, []);

  const isLoggedIn = Boolean(currentUser && currentUser.id);

  const loadAffiliations = useCallback(() => {
    setAffLoading(true);
    UserSettingsFetcher.getAllAffiliations()
      .then((data) => setAffiliations(Array.isArray(data) ? data : []))
      .finally(() => setAffLoading(false));
  }, []);

  const loadCollaborations = useCallback(() => {
    CollaboratorFetcher.fetchMyCollaborations()
      .then((res) => setCollaborations(Array.isArray(res?.authors) ? res.authors : []))
      .catch(() => setCollaborations([]));
  }, []);

  const refreshAuthorData = useCallback(() => {
    loadAffiliations();
    loadCollaborations();
  }, [loadAffiliations, loadCollaborations]);

  useEffect(() => {
    if (!show || !isLoggedIn) return;
    loadAffiliations();
    loadCollaborations();
    setForm((prev) => ({ ...prev, orcid: currentUser?.orcid || prev.orcid }));
  }, [show, isLoggedIn, currentUser, loadAffiliations, loadCollaborations]);

  const reset = () => {
    setMode(null);
    setStep(0);
    setForm(blankForm);
    setAnalyses([]);
    setReferences([]);
    setNewRef(blankReference());
    setRefBusy(false);
    setRefMessage(null);
    setCoAuthors([]);
    setReviewers([]);
    setAddGroupLead(false);
    setOnBehalfOfAuthors(false);
    setSelectedCollab(null);
    setOrcidStatus(null);
    setOrcidSaving(false);
    setError(null);
    setSubmitting(false);
    setMoleculeVerified(false);
    setMoleculeVerifying(false);
    setMoleculeInfo(null);
    setMoleculeError(null);
  };

  // Resolve the molfile (preferred) or SMILES on the server before allowing Next,
  // so an unparseable structure is caught here rather than at submission.
  const verifyMolecule = () => {
    setMoleculeError(null);
    setMoleculeInfo(null);
    setMoleculeVerified(false);
    // IMPORTANT: do not trim the molfile — MOL format requires a 4-line header
    // (line 1 = title, may be blank) and trimming corrupts that header.
    const mol = form.molfile || '';
    const smi = (form.smiles || '').trim();
    if (!mol.trim() && !smi) {
      setMoleculeError('Provide a molfile or a SMILES string before verifying.');
      return;
    }
    setMoleculeVerifying(true);
    const promise = mol.trim()
      ? MoleculesFetcher.fetchByMolfile(mol, null)
      : MoleculesFetcher.fetchBySmi(smi, null, null);
    Promise.resolve(promise)
      .then((res) => {
        const m = (res && (res.molecule || res)) || null;
        if (!m || (!m.id && !m.inchikey && !m.molecular_weight)) {
          setMoleculeError('Could not resolve a molecule from the provided input. Please check the structure.');
          setMoleculeVerified(false);
          return;
        }
        setMoleculeInfo({
          name: m.name || m.iupac_name || '',
          sumFormula: m.sum_formular || m.molecular_formula || '',
          molecularWeight: m.molecular_weight,
          exactMass: m.exact_molecular_weight || m.exact_mass,
          inchikey: m.inchikey,
        });
        setMoleculeVerified(true);
      })
      .catch(() => {
        setMoleculeError('Verification failed. The chemistry service may be unavailable; please retry.');
        setMoleculeVerified(false);
      })
      .finally(() => setMoleculeVerifying(false));
  };

  // Any change to molfile/SMILES invalidates the previous verification.
  useEffect(() => {
    setMoleculeVerified(false);
    setMoleculeInfo(null);
    setMoleculeError(null);
  }, [form.molfile, form.smiles]);

  const saveOrcid = () => {
    const value = form.orcid.trim();
    if (!ORCID_RE.test(value)) {
      setOrcidStatus({ variant: 'danger', message: 'ORCID must match the format 0000-0000-0000-0000.' });
      return;
    }
    setOrcidSaving(true);
    setOrcidStatus(null);
    UsersFetcher.updateOrcid(value)
      .then(() => {
        setOrcidStatus({ variant: 'success', message: 'ORCID iD validated and saved to your profile.' });
        UserActions.fetchCurrentUser();
      })
      .catch((err) => {
        setOrcidStatus({ variant: 'danger', message: err?.error || err?.message || 'Failed to save ORCID.' });
      })
      .finally(() => setOrcidSaving(false));
  };

  const goToFullEditorForType = (elementType) => {
    const navigate = (target) => {
      reset();
      onHide();
      window.location.assign(`${target}?fullscreen=1`);
    };

    const extractCollections = (res) => {
      if (!res) return [];
      if (Array.isArray(res)) return res;
      return res.collections || res.sync_collections_users || [];
    };

    Promise.all([
      CollectionsFetcher.fetchUnsharedRoots().catch(() => null),
      CollectionsFetcher.fetchSharedRoots().catch(() => null),
      CollectionsFetcher.fetchLockedRoots().catch(() => null),
    ])
      .then((results) => {
        for (const res of results) {
          const match = findCollectionByLabel(extractCollections(res), MY_DATA_LABEL);
          if (match && match.id) {
            navigate(`/mydb/collection/${match.id}/${elementType}/new`);
            return;
          }
        }
        // eslint-disable-next-line no-console
        console.warn(`Quick Entry: no collection labelled "${MY_DATA_LABEL}" found for current user; falling back to All collection.`);
        navigate(`/mydb/collection/all/${elementType}/new`);
      })
      .catch(() => navigate(`/mydb/collection/all/${elementType}/new`));
  };

  const goToFullEditor = () => goToFullEditorForType('sample');
  const goToFullReactionEditor = () => goToFullEditorForType('reaction');

  const handleClose = () => {
    if (submitting) return;
    reset();
    onHide();
  };

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Strip SDF terminators / trailing junk so the server gets a clean MOL block
  // ending at `M  END` (uploaded SDF files include `$$$$` which can break parsing).
  const normalizeMolfile = (raw) => {
    if (!raw) return '';
    const text = raw.replace(/\r\n/g, '\n');
    const idx = text.indexOf('M  END');
    if (idx === -1) return text;
    return `${text.slice(0, idx + 6)}\n`;
  };

  const detectChemdrawFormat = (filename) => {
    const lower = (filename || '').toLowerCase();
    if (lower.endsWith('.cdxml')) return 'cdxml';
    if (lower.endsWith('.cdx')) return 'cdx';
    return null;
  };

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const handleMolfileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, molfile: '', molfileName: '' }));
      return;
    }
    const chemdrawFormat = detectChemdrawFormat(file.name);
    const reader = new FileReader();
    if (chemdrawFormat) {
      reader.onload = (e) => {
        const base64 = arrayBufferToBase64(e.target.result);
        MoleculesFetcher.fetchMolfileFromChemdraw(base64, chemdrawFormat)
          .then((res) => {
            if (!res || !res.molfile) {
              setError(res?.error || 'Could not convert the ChemDraw file. Please verify it is a valid .cdx/.cdxml.');
              return;
            }
            setForm((prev) => ({
              ...prev,
              molfile: normalizeMolfile(res.molfile),
              molfileName: file.name,
            }));
          })
          .catch(() => setError('ChemDraw conversion request failed.'));
      };
      reader.onerror = () => setError('Could not read the selected ChemDraw file.');
      reader.readAsArrayBuffer(file);
      return;
    }
    reader.onload = (e) => {
      setForm((prev) => ({
        ...prev,
        molfile: normalizeMolfile(e.target.result || ''),
        molfileName: file.name,
      }));
    };
    reader.onerror = () => setError('Could not read the selected molfile.');
    reader.readAsText(file);
  };

  const clearMolfile = () => {
    setForm((prev) => ({ ...prev, molfile: '', molfileName: '' }));
  };

  const addAnalysis = () => {
    setAnalyses((prev) => [...prev, blankAnalysis()]);
  };

  const removeAnalysis = (id) => {
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAnalysis = (id, field) => (event) => {
    const { value } = event.target;
    setAnalyses((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const updateAnalysisContent = (id) => (delta) => {
    setAnalyses((prev) => prev.map((a) => (a.id === id ? { ...a, content: delta } : a)));
  };

  const addAnalysisFiles = (id) => (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setAnalyses((prev) => prev.map((a) => (
      a.id === id ? { ...a, files: [...a.files, ...files] } : a
    )));
    event.target.value = '';

    // Auto-fill instrument from the first source that yields a value:
    // JCAMP/JDX header → Bruker zip (uxnmr.info / acqus).
    (async () => {
      for (const f of files) {
        const instr = await extractInstrumentFromFile(f);
        if (instr) {
          setAnalyses((prev) => prev.map((a) => (
            a.id === id && (!a.instrument || !a.instrument.trim())
              ? { ...a, instrument: instr }
              : a
          )));
          break;
        }
      }
    })();
  };

  const removeAnalysisFile = (id, fileIdx) => {
    setAnalyses((prev) => prev.map((a) => (
      a.id === id ? { ...a, files: a.files.filter((_, i) => i !== fileIdx) } : a
    )));
  };

  const collabOptions = collaborations
    .filter((c) => (
      c && c.id
      && !coAuthors.some((a) => a.id === c.id)
      && !reviewers.some((r) => r.id === c.id)
    ))
    .map((c) => ({ value: c.id, label: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(), data: c }));

  const addCoAuthor = () => {
    if (!selectedCollab) return;
    const c = selectedCollab.data || {};
    setCoAuthors((prev) => [...prev, {
      id: c.id,
      name: c.name,
      orcid: c.orcid,
      type: c.type,
      current_affiliations: c.current_affiliations || [],
    }]);
    setSelectedCollab(null);
  };

  const addReviewer = () => {
    if (!selectedCollab) return;
    const c = selectedCollab.data || {};
    if (c.type === 'Collaborator') {
      setError('This collaborator does not have an account and cannot be added as a reviewer.');
      return;
    }
    setReviewers((prev) => [...prev, {
      id: c.id,
      name: c.name,
      orcid: c.orcid,
      current_affiliations: c.current_affiliations || [],
    }]);
    setSelectedCollab(null);
  };

  const removeCoAuthor = (id) => {
    setCoAuthors((prev) => prev.filter((a) => a.id !== id));
  };

  const removeReviewer = (id) => {
    setReviewers((prev) => prev.filter((r) => r.id !== id));
  };

  const renderAffiliationList = (list) => {
    const affs = Array.isArray(list) ? list : [];
    if (affs.length === 0) {
      return <span className="text-muted fst-italic small">No affiliations on record.</span>;
    }
    return (
      <ul className="list-unstyled mb-0 small">
        {affs.map((aff) => {
          const parts = [aff.department, aff.organization, aff.country].filter(Boolean);
          return (
            <li key={aff.id || parts.join('|')} className="text-muted">
              {parts.join(', ') || '—'}
            </li>
          );
        })}
      </ul>
    );
  };

  const validateStep = (index) => {
    const key = STEPS[index]?.key;
    if (key === 'sample') {
      // Name is optional; only a structure is required.
      if (!form.molfile.trim() && !form.smiles.trim()) {
        return 'Please upload a molfile or provide a SMILES string.';
      }
      if (!moleculeVerified) {
        return 'Please verify the molecule before continuing (use the "Verify molecule" button).';
      }
      const purityValue = parseFloat(form.purity);
      if (Number.isNaN(purityValue) || purityValue < 0 || purityValue > 1) {
        return 'Purity must be a number between 0 and 1.';
      }
      if (form.meltingPoint.trim() && Number.isNaN(parseFloat(form.meltingPoint))) {
        return 'Melting point must be a number (°C).';
      }
      if (form.boilingPoint.trim() && Number.isNaN(parseFloat(form.boilingPoint))) {
        return 'Boiling point must be a number (°C).';
      }
    }
    if (key === 'author') {
      if (form.orcid.trim() && !ORCID_RE.test(form.orcid.trim())) {
        return 'ORCID must match the format 0000-0000-0000-0000.';
      }
    }
    if (key === 'analyses') {
      if (analyses.length === 0) {
        return 'Please add at least one analysis before submitting.';
      }
      const sampleForChecks = { molecule: { sum_formular: moleculeInfo?.sumFormula || '' } };
      for (let i = 0; i < analyses.length; i += 1) {
        const a = analyses[i];
        // Type is required; 'other' does not count as a selection.
        if (!a.type || a.type === 'other') {
          return `Analysis #${i + 1}: please select an analysis type.`;
        }
        if (!a.instrument || !a.instrument.trim()) {
          return `Analysis #${i + 1}: instrument is required.`;
        }
        if (!contentToText(a.content).trim()) {
          return `Analysis #${i + 1}: content is required.`;
        }
        if (!a.files || a.files.length === 0) {
          return `Analysis #${i + 1}: please attach at least one file.`;
        }
        const adapted = adaptAnalysisForChecks(a);
        if (!isNmrPass(adapted, sampleForChecks)) {
          return `Analysis #${i + 1}: NMR content does not match the molecular formula.`;
        }
      }
    }
    return null;
  };

  const goNext = () => {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = () => {
    for (let i = 0; i < STEPS.length; i += 1) {
      const msg = validateStep(i);
      if (msg) {
        setStep(i);
        setError(msg);
        return;
      }
    }
    if (coAuthors.length > 0 && !onBehalfOfAuthors) {
      setStep(stepIndex('author'));
      setError('Please confirm you are contributing on behalf of the authors.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = {
      // Name is optional and may be empty.
      name: form.name.trim(),
      purity: parseFloat(form.purity),
      description: form.description,
      external_label: form.externalLabel,
      license: form.license,
    };
    if (form.molfile.trim()) {
      payload.molfile = form.molfile;
    } else {
      payload.smiles = form.smiles.trim();
    }
    if (form.meltingPoint.trim()) {
      const mp = parseFloat(form.meltingPoint);
      payload.melting_point_lowerbound = mp;
      payload.melting_point_upperbound = mp;
    }
    if (form.boilingPoint.trim()) {
      const bp = parseFloat(form.boilingPoint);
      payload.boiling_point_lowerbound = bp;
      payload.boiling_point_upperbound = bp;
    }
    if (form.orcid.trim()) payload.orcid = form.orcid.trim();
    if (coAuthors.length > 0) payload.coauthors = coAuthors.map((a) => a.id);
    if (reviewers.length > 0) payload.reviewers = reviewers.map((r) => r.id);
    if (addGroupLead) payload.add_group_lead = true;
    if (references.length > 0) {
      payload.references_meta = JSON.stringify(references.map((r) => ({
        title: (r.title || '').trim(),
        doi: r.doi ? (sanitizeDoi(r.doi) || r.doi.trim()) : '',
        url: (r.url || '').trim().replace(/ +/g, ' '),
        isbn: (r.isbn || '').trim(),
        year: (r.year || '').toString().trim(),
        litype: (r.litype || '').trim(),
        refs: r.refs && (r.refs.bibtex || r.refs.bibliography) ? {
          bibtex: r.refs.bibtex,
          bibliography: r.refs.bibliography,
        } : null,
      })));
    }

    const analysisPayload = analyses.map((a) => ({
      name: a.name.trim(),
      type: a.type === 'other' ? '' : a.type,
      instrument: a.instrument.trim(),
      content: a.content || emptyDelta(),
      files: a.files,
    }));

    RepositoryFetcher.quickEntry(payload, analysisPayload)
      .then((result) => {
        NotificationActions.add({
          title: 'Quick Entry queued',
          message:
            'Your submission is being processed in the background. You will receive a notification once it is ready for review.',
          level: 'success',
          dismissible: 'button',
          autoDismiss: 8,
          position: 'tc',
          uid: 'quick_entry_success',
        });
        reset();
        onHide();
        if (onSubmitted) onSubmitted(result);
      })
      .catch((err) => {
        setSubmitting(false);
        setError(err?.message || 'Submission failed. Please try again.');
      });
  };

  const renderModeChooser = () => (
    <Row className="g-3">
      <Col md={12}>
        <div className="border rounded p-4 bg-light">
          <h4 className="mb-2">
            <i className="fa fa-info-circle me-2 text-primary" aria-hidden="true" />
            How submission works
          </h4>
          <p className="mb-2">
            Pick how you&apos;d like to start your entry below. Every submission is first saved to your{' '}
            <strong>My Data</strong> collection, where you can refine the structure, properties, and
            analyses. When you&apos;re ready, submit it for <strong>peer review</strong> &mdash; Chemotion
            reviewers will check completeness, data quality, and metadata before approving it for
            publication.
          </p>
          <p className="mb-3">
            <strong>Only entries that successfully pass review can be published</strong> to the public
            repository and receive a citable Chemotion ID. Once submitted, the entry is locked and
            cannot be edited &mdash; if changes are needed, the reviewer will send it back to you for
            modification.
          </p>
          <Row className="g-2 small">
            <Col xs={6} md={3}>
              <div className="text-center p-2 border rounded bg-white h-100">
                <i className="fa fa-pencil-square-o text-secondary me-1" aria-hidden="true" />
                <strong>1. Draft</strong>
                <span className="text-muted"> in My Data</span>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-center p-2 border rounded bg-white h-100">
                <i className="fa fa-paper-plane text-warning me-1" aria-hidden="true" />
                <strong>2. Submit</strong>
                <span className="text-muted"> for review</span>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-center p-2 border rounded bg-white h-100">
                <i className="fa fa-search text-info me-1" aria-hidden="true" />
                <strong>3. Review</strong>
                <span className="text-muted"> approve or return</span>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="text-center p-2 border rounded bg-white h-100">
                <i className="fa fa-globe text-success me-1" aria-hidden="true" />
                <strong>4. Publish</strong>
                <span className="text-muted"> with Chemotion ID</span>
              </div>
            </Col>
          </Row>
        </div>
      </Col>
      <Col md={6} xl={4}>
        <div className="border rounded p-3 h-100 d-flex flex-column">
          <h5 className="mb-2">
            <i className="fa fa-bolt me-2 text-warning" aria-hidden="true" />
            Quick sample submission
          </h5>
          <div className="mb-2 flex-grow-1" style={{ lineHeight: 1.6 }}>
            <p className="mb-2">A streamlined wizard to deposit a single characterised compound without leaving this page.</p>
            <ul className="ps-3 mb-3 text-muted">
              <li>Structure (molfile or SMILES), verified inline</li>
              <li>Author details &mdash; ORCID optional</li>
              <li>At least one analysis with an attached file</li>
            </ul>
            <span className="text-muted"><em>Best for</em> a fast single-compound deposit with spectra ready.</span>
          </div>
          <Button variant="success" onClick={() => setMode('minimal')}>
            Start quick submission
          </Button>
        </div>
      </Col>
      <Col md={6} xl={4}>
        <div className="border rounded p-3 h-100 d-flex flex-column">
          <h5 className="mb-2">
            <i className="fa fa-flask me-2 text-info" aria-hidden="true" />
            Full reaction editor
          </h5>
          <div className="mb-2 flex-grow-1" style={{ lineHeight: 1.6 }}>
            <p className="mb-2">Opens the full reaction form in <strong>My Data</strong> to capture an entire synthesis.</p>
            <ul className="ps-3 mb-3 text-muted">
              <li>Scheme: starting materials, reagents, products</li>
              <li>Conditions, yields, and stoichiometry</li>
              <li>Multiple analyses per product, plus notes</li>
            </ul>
            <span className="text-muted"><em>Best for</em> full synthetic procedures or multi-step sequences.</span>
          </div>
          <Button variant="primary" onClick={goToFullReactionEditor}>
            Open full reaction editor
          </Button>
        </div>
      </Col>
      <Col md={6} xl={4}>
        <div className="border rounded p-3 h-100 d-flex flex-column">
          <h5 className="mb-2">
            <i className="icon-sample me-2 text-primary" aria-hidden="true" />
            Full sample editor
          </h5>
          <div className="mb-2 flex-grow-1" style={{ lineHeight: 1.6 }}>
            <p className="mb-2">Opens the full sample form in <strong>My Data</strong> with every field and dataset tool.</p>
            <ul className="ps-3 mb-3 text-muted">
              <li>Molecule details with the built-in structure editor</li>
              <li>Properties: purity, melting point, density, solubility</li>
              <li>Analyses, datasets, labels, residues, tags</li>
            </ul>
            <span className="text-muted"><em>Best for</em> comprehensive characterisation you&apos;ll keep refining.</span>
          </div>
          <Button variant="primary" onClick={goToFullEditor}>
            Open full sample editor
          </Button>
        </div>
      </Col>
    </Row>
  );

  const renderStepper = () => (
    <div className="d-flex align-items-center mb-3">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <Badge bg={i === step ? 'primary' : i < step ? 'success' : 'secondary'}>
            {`${i + 1}. ${s.label}`}
          </Badge>
          {i < STEPS.length - 1 && <span className="mx-2 text-muted">›</span>}
        </React.Fragment>
      ))}
    </div>
  );

  const renderSampleStep = () => (
    <>
      <Form.Group as={Row} className="mb-3" controlId="quick-entry-name">
        <Form.Label column sm={3} className="text-end">Name</Form.Label>
        <Col sm={9}>
          <Form.Control
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="Sample name (optional)"
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="quick-entry-molfile">
        <Form.Label column sm={3} className="text-end">Molfile</Form.Label>
        <Col sm={9}>
          <div className="d-flex align-items-center gap-2">
            <Form.Control
              type="file"
              accept=".mol,.sdf,.cdx,.cdxml,chemical/x-mdl-molfile,chemical/x-mdl-sdfile,chemical/x-cdx,chemical/x-cdxml,text/plain"
              onChange={handleMolfileUpload}
            />
            {form.molfileName && (
              <Button
                type="button"
                variant="outline-secondary"
                size="sm"
                onClick={clearMolfile}
              >
                Clear
              </Button>
            )}
          </div>
          <Form.Text className="text-muted">
            {form.molfileName
              ? `Using uploaded file: ${form.molfileName}. SMILES will be ignored.`
              : 'Optional. Accepts .mol, .sdf, .cdx, .cdxml. If provided, SMILES will be ignored.'}
          </Form.Text>
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="quick-entry-smiles">
        <Form.Label column sm={3} className="text-end">
          {!form.molfileName && <span className="text-danger">* </span>}
          SMILES
        </Form.Label>
        <Col sm={9}>
          <Form.Control
            as="textarea"
            rows={2}
            value={form.smiles}
            onChange={handleChange('smiles')}
            placeholder="e.g. CC(=O)Oc1ccccc1C(=O)O"
            disabled={Boolean(form.molfileName)}
          />
          <Form.Text className="text-muted">
            Provide the structure as a SMILES string. A molfile will be generated on the server.
          </Form.Text>
        </Col>
      </Form.Group>

      {/* The molfile/SMILES must be verified on the server before proceeding. */}
      <Form.Group as={Row} className="mb-3">
        <Form.Label column sm={3} className="text-end">
          <span className="text-danger">* </span>
          Verify molecule
        </Form.Label>
        <Col sm={9}>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant={moleculeVerified ? 'success' : 'primary'}
              onClick={verifyMolecule}
              disabled={moleculeVerifying || (!form.molfile.trim() && !form.smiles.trim())}
            >
              {moleculeVerifying ? (
                <><i className="fa fa-spin fa-spinner me-1" />Verifying…</>
              ) : moleculeVerified ? (
                <><i className="fa fa-check me-1" />Verified — re-verify</>
              ) : (
                'Verify molecule'
              )}
            </Button>
            {moleculeVerified && moleculeInfo && (
              <span className="small text-muted">
                {moleculeInfo.sumFormula && <span className="me-2"><strong>Formula:</strong> {moleculeInfo.sumFormula}</span>}
                {moleculeInfo.exactMass && <span className="me-2"><strong>Exact mass:</strong> {Number(moleculeInfo.exactMass).toFixed(4)}</span>}
                {moleculeInfo.molecularWeight && <span><strong>MW:</strong> {Number(moleculeInfo.molecularWeight).toFixed(2)}</span>}
              </span>
            )}
          </div>
          {moleculeError && (
            <Alert variant="danger" className="mt-2 mb-0 py-2">
              {moleculeError}
            </Alert>
          )}
          <Form.Text className="text-muted">
            You must verify the molecule before continuing to the next step.
          </Form.Text>
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="quick-entry-purity">
        <Form.Label column sm={3} className="text-end">Purity (0-1)</Form.Label>
        <Col sm={9}>
          <Form.Control
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={form.purity}
            onChange={handleChange('purity')}
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="quick-entry-melting-point">
        <Form.Label column sm={3} className="text-end">Melting point</Form.Label>
        <Col sm={9}>
          <div className="input-group">
            <Form.Control
              type="number"
              step="any"
              value={form.meltingPoint}
              onChange={handleChange('meltingPoint')}
              placeholder="Optional, e.g. 135"
            />
            <span className="input-group-text">°C</span>
          </div>
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="quick-entry-boiling-point">
        <Form.Label column sm={3} className="text-end">Boiling point</Form.Label>
        <Col sm={9}>
          <div className="input-group">
            <Form.Control
              type="number"
              step="any"
              value={form.boilingPoint}
              onChange={handleChange('boilingPoint')}
              placeholder="Optional, e.g. 256"
            />
            <span className="input-group-text">°C</span>
          </div>
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="quick-entry-external-label">
        <Form.Label column sm={3} className="text-end">External label</Form.Label>
        <Col sm={9}>
          <Form.Control
            type="text"
            value={form.externalLabel}
            onChange={handleChange('externalLabel')}
            placeholder="Optional label"
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="quick-entry-description">
        <Form.Label column sm={3} className="text-end">Description</Form.Label>
        <Col sm={9}>
          <Form.Control
            as="textarea"
            rows={3}
            value={form.description}
            onChange={handleChange('description')}
            placeholder="Optional notes"
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="quick-entry-license">
        <Form.Label column sm={3} className="text-end">Choose license</Form.Label>
        <Col sm={9}>
          <Form.Select value={form.license} onChange={handleChange('license')}>
            {LICENSE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </Form.Select>
        </Col>
      </Form.Group>
    </>
  );

  const renderAuthorStep = () => (
    <>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Contributor</h5>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={refreshAuthorData}
            disabled={affLoading}
            title="Reload affiliations and collaborators"
          >
            <i className={`fa fa-refresh me-1 ${affLoading ? 'fa-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="border rounded p-3 mb-4">
        <div className="fw-semibold mb-1">{currentUser?.name || 'You'}</div>
        <Form.Text className="d-block text-muted mb-2">
          <i className="fa fa-info-circle me-1" aria-hidden="true" />
          As the submitter, you are automatically listed as the first author of this
          submission. Add any co-authors below.
        </Form.Text>
        <div className="small text-muted mb-2">
          To update your affiliations, open the user menu (top right) and go to
          {' '}
          <strong>Settings &rsaquo; Affiliations</strong>, then click <em>Refresh</em> here to reload.
        </div>
        <Form.Group as={Row} className="mb-3" controlId="quick-entry-orcid">
          <Form.Label column sm={3} className="text-end">ORCID</Form.Label>
          <Col sm={9}>
            <div className="input-group">
              <Form.Control
                type="text"
                value={form.orcid}
                onChange={(e) => {
                  setOrcidStatus(null);
                  handleChange('orcid')(e);
                }}
                placeholder="0000-0000-0000-0000"
                pattern="\d{4}-\d{4}-\d{4}-\d{3}[0-9X]"
                disabled={orcidSaving}
              />
              <Button
                variant="primary"
                onClick={saveOrcid}
                disabled={orcidSaving || !form.orcid.trim()}
              >
                {orcidSaving ? 'Validating…' : 'Validate & Save ORCID'}
              </Button>
            </div>
            {orcidStatus && (
              <Form.Text className={`d-block mt-1 text-${orcidStatus.variant === 'danger' ? 'danger' : 'success'}`}>
                {orcidStatus.message}
              </Form.Text>
            )}
            <Form.Text className="text-muted d-block">
              ORCID is validated against orcid.org; your name must match the ORCID record.
            </Form.Text>
          </Col>
        </Form.Group>

        <Form.Group as={Row}>
          <Form.Label column sm={3} className="text-end">Affiliations</Form.Label>
          <Col sm={9}>
            {affLoading && <ProgressBar animated now={100} className="mb-2" style={{ height: 4 }} />}
            {affiliations.length === 0 && !affLoading && (
              <div className="text-muted">
                No affiliations yet — manage them from your profile.
              </div>
            )}
            {affiliations.length > 0 && (
              <ul className="list-unstyled mb-0">
                {affiliations.map((a) => (
                  <li key={a.id} className="border rounded p-2 mb-2">
                    <div>
                      <strong>{a.organization}</strong>
                      {a.department && <span>, {a.department}</span>}
                      {a.group && <span>, {a.group}</span>}
                      {a.country && <span className="text-muted"> — {a.country}</span>}
                    </div>
                    <div className="text-muted small">
                      {a.from || '—'} to {a.to || 'present'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Col>
        </Form.Group>
      </div>

      <h5 className="mb-2">Co-authors & Reviewers</h5>
      <div className="border rounded p-3 mb-3">
        <div className="fw-semibold mb-1">My Collaborators</div>
        <div className="small text-muted mb-2">
          To add or remove collaborators, open the user menu (top right) and go to
          {' '}
          <strong>My Collaboration</strong>, then click <em>Refresh</em> here to reload.
        </div>
        <Row className="g-2 align-items-center mb-2">
          <Col md={6}>
            <Select
              placeholder="Select from my collaborators"
              value={selectedCollab}
              options={collabOptions}
              onChange={setSelectedCollab}
              isClearable
              isSearchable
            />
          </Col>
          <Col md={6} className="d-flex gap-2 flex-wrap">
            <Button
              variant="success"
              size="sm"
              onClick={addCoAuthor}
              disabled={!selectedCollab}
            >
              <i className="fa fa-plus me-1" aria-hidden="true" />
              Add as author
            </Button>
            <Button
              variant="info"
              size="sm"
              onClick={addReviewer}
              disabled={!selectedCollab}
            >
              <i className="fa fa-plus me-1" aria-hidden="true" />
              Add as reviewer
            </Button>
          </Col>
        </Row>
        {collaborations.length === 0 && (
          <Form.Text className="text-muted">
            You have no collaborators yet. You can still submit — you will be listed as the sole author.
          </Form.Text>
        )}
      </div>

      <div className="mb-3">
        <div className="fw-semibold mb-2">
          Co-authors <Badge bg="secondary" pill>{coAuthors.length}</Badge>
        </div>
        {coAuthors.length === 0 ? (
          <div className="text-muted small mb-2">
            Only you will be listed as the author unless you add co-authors here.
          </div>
        ) : (
          <ListGroup className="mb-2">
            {coAuthors.map((a) => (
              <ListGroup.Item key={`ca-${a.id}`} className="py-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="me-2 flex-grow-1">
                    <div>
                      <strong>{a.name}</strong>
                      {a.orcid && <span className="text-muted ms-2 small">ORCID: {a.orcid}</span>}
                    </div>
                    <div className="mt-1">{renderAffiliationList(a.current_affiliations)}</div>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeCoAuthor(a.id)}
                  >
                    Remove
                  </Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        {coAuthors.length > 0 && (
          <Form.Check
            type="checkbox"
            id="quick-entry-on-behalf"
            className="mt-2 text-primary fw-semibold"
            label={`I am contributing on behalf of the author${coAuthors.length > 1 ? 's' : ''}`}
            checked={onBehalfOfAuthors}
            onChange={(e) => setOnBehalfOfAuthors(e.target.checked)}
          />
        )}
      </div>

      <div className="mb-4">
        <div className="fw-semibold mb-2">
          Group Leads & Additional Reviewers <Badge bg="secondary" pill>{reviewers.length}</Badge>
        </div>
        <Form.Check
          type="checkbox"
          id="quick-entry-add-group-lead"
          className="mb-2"
          label="Also include my group leads as authors"
          checked={addGroupLead}
          onChange={(e) => setAddGroupLead(e.target.checked)}
        />
        {reviewers.length === 0 ? (
          <div className="text-muted small">
            No additional reviewers assigned. Optional — add any collaborator above as a reviewer.
          </div>
        ) : (
          <ListGroup>
            {reviewers.map((r) => (
              <ListGroup.Item key={`rv-${r.id}`} className="py-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="me-2 flex-grow-1">
                    <div>
                      <strong>{r.name}</strong>
                      {r.orcid && <span className="text-muted ms-2 small">ORCID: {r.orcid}</span>}
                    </div>
                    <div className="mt-1">{renderAffiliationList(r.current_affiliations)}</div>
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeReviewer(r.id)}
                  >
                    Remove
                  </Button>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </div>

    </>
  );

  const updateNewRef = (field, event) => {
    const { value } = event.target;
    setNewRef((prev) => ({ ...prev, [field]: value }));
  };

  const isDoiReady = (r) => doiValid(r.doi_isbn || '');
  const isManualReady = (r) => (
    (r.title || '').trim() !== ''
    && ((r.url || '').trim() !== '' || (r.doi || '').trim() !== '')
  );

  const addRefFromDoi = async () => {
    const rawDoi = newRef.doi_isbn;
    if (!doiValid(rawDoi)) return;
    setRefBusy(true);
    setRefMessage(null);
    try {
      const sanitized = sanitizeDoi(rawDoi);
      const json = await Cite.async(sanitized);
      let enriched = { ...newRef, doi: sanitized || rawDoi };
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
      setReferences((prev) => [...prev, enriched]);
      setNewRef(blankReference());
    } catch (err) {
      setRefMessage({ variant: 'danger', text: (err && err.error) || `Could not fetch metadata for DOI ${rawDoi}.` });
    } finally {
      setRefBusy(false);
    }
  };

  const addRefManual = () => {
    if (!isManualReady(newRef)) return;
    setReferences((prev) => [...prev, { ...newRef }]);
    setNewRef(blankReference());
    setRefMessage(null);
  };

  const removeReference = (id) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  };

  const renderReferencesStep = () => (
    <>
      <p className="text-muted">
        Optional. Enter a DOI to auto-fetch citation metadata, or add a reference manually using title plus URL or DOI.
      </p>

      {references.length > 0 && (
        <ListGroup className="mb-3">
          {references.map((r, idx) => {
            const lit = new Literature({
              title: r.title,
              url: r.url,
              doi: r.doi,
              isbn: r.isbn,
              year: r.year,
              refs: r.refs,
              litype: r.litype,
            });
            return (
              <ListGroup.Item key={r.id} className="py-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="me-2 flex-grow-1">
                    <div className="small text-muted mb-1">
                      Reference #{idx + 1}
                      {r.litype && REF_CITATION_MAP[r.litype] && (
                        <Badge bg="secondary" pill className="ms-2">
                          {REF_CITATION_MAP[r.litype].short}
                        </Badge>
                      )}
                    </div>
                    <Citation literature={lit} />
                  </div>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeReference(r.id)}
                  >
                    Remove
                  </Button>
                </div>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      )}

      <div className="border rounded p-3">
        <div className="fw-semibold mb-2">Add a reference</div>
        <Row className="mb-2">
          <Col xs={8}>
            <LiteratureInput
              literature={newRef}
              handleInputChange={updateNewRef}
              field="doi_isbn"
              readOnly={refBusy}
              placeholder="DOI: 10.... or http://dx.doi.org/10..."
            />
          </Col>
          <Col xs={3}>
            <LiteralType
              val={newRef.litype}
              handleInputChange={updateNewRef}
              disabled={refBusy}
              citationMap={REF_CITATION_MAP}
            />
          </Col>
          <Col xs={1} className="d-flex align-items-center justify-content-center">
            <Button
              variant="primary"
              size="sm"
              disabled={!isDoiReady(newRef) || refBusy}
              onClick={addRefFromDoi}
              title="Fetch metadata for this DOI and add the reference"
            >
              <i className="fa fa-plus" aria-hidden="true" />
            </Button>
          </Col>
        </Row>

        <Row className="mb-2">
          <Col>
            <Citation
              literature={new Literature({
                title: newRef.title,
                url: newRef.url,
                doi: newRef.doi,
                isbn: newRef.isbn,
                year: newRef.year,
                refs: newRef.refs,
                litype: newRef.litype,
              })}
            />
          </Col>
        </Row>

        <Row className="mb-2">
          <Col xs={7}>
            <LiteratureInput
              literature={newRef}
              handleInputChange={updateNewRef}
              field="title"
              readOnly={refBusy}
              placeholder="Title..."
            />
          </Col>
          <Col xs={4}>
            <LiteratureInput
              literature={newRef}
              handleInputChange={updateNewRef}
              field="url"
              readOnly={refBusy}
              placeholder="URL..."
            />
          </Col>
          <Col xs={1} className="d-flex align-items-center justify-content-center">
            <Button
              variant="primary"
              size="sm"
              disabled={!isManualReady(newRef) || refBusy}
              onClick={addRefManual}
              title="Add reference from title/URL"
            >
              <i className="fa fa-plus" aria-hidden="true" />
            </Button>
          </Col>
        </Row>

        {refMessage && (
          <Alert className="mt-2 mb-0 py-1" variant={refMessage.variant}>
            {refMessage.text}
          </Alert>
        )}
      </div>
    </>
  );

  const renderAnalysesStep = () => (
    <>
      <p className="text-muted">
        <span className="text-danger fw-semibold">At least one analysis is required.</span>
        {' '}
        Add one or more analyses (e.g. NMR, MS, IR). For each, choose a type, name your instrument,
        describe the measurement, and attach one or more files.
      </p>
      {moleculeInfo?.sumFormula && (
        <Alert variant="light" className="mb-3 py-2 border">
          <span className="fw-semibold">Sum formula:</span>
          {' '}
          <span className="font-monospace">{moleculeInfo.sumFormula}</span>
        </Alert>
      )}
      <Alert variant="info" className="mb-3 py-2">
        <div className="fw-semibold mb-1">Submission standards</div>
        <div className="small">
          Please follow the Chemotion repository file and analysis-test conventions:
          <ul className="mb-0">
            <li>
              <a href="https://chemotion.net/docs/repo/details_standards/files" target="_blank" rel="noopener noreferrer">
                Files standard
              </a>
            </li>
            <li>
              <a href="https://chemotion.net/docs/repo/details_standards/analysis_test" target="_blank" rel="noopener noreferrer">
                Analysis content standard
              </a>
            </li>
          </ul>
        </div>
      </Alert>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3">
          {error}
        </Alert>
      )}
      {analyses.length === 0 && (
        <Alert variant="warning" className="mb-3">
          Please add at least one analysis before submitting.
        </Alert>
      )}
      {analyses.map((analysis, idx) => {
        const kind = (analysis.type || '').split('|').shift().trim();
        const formula = moleculeInfo?.sumFormula || '';
        const nmrStr = contentToText(analysis.content);
        const isH = kind === 'CHMO:0000593' || kind === '1H NMR';
        const isC = kind === 'CHMO:0000595' || kind === '13C NMR';
        const hasContent = nmrStr.trim() !== '';
        let nmrBadge = null;
        if (isH) {
          const msg = hNmrCheckMsg(formula, nmrStr);
          const isMatch = hasContent && msg === '';
          const cls = isMatch ? 'text-success' : 'text-danger';
          const label = isMatch ? 'count match' : msg.trim() || 'count missing';
          nmrBadge = <span className={`ms-2 small ${cls}`}>(<sup>1</sup>H {label})</span>;
        } else if (isC) {
          const msg = cNmrCheckMsg(formula, nmrStr);
          const isMatch = hasContent && msg === '';
          const cls = isMatch ? 'text-success' : 'text-danger';
          const label = isMatch ? 'count match' : msg.trim() || 'count missing';
          nmrBadge = <span className={`ms-2 small ${cls}`}>(<sup>13</sup>C {label})</span>;
        }
        return (
        <div key={analysis.id} className="border rounded p-3 mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold">
              Analysis #{idx + 1}
              {nmrBadge}
            </div>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => removeAnalysis(analysis.id)}
            >
              Remove analysis
            </Button>
          </div>

          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={3} className="text-end">
              <span className="text-danger">* </span>
              Type
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={analysis.type}
                onChange={updateAnalysis(analysis.id, 'type')}
              >
                {ANALYSIS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Form.Select>
              {analysis.type && analysis.type !== 'other' && analysis.type !== '' && (
                <Form.Text className="text-muted d-block">
                  Please upload a zip file or jcamp/jdx file. The instrument will be extracted from the
                  uploaded file metadata when available.
                  {docLinkForType(analysis.type) && (
                    <>
                      {' '}
                      See the
                      {' '}
                      <a
                        href={docLinkForType(analysis.type)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {ANALYSIS_TYPES.find((t) => t.value === analysis.type)?.label}
                        {' '}
                        analysis content standard
                      </a>
                      {' '}
                      for accepted formats.
                    </>
                  )}
                </Form.Text>
              )}
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={3} className="text-end">
              <span className="text-danger">* </span>
              Content
            </Form.Label>
            <Col sm={9}>
              <AnalysisEditor
                template={textTemplate}
                analysis={{
                  extended_metadata: {
                    kind: analysis.type || '',
                    content: analysis.content || emptyDelta(),
                  },
                }}
                onChangeContent={updateAnalysisContent(analysis.id)}
                updateTextTemplates={updateAnalysisTextTemplates}
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={3} className="text-end">Name</Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                value={analysis.name}
                onChange={updateAnalysis(analysis.id, 'name')}
                placeholder="Defaults to first filename or 'Analysis N'"
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row}>
            <Form.Label column sm={3} className="text-end">
              <span className="text-danger">* </span>
              Files
            </Form.Label>
            <Col sm={9}>
              <Form.Control type="file" multiple onChange={addAnalysisFiles(analysis.id)} />
              <Form.Text className="text-muted">
                Upload a zip archive of raw data, or jcamp/jdx files. See the
                {' '}
                <a href="https://chemotion.net/docs/repo/details_standards/files" target="_blank" rel="noopener noreferrer">
                  Files standard
                </a>
                {' '}
                and
                {' '}
                <a
                  href={docLinkForType(analysis.type) || ANALYSIS_DOC_BASE}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Analysis content standard
                </a>
                {' '}
                for accepted formats.
              </Form.Text>
              {analysis.files.length > 0 && (
                <ul className="list-unstyled mt-2 mb-0">
                  {analysis.files.map((file, fIdx) => (
                    <li
                      key={`${file.name}-${fIdx}`}
                      className="d-flex justify-content-between align-items-center border rounded px-2 py-1 mb-1"
                    >
                      <div className="small">
                        {file.name}
                        <span className="text-muted ms-2">
                          {(file.size / 1024).toFixed(1)} KB
                          {file.type ? ` · ${file.type}` : ''}
                        </span>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-0"
                        onClick={() => removeAnalysisFile(analysis.id, fIdx)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-2 mt-2">
            <Form.Label column sm={3} className="text-end">
              <span className="text-danger">* </span>
              Instrument
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                value={analysis.instrument}
                onChange={updateAnalysis(analysis.id, 'instrument')}
                placeholder="Auto-filled from uploaded JCAMP/JDX when present, or enter manually"
                required
              />
              <Form.Text className="text-muted">
                The instrument is auto-extracted from JCAMP/JDX file headers (`##$INSTRUM`, `##.SPECTROMETER/DATA SYSTEM`).
                If extraction fails, fill it in manually.
              </Form.Text>
            </Col>
          </Form.Group>
        </div>
        );
      })}

      <Button variant="outline-primary" size="sm" onClick={addAnalysis}>
        + Add analysis
      </Button>
    </>
  );

  return (
    <Modal
      centered
      show={show}
      onHide={handleClose}
      size="xl"
      scrollable
      backdrop={submitting ? 'static' : true}
    >
      <Modal.Header closeButton={!submitting}>
        <Modal.Title style={{ fontSize: '1.75rem', fontWeight: 600 }}>
          New Entry - Submission
        </Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          minHeight: isLoggedIn && mode === null ? undefined : '75vh',
          maxHeight: '75vh',
          overflowY: 'auto',
        }}
      >
        {!isLoggedIn && (
          <div>
            <Alert variant="info">
              You need to sign in before submitting a quick entry.
            </Alert>
            <ExtendedSignInForm url="/users/sign_in" rememberable />
            <RepoLoginOptions />
          </div>
        )}
        {isLoggedIn && mode === null && renderModeChooser()}
        {isLoggedIn && mode === 'minimal' && (
          <>
            {renderStepper()}
            {error && STEPS[step]?.key !== 'analyses' && (
              <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>
            )}
            <Form>
              {STEPS[step]?.key === 'sample' && renderSampleStep()}
              {STEPS[step]?.key === 'author' && renderAuthorStep()}
              {STEPS[step]?.key === 'refs' && renderReferencesStep()}
              {STEPS[step]?.key === 'analyses' && renderAnalysesStep()}
            </Form>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="justify-content-start">
        <Button variant="secondary" onClick={handleClose} disabled={submitting}>
          Close
        </Button>
        {isLoggedIn && mode === 'minimal' && step === 0 && (
          <Button variant="outline-secondary" onClick={() => setMode(null)} disabled={submitting}>
            Back to options
          </Button>
        )}
        {isLoggedIn && mode === 'minimal' && step > 0 && (
          <Button variant="outline-secondary" onClick={goBack} disabled={submitting}>
            Back
          </Button>
        )}
        {isLoggedIn && mode === 'minimal' && step < STEPS.length - 1 && (
          <Button variant="primary" onClick={goNext} disabled={submitting}>
            Next
          </Button>
        )}
        {isLoggedIn && mode === 'minimal' && step === STEPS.length - 1 && (
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Queuing…' : 'Submit for review'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

QuickEntryModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onSubmitted: PropTypes.func,
};

QuickEntryModal.defaultProps = {
  onSubmitted: null,
};

export default QuickEntryModal;
