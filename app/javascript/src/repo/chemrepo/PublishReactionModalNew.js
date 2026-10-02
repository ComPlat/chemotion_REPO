import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';
import {
  Accordion,
  Badge,
  Button,
  Card,
  Collapse,
  Form,
  Modal,
  OverlayTrigger,
  ProgressBar,
  Table,
  Tooltip,
} from 'react-bootstrap';
import { head, filter, findIndex, flatten, sortedUniq, get, isUndefined } from 'lodash';
import Select from 'react-select';
import Immutable from 'immutable';
import uuid from 'uuid';
import { validateYield } from 'src/repo/chemrepo/PublishCommon';
import Reaction from 'src/models/Reaction';
import UserStore from 'src/stores/alt/stores/UserStore';
import RepositoryActions from 'src/repo/actions/RepositoryActions';
import {
  ReactionInfo,
  ReactionSchemeOnlyInfo,
  PublishAnalysesTag,
  EmbargoCom,
  isNmrPass,
  isDatasetPass,
  PublishTypeAs,
} from 'src/repo/repoHome/RepoCommon';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';
import { groupByCitation, Citation } from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import EmbargoFetcher from 'src/repo/fetchers/EmbargoFetcher';
import { CitationTypeMap, CitationTypeEOL } from 'src/repo/others/CitationType';
import {
  doStValidation,
  hasVersion,
} from 'src/repo/chemrepo/publication-utils';
import OrcidIcon from 'src/repo/chemrepo/common/Orcid';
import UserAffInfo from 'src/repo/chemrepo/publish-helper';
import VersionComment from 'src/repo/chemrepo/VersionComment';

const publishOptions = { f: 'full', s: 'scheme-only' };

const AnalysisIdstoPublish = (element) =>
  element
    .analysisArray()
    .filter(
      (a) =>
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true')
    )
    .map((x) => x.id);

const skimAnalysis = (sample) => {
  const analyses = sample.analysisArray();
  const publishedAnalyses = analyses.filter(
    (a) =>
      a.extended_metadata &&
      a.extended_metadata.publish &&
      (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true')
  );
  return publishedAnalyses.filter(
    (a) =>
      a.extended_metadata &&
      (a.extended_metadata.kind || '') !== '' &&
      (a.extended_metadata.status || '') === 'Confirmed' &&
      isNmrPass(a, sample) &&
      isDatasetPass(a)
  );
};

function AnalysisHeaderSample({ sampleSvgFile }) {
  const svgPath = `/images/samples/${sampleSvgFile}`;
  return (
    <Card className="mb-2 border-0 bg-light">
      <Card.Body className="d-flex align-items-center gap-3 py-2">
        <SVG key={svgPath} src={svgPath} className="sample-details" style={{ maxWidth: 120 }} />
        <div>
          <Badge bg="secondary" className="fs-6">
            <i className="icon-sample me-1" /> Product
          </Badge>
        </div>
      </Card.Body>
    </Card>
  );
}

AnalysisHeaderSample.propTypes = { sampleSvgFile: PropTypes.string.isRequired };

/* ── Section header component ─────────────────────────── */
function SectionHeader({ icon, title, count, variant = 'primary' }) {
  return (
    <div className="d-flex align-items-center gap-2">
      {icon && <i className={`fa fa-${icon}`} />}
      <span className="fw-semibold">{title}</span>
      {count !== undefined && (
        <Badge pill bg={count > 0 ? variant : 'secondary'}>
          {count}
        </Badge>
      )}
    </div>
  );
}

/* ── Submission validation panel ──────────────────────── */
function SubmissionValidationPanel({ validates }) {
  const [expanded, setExpanded] = useState(true);

  if (!validates || validates.length === 0) return null;

  const failures = validates.filter((v) => v.value === false);
  const passes = validates.filter((v) => v.value === true);
  const total = validates.length;
  const passCount = passes.length;
  const failCount = failures.length;
  const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const allGood = failCount === 0;

  const bgColor = allGood ? '#f0fdf4' : '#fef2f2';
  const headerColor = allGood ? '#166534' : '#991b1b';

  return (
    <div
      className="mb-3 rounded-3 overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Header row */}
      <div
        className="d-flex align-items-center justify-content-between px-3 py-2"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((p) => !p)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((p) => !p)}
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2">
          <i
            className={`fa ${
              allGood ? 'fa-check-circle' : 'fa-exclamation-circle'
            }`}
            style={{ fontSize: '1.1em', color: headerColor }}
          />
          <span className="fw-semibold small" style={{ color: headerColor }}>
            {allGood ? 'All checks passed' : 'Submission Data Check'}
          </span>
          {!allGood && (
            <Badge
              pill
              bg="danger"
              style={{ fontWeight: 500 }}
            >
              {failCount} issue{failCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="d-flex align-items-center gap-3">
          <small className="text-muted">
            {passCount}/{total}
          </small>
          <ProgressBar
            style={{ height: 5, width: 60, backgroundColor: '#e5e7eb' }}
          >
            <ProgressBar variant="success" now={pct} key="pass" />
          </ProgressBar>
          <i
            className={`fa fa-chevron-${expanded ? 'up' : 'down'}`}
            style={{ color: headerColor, fontSize: '0.75em' }}
          />
        </div>
      </div>

      {/* Expandable details */}
      <Collapse in={expanded}>
        <div className="px-3 pb-2">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {validates.map((v, idx) => (
                <tr key={`check_${v.name}`}>
                  <td style={{ width: 24, paddingTop: 4, paddingBottom: 4, verticalAlign: 'top', textAlign: 'right', paddingRight: 6 }}>
                    <span className="small text-muted">{idx + 1}.</span>
                  </td>
                  <td style={{ width: 280, paddingTop: 4, paddingBottom: 4, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    <span className={`small ${v.value ? 'text-muted' : 'text-danger'}`}>
                      {v.label || v.name}
                    </span>
                    &nbsp;
                    <i
                      className={`fa ${v.value ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'}`}
                    />
                  </td>
                  <td style={{ paddingTop: 4, paddingBottom: 4, verticalAlign: 'top' }}>
                    <span className={`small ${v.skip ? 'text-muted' : v.value ? 'text-success' : 'text-danger'}`}>
                      {v.skip ? 'Skipped' : v.value ? 'Passed' : (v.message || 'Failed')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapse>
    </div>
  );
}

/* ── Main component ───────────────────────────────────── */
export default function PublishReactionModalNew({
  reaction: reactionProp,
  show,
  onHide,
  onHandleAnalysesCheck,
}) {
  /* ── refs ── */
  const isMounted = useRef(true);
  const refMeAsAuthor = useRef(null);
  const refGroupLeadAsAuthor = useRef(null);

  /* ── state ── */
  const [reaction, setReaction] = useState(reactionProp);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [currentUser] = useState(() => UserStore.getState().currentUser);
  const [selectedRefs, setSelectedRefs] = useState([]);
  const [literatures, setLiteratures] = useState(new Immutable.Map());
  const [sortedIds, setSortedIds] = useState([]);
  const [selectedEmbargo, setSelectedEmbargo] = useState('-1');
  const [selectedLicense, setSelectedLicense] = useState('CC BY');
  const [disableLicense, setDisableLicense] = useState(false);
  const [cc0Consent, setCc0Consent] = useState({ consent1: false, consent2: false });
  const [bundles, setBundles] = useState([]);
  const [noSolvent, setNoSolvent] = useState(false);
  const [noAmountYield, setNoAmountYield] = useState(false);
  const [noEmbargo, setNoEmbargo] = useState(false);
  const [schemeDesc, setSchemeDesc] = useState(true);
  const [publishType, setPublishType] = useState({
    options: Object.values(publishOptions),
    selected: publishOptions.f,
    disabled: false,
  });
  const [behalfAsAuthor, setBehalfAsAuthor] = useState(false);
  const [newVersion, setNewVersion] = useState(false);
  const [addMeAsAuthor, setAddMeAsAuthor] = useState(true);
  const [addGroupLeadAsAuthor, setAddGroupLeadAsAuthor] = useState(true);
  const [showScheme, setShowScheme] = useState(false);
  const [showRinchi, setShowRinchi] = useState(false);
  const [showProp, setShowProp] = useState(false);
  const [showTlc, setShowTlc] = useState(false);

  /* ── derived ── */
  const isFullyPublish = publishType.selected === publishOptions.f;

  const getAuthorCount = useCallback(() => {
    const manualCount = (selectedUsers && selectedUsers.length) || 0;
    const groupLeadCount = addGroupLeadAsAuthor
      ? collaborations.filter((c) => c.is_group_lead).length
      : 0;
    return manualCount + (addMeAsAuthor ? 1 : 0) + groupLeadCount;
  }, [selectedUsers, collaborations, addMeAsAuthor, addGroupLeadAsAuthor]);

  /* ── data fetchers ── */
  const loadBundles = useCallback(() => {
    EmbargoFetcher.fetchEmbargoCollections(true).then((result) => {
      if (!isMounted.current) return;
      setBundles(result.repository || []);
    });
  }, []);

  const loadReferences = useCallback(() => {
    LiteraturesFetcher.fetchElementReferences(reaction, true).then((lits) => {
      if (!isMounted.current) return;
      const ids = groupByCitation(lits);
      setLiteratures(lits);
      setSortedIds(ids);
      setSelectedRefs((prev) => {
        let refs = prev.filter((item) => ids.includes(item));
        // pre-select all valid refs by default
        lits.forEach((lit) => {
          const { litype } = lit;
          const isUncategorized =
            typeof litype === 'undefined' || CitationTypeEOL.includes(litype);
          if (!isUncategorized && !refs.includes(lit.literal_id))
            refs = [...refs, lit.literal_id];
        });
        return refs;
      });
    });
  }, [reaction, newVersion]);

  const loadMyCollaborations = useCallback(() => {
    CollaboratorFetcher.fetchMyCollaborations().then((result) => {
      if (!isMounted.current) return;
      const collabs = result.authors || [];
      const groupLeads = collabs.filter((c) => c.is_group_lead);
      setCollaborations(collabs);
      setSelectedReviewers(
        groupLeads.map((lead) => ({ label: lead.name, value: lead.id }))
      );
    });
  }, []);

  /* ── lifecycle ── */
  useEffect(() => {
    isMounted.current = true;
    loadBundles();
    return () => {
      isMounted.current = false;
    };
  }, [loadBundles]);

  useEffect(() => {
    if (!reactionProp) return;
    reactionProp.convertDurationDisplay();

    const nv = !isUndefined(get(reactionProp, 'tag.taggable_data.previous_version'));
    const prevLicense = get(reactionProp, 'tag.taggable_data.previous_version.license');
    const prevSchemeOnly = get(reactionProp, 'tag.taggable_data.previous_version.scheme_only');
    const previousUsers = get(reactionProp, 'tag.taggable_data.previous_version.users', []);

    const pt = { ...publishType };
    if (prevSchemeOnly === true) {
      pt.selected = publishOptions.s;
      pt.disabled = true;
    } else if (prevSchemeOnly === false) {
      pt.selected = publishOptions.f;
      pt.disabled = true;
    }

    let behalf = false;
    const users = [];
    previousUsers.forEach((user) => {
      if (user.id !== currentUser.id) {
        behalf = true;
        users.push({ label: user.name, value: user.id });
      }
    });

    setReaction(reactionProp);
    setSelectedLicense(isUndefined(prevLicense) ? 'CC BY' : prevLicense);
    setDisableLicense(!isUndefined(prevLicense));
    setPublishType(pt);
    setBehalfAsAuthor(behalf);
    setSelectedUsers(users);
    setNewVersion(nv);
    loadReferences();
    loadMyCollaborations();
  }, [reactionProp]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── handlers ── */
  const handleInputChange = useCallback(
    (type, event) => {
      const r = { ...reaction };
      switch (type) {
        case 'temperature':
          r.temperature.userText = event.target.value;
          break;
        case 'temperatureUnit':
          r.temperature = r.convertTemperature(event);
          break;
        case 'duration':
          r.durationDisplay = { nextValue: event.target.value };
          break;
        case 'durationUnit':
          r.durationDisplay = { nextUnit: true };
          break;
        default:
          break;
      }
      setReaction(r);
    },
    [reaction]
  );

  const handleYieldChange = useCallback(
    (p, event) => {
      const { value } = event.target;
      if (isNaN(value)) return;
      const r = { ...reaction };
      const product = r.products.find((e) => e.id === p.id);
      if (product) {
        product.equivalent = value / 100;
        r.products.splice(
          r.products.findIndex((e) => e.id === p.id),
          1,
          product
        );
        setReaction({ ...r });
      }
    },
    [reaction]
  );

  const handlePropertiesChange = useCallback(
    (type, event) => {
      if (type === 'temperature') handleInputChange(type, event);
      if (type === 'duration' && !isNaN(event.target.value)) handleInputChange(type, event);
      if (type === 'schemeDesc') setSchemeDesc((prev) => !prev);
    },
    [handleInputChange]
  );

  const handleUnitChange = useCallback(
    (type, event) => {
      if (type === 'temperatureUnit') {
        const index = Reaction.temperature_unit.indexOf(event);
        handleInputChange('temperatureUnit', Reaction.temperature_unit[(index + 1) % 3]);
      } else if (type === 'durationUnit') {
        handleInputChange('durationUnit', event);
      }
    },
    [handleInputChange]
  );

  const handleRefCheck = useCallback((id) => {
    setSelectedRefs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleEmbargoChange = useCallback((val) => {
    if (val) setSelectedEmbargo(val);
  }, []);

  const handleLicenseChange = useCallback((val) => {
    if (val) {
      setSelectedLicense(val);
      setCc0Consent({ consent1: false, consent2: false });
    }
  }, []);

  const handleCC0ConsentChange = useCallback((val, type) => {
    setCc0Consent((prev) => ({ ...prev, [type]: val }));
  }, []);

  const handlePublishTypeChange = useCallback((e) => {
    setPublishType((prev) => ({ ...prev, selected: e }));
  }, []);

  const handleVersionComment = useCallback((value) => {
    setReaction((prev) => {
      const r = { ...prev };
      r.versionComment = value;
      return r;
    });
  }, []);

  const handleAnalysesChecked = useCallback(
    (analysis, elementType) => {
      const r = { ...reaction, changed: true };
      if (elementType === 'Reaction') {
        const elements = head(
          filter(r.container.children, (o) => o.container_type === 'analyses')
        ).children;
        const index = findIndex(elements, { id: analysis.id });
        if (index !== -1) elements.splice(index, 1, analysis);
      }
      if (elementType === 'Product') {
        r.products.forEach((product) => {
          const elements = head(
            filter(product.container.children, (o) => o.container_type === 'analyses')
          ).children;
          const index = findIndex(elements, { id: analysis.id });
          if (index !== -1) elements.splice(index, 1, analysis);
        });
      }
      setReaction(r);
      onHandleAnalysesCheck(r);
    },
    [reaction, onHandleAnalysesCheck]
  );

  /* ── validation ── */
  const validateAnalyses = useCallback(() => {
    let pas = reaction.products.reduce(
      (acc, s) => acc.concat(AnalysisIdstoPublish(s)),
      AnalysisIdstoPublish(reaction)
    );
    if (pas.length === 0) return false;
    pas = AnalysisIdstoPublish(reaction);
    if (pas.length > 0) return true;
    for (let i = 0; i < reaction.products.length; i += 1) {
      if (skimAnalysis(reaction.products[i]).length > 0) return true;
    }
    return false;
  }, [reaction]);

  const validatePub = useCallback(() => {
    const validates = [];
    if (isFullyPublish) {
      validates.push({
        name: 'embargo',
        label: 'Embargo bundle selected',
        value: newVersion || selectedEmbargo !== '-1' || (selectedEmbargo === '-1' && noEmbargo),
        message: newVersion ? '' : 'No embargo bundle',
        skip: selectedEmbargo === '-1' && noEmbargo && !newVersion,
      });
      validates.push({
        name: 'reaction type',
        label: 'Reaction type specified',
        value: !!(reaction.rxno && reaction.rxno.length > 0),
        message: reaction.rxno ? '' : 'Reaction type is missing',
      });
      const hasSt = reaction.starting_materials?.length > 0;
      validates.push({
        name: 'start_material',
        label: 'Has starting materials',
        value: !!hasSt,
        message: hasSt ? '' : 'Start material is missing',
      });
      const hasSv = noSolvent || (reaction.solvents && reaction.solvents.length > 0);
      validates.push({
        name: 'solvent',
        label: 'Has solvents',
        value: !!hasSv,
        message: hasSv ? '' : 'Solvent is missing',
        skip: noSolvent,
      });
      const hasProduct = reaction.products && reaction.products.length > 0;
      validates.push({
        name: 'product',
        label: 'Has products',
        value: !!hasProduct,
        message: hasProduct ? '' : 'Product is missing',
      });

      const stValidation = doStValidation(reaction);
      if (stValidation) {
        (reaction.starting_materials || []).forEach((st) => {
          if (!st.amount || !st.amount.value) {
            validates.push({
              name: `starting_materials-amount-${st.id}`,
              label: 'Starting material amount',
              value: false,
              message: `[Starting material] ${st.molecule_iupac_name}: amount is 0`,
            });
          }
        });
      }
      if (!noAmountYield) {
        (reaction.products || []).forEach((prod) => {
          if (!prod.amount || !prod.amount.value) {
            validates.push({
              name: `product-amount-${prod.id}`,
              label: 'Product amount',
              value: false,
              message: `[Product] ${prod.molecule_iupac_name}: amount is 0`,
            });
          }
        });
      }

      const authorCount = getAuthorCount();
      validates.push({
        name: 'authors',
        label: 'At least 1 author',
        value: authorCount >= 1,
        message: 'At least one author is required',
      });

      validates.push({
        name: 'behalf-author',
        label: 'Confirmed contributing on behalf',
        value: (selectedUsers && selectedUsers.length) > 0 ? !!behalfAsAuthor : true,
        message: (selectedUsers && selectedUsers.length) > 0
          ? 'Please confirm you are contributing on behalf of the selected author(s)'
          : '',
        skip: !(selectedUsers && selectedUsers.length > 0),
      });

      validates.push({
        name: 'analyses',
        label: 'Valid analyses selected',
        value: validateAnalyses(),
        message: 'No valid analyses selected for publication',
      });
    }
    return noAmountYield ? validates : validates.concat(
      validateYield(reaction)
    );
  }, [
    isFullyPublish, newVersion, selectedEmbargo, noEmbargo, reaction,
    noSolvent, noAmountYield, getAuthorCount, selectedUsers, behalfAsAuthor,
    validateAnalyses,
  ]);

  const validateInfo = useMemo(() => validatePub(), [validatePub]);
  const validated = useMemo(
    () => !validateInfo.some((v) => v.value === false),
    [validateInfo]
  );
  const canPublish = isFullyPublish ? validateAnalyses() && getAuthorCount() >= 1 : true;

  /* ── publish action ── */
  const handlePublishReaction = useCallback(() => {
    const manualAuthorCount = selectedUsers && selectedUsers.length;
    const authorCount = getAuthorCount();

    if (selectedLicense === 'CC0' && !disableLicense && (!cc0Consent.consent1 || !cc0Consent.consent2)) {
      alert('Please check the license section before sending your data.');
      return;
    }
    if (manualAuthorCount > 0 && !behalfAsAuthor) {
      alert(`Please confirm you are contributing on behalf of the author${manualAuthorCount > 1 ? 's' : ''}.`);
      return;
    }
    if (authorCount < 1 && isFullyPublish) {
      alert('Please add at least one author.');
      return;
    }

    if (isFullyPublish) {
      const { samples } = reaction;
      for (let i = 0; i < samples.length; i += 1) {
        reaction.samples[i].container.children.find(
          (c) => c && c.container_type === 'analyses'
        ).children = skimAnalysis(samples[i]);
      }
    }

    RepoLoadingActions.start();
    RepositoryActions.publishReaction(
      {
        isFullyPublish,
        reaction,
        coauthors: selectedUsers.map((u) => u.value),
        reviewers: selectedReviewers.map((u) => u.value),
        refs: selectedRefs,
        embargo: selectedEmbargo,
        license: selectedLicense,
        schemeDesc,
        addMe: addMeAsAuthor,
        addGroupLead: addGroupLeadAsAuthor,
      },
      true
    );
    onHide(false);
  }, [
    reaction, selectedUsers, selectedReviewers, selectedRefs, selectedEmbargo,
    selectedLicense, disableLicense, cc0Consent, behalfAsAuthor, isFullyPublish,
    schemeDesc, addMeAsAuthor, addGroupLeadAsAuthor, getAuthorCount, onHide,
  ]);

  /* ── sub-renders ── */
  const renderContributor = () => {
    const orcid = OrcidIcon({ orcid: currentUser.orcid });
    const aff =
      currentUser?.current_affiliations &&
      Object.keys(currentUser.current_affiliations).map((k) => (
        <div key={uuid.v4()} className="text-muted small">
          &bull; {currentUser.current_affiliations[k]}
        </div>
      ));
    return (
      <Card className="mb-3 border-0 bg-light">
        <Card.Body className="py-2">
          <div className="fw-semibold mb-1">
            <i className="fa fa-user-circle me-1 text-primary" /> Contributor
          </div>
          <div className="d-flex align-items-center gap-1">
            {orcid} {currentUser.name}
          </div>
          {aff}
        </Card.Body>
      </Card>
    );
  };

  const renderSelectUsers = () => {
    const options = collaborations.map((c) => ({ label: c.name, value: c.id }));
    const authorCount = getAuthorCount();
    const authorsInfo = UserAffInfo({
      users: selectedUsers,
      collaborations,
      parentId: 'author',
    });

    return (
      <div className="d-flex flex-column gap-2">
        <div className="d-flex flex-column gap-1">
          <Form.Check
            type="checkbox"
            id="chk-add-me"
            checked={addMeAsAuthor}
            onChange={() => setAddMeAsAuthor((p) => !p)}
            ref={refMeAsAuthor}
            label="Add me as author"
          />
          <Form.Check
            type="checkbox"
            id="chk-add-leads"
            checked={addGroupLeadAsAuthor}
            onChange={() => setAddGroupLeadAsAuthor((p) => !p)}
            ref={refGroupLeadAsAuthor}
            label="Add group leads as authors"
          />
          <Form.Check
            type="checkbox"
            id="chk-behalf"
            checked={behalfAsAuthor}
            onChange={() => setBehalfAsAuthor((p) => !p)}
            label={`I am contributing on behalf of the author${authorCount > 1 ? 's' : ''}`}
          />
        </div>
        <div>
          <Form.Label className="fw-semibold small text-uppercase text-muted">Authors</Form.Label>
          <Select
            isMulti
            isSearchable
            placeholder="Search and select authors..."
            value={selectedUsers}
            options={options}
            onChange={(val) => setSelectedUsers(val || [])}
            styles={{
              control: (base) => ({ ...base, borderRadius: '0.5rem' }),
            }}
          />
        </div>
        {authorsInfo && <div className="mt-1">{authorsInfo}</div>}
      </div>
    );
  };

  const renderReviewers = () => {
    const options = collaborations.map((c) => ({ label: c.name, value: c.id }));
    const reviewersInfo = UserAffInfo({
      users: selectedReviewers,
      collaborations,
      parentId: 'reviewer',
    });

    return (
      <div className="d-flex flex-column gap-2">
        <Form.Label className="fw-semibold small text-uppercase text-muted">
          Group Lead / Additional Reviewers
        </Form.Label>
        <Select
          isMulti
          isSearchable
          placeholder="Search and select reviewers..."
          value={selectedReviewers}
          options={options}
          onChange={(val) => setSelectedReviewers(val || [])}
          styles={{
            control: (base) => ({ ...base, borderRadius: '0.5rem' }),
          }}
        />
        {reviewersInfo && <div className="mt-1">{reviewersInfo}</div>}
      </div>
    );
  };

  const renderCitationTable = (rows, sids, refs) => {
    const uniqueIds = sortedUniq(sids);
    return (
      <Table hover size="sm" className="mb-0">
        <tbody>
          {uniqueIds.map((id) => {
            const citation = rows.get(id);
            let { litype } = citation;
            if (typeof litype === 'undefined' || CitationTypeEOL.includes(litype)) {
              litype = 'uncategorized';
            }
            const disabled = litype === 'uncategorized';
            const tip = disabled
              ? 'Citation type is uncategorized — cannot publish'
              : 'Publish this reference';

            return (
              <tr key={id}>
                <td className="align-middle" style={{ width: '60%' }}>
                  <div className="d-flex align-items-start gap-2">
                    <i
                      className={`icon-${citation?.element_type?.toLowerCase()} text-muted mt-1`}
                      style={{ fontSize: '1.2em' }}
                    />
                    <Citation literature={citation} />
                  </div>
                </td>
                <td className="align-middle">
                  <OverlayTrigger
                    placement="left"
                    overlay={<Tooltip id={`tip-ref-${id}`}>{tip}</Tooltip>}
                  >
                    <span>
                      <Form.Check
                        type="checkbox"
                        disabled={disabled}
                        checked={refs.includes(id)}
                        onChange={() => handleRefCheck(id)}
                        label={
                          <span className="small">
                            Add to publication
                            <br />
                            <span className="text-muted">
                              ({CitationTypeMap[litype].def})
                            </span>
                          </span>
                        }
                      />
                    </span>
                  </OverlayTrigger>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  const renderReferences = () => (
    <Card className="border-0">
      <Card.Body className="p-0">
        {renderCitationTable(literatures, sortedIds, selectedRefs)}
      </Card.Body>
    </Card>
  );

  /* ── early return ── */
  if (!show) return null;

  /* ── compute analyses view ── */
  const analysesView = [];
  const analysesReaction = reaction.container
    ? (head(filter(reaction.container.children, (o) => o.container_type === 'analyses')) || {})
        .children || []
    : [];

  let selectedAnalysesCount = (analysesReaction || []).filter(
    (a) =>
      a.extended_metadata &&
      a.extended_metadata.publish &&
      (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true') &&
      a.extended_metadata.kind
  ).length;

  analysesView.push(
    analysesReaction.map((analysis) => (
      <PublishAnalysesTag
        reaction={reaction}
        analysis={analysis}
        key={`reaction_${analysis.id}`}
        analysesType="Reaction"
        handleAnalysesChecked={handleAnalysesChecked}
      />
    ))
  );

  reaction.products.forEach((product) => {
    analysesView.push(
      <AnalysisHeaderSample
        sampleSvgFile={product.sample_svg_file}
        key={`reaction_analysis_${product.id}`}
      />
    );
    const tmp = head(
      filter(product.container.children, (o) => o.container_type === 'analyses')
    ).children;
    analysesView.push(
      tmp.map((analysis) => (
        <PublishAnalysesTag
          reaction={reaction}
          analysis={analysis}
          key={`reaction_product_${analysis.id}`}
          analysesType="Product"
          handleAnalysesChecked={handleAnalysesChecked}
          product={product}
        />
      ))
    );
    selectedAnalysesCount += (tmp || []).filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true || a.extended_metadata.publish === 'true') &&
        a.extended_metadata.kind &&
        (a.extended_metadata.status || '') === 'Confirmed' &&
        isNmrPass(a, product) &&
        isDatasetPass(a)
    ).length;
  });

  const embargoOpts = bundles.map((col) => {
    const tag = col.taggable_data || {};
    return { value: col.element_id, name: tag.label, label: tag.label };
  });

  const publishTypeAs = { ...publishType, onChange: handlePublishTypeChange };

  return (
    <Modal
      show={show}
      size="xl"
      onHide={() => onHide(false)}
      centered
      scrollable
      className="publish-reaction-modal-new"
    >
      {/* ── Header ── */}
      <Modal.Header closeButton className="border-bottom-0 pb-0 align-items-center gap-3">
        <Modal.Title className="fs-5 fw-bold flex-grow-1 mb-0">
          <i className="icon-reaction me-2 text-primary" />
          Publish Reaction
        </Modal.Title>
        <Form.Group className="d-flex align-items-center gap-2 mb-0 me-2">
          <Form.Label className="mb-0 small text-muted text-nowrap">
            Publish as
          </Form.Label>
          <PublishTypeAs {...publishTypeAs} />
        </Form.Group>
      </Modal.Header>

      {/* ── Body ── */}
      <Modal.Body
        className="pt-2"
        style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        {/* Embargo & License */}
        <Card className="mb-3 shadow-sm">
          <Card.Body className="py-3">
            <EmbargoCom
              opts={embargoOpts}
              selectedValue={selectedEmbargo}
              onEmbargoChange={handleEmbargoChange}
              selectedLicense={selectedLicense}
              disableLicense={disableLicense}
              onLicenseChange={handleLicenseChange}
              onCC0ConsentChange={handleCC0ConsentChange}
              cc0Deed={cc0Consent}
            />
          </Card.Body>
        </Card>

        {/* Submission Check */}
        <SubmissionValidationPanel validates={validateInfo} />

        {/* Reaction Info */}
        {isFullyPublish ? (
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <ReactionInfo
                reaction={reaction}
                toggleScheme={() => setShowScheme((p) => !p)}
                showScheme={showScheme}
                isPublic={false}
                toggleRinchi={() => setShowRinchi((p) => !p)}
                showRinchi={showRinchi}
                toggleProp={() => setShowProp((p) => !p)}
                showProp={showProp}
                toggleTlc={() => setShowTlc((p) => !p)}
                showTlc={showTlc}
              />
            </Card.Body>
          </Card>
        ) : (
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <ReactionSchemeOnlyInfo
                reaction={reaction}
                isPublic={false}
                schemeDesc={schemeDesc}
                onYieldChange={handleYieldChange}
                onPropertiesChange={handlePropertiesChange}
                onUnitChange={handleUnitChange}
              />
            </Card.Body>
          </Card>
        )}

        {/* Version comment */}
        {hasVersion(reaction) && (
          <Card className="mb-3 shadow-sm">
            <Card.Body>
              <VersionComment element={reaction} onChange={handleVersionComment} />
            </Card.Body>
          </Card>
        )}

        {/* Checkboxes */}
        <div className="d-flex flex-column gap-1 mb-3">
          {selectedEmbargo === '-1' && !newVersion && (
            <Form.Check
              type="checkbox"
              id="chk-no-embargo"
              onChange={() => setNoEmbargo((p) => !p)}
              checked={noEmbargo}
              className={`display-${isFullyPublish}`}
              label={
                <span className="small">
                  I know that the data submitted without an embargo bundle will be published
                  immediately after a successful review.
                </span>
              }
            />
          )}
          {isFullyPublish && (
            <>
              <Form.Check
                type="checkbox"
                id="chk-no-solvent"
                onChange={() => setNoSolvent((p) => !p)}
                checked={noSolvent}
                label="This reaction has no solvents"
              />
              <Form.Check
                type="checkbox"
                id="chk-no-amount"
                onChange={() => setNoAmountYield((p) => !p)}
                checked={noAmountYield}
                label="Skip amount and yield validation (product has no amount and yield)"
              />
            </>
          )}
        </div>

        {/* Accordion sections */}
        <Accordion defaultActiveKey="3" alwaysOpen className="mb-2">
          {/* Analyses */}
          {isFullyPublish && (
            <Accordion.Item eventKey="2">
              <Accordion.Header>
                <SectionHeader icon="bar-chart" title="Analyses" count={selectedAnalysesCount} />
              </Accordion.Header>
              <Accordion.Body>
                <Accordion id={`accordion_ds_${reaction.id}`} defaultActiveKey="0">
                  {flatten(analysesView)}
                </Accordion>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {/* Authors */}
          <Accordion.Item eventKey="3">
            <Accordion.Header>
              <SectionHeader icon="users" title="Authors" count={getAuthorCount()} />
            </Accordion.Header>
            <Accordion.Body>
              {renderContributor()}
              {renderSelectUsers()}
            </Accordion.Body>
          </Accordion.Item>

          {/* References */}
          {isFullyPublish && (
            <Accordion.Item eventKey="5">
              <Accordion.Header>
                <SectionHeader icon="book" title="References" count={selectedRefs.length} />
              </Accordion.Header>
              <Accordion.Body>{renderReferences()}</Accordion.Body>
            </Accordion.Item>
          )}

          {/* Reviewers */}
          <Accordion.Item eventKey="6">
            <Accordion.Header>
              <SectionHeader
                icon="user-plus"
                title="Group Lead / Reviewers"
                count={selectedReviewers.length}
              />
            </Accordion.Header>
            <Accordion.Body>{renderReviewers()}</Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Modal.Body>

      {/* ── Footer ── */}
      <Modal.Footer className="d-flex justify-content-start">
        <Button variant="light" onClick={() => onHide(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={!canPublish || !validated}
          onClick={handlePublishReaction}
          className="px-4"
        >
          <i className="fa fa-paper-plane me-2" />
          Publish Reaction
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

PublishReactionModalNew.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onPublishRefreshClose: PropTypes.func.isRequired,
  onHandleAnalysesCheck: PropTypes.func.isRequired,
};
