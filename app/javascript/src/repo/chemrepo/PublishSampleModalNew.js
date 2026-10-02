import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
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
import Select from 'react-select';
import Immutable from 'immutable';
import { get, isUndefined, sortedUniq } from 'lodash';
import Sample from 'src/models/Sample';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';
import UserStore from 'src/stores/alt/stores/UserStore';
import RepositoryActions from 'src/repo/actions/RepositoryActions';
import {
  groupByCitation,
  Citation,
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import {
  MoleculeInfo,
  EmbargoCom,
  isNmrPass,
  isDatasetPass,
} from 'src/repo/repoHome/RepoCommon';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';
import CollaboratorFetcher from 'src/repo/fetchers/CollaboratorFetcher';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import EmbargoFetcher from 'src/repo/fetchers/EmbargoFetcher';
import { CitationTypeMap, CitationTypeEOL } from 'src/repo/others/CitationType';
import OrcidIcon from 'src/repo/chemrepo/common/Orcid';
import UserAffInfo from 'src/repo/chemrepo/publish-helper';
import VersionComment from 'src/repo/chemrepo/VersionComment';
import { hasVersion } from 'src/repo/chemrepo/publication-utils';

/* ── Submission Validation Panel ─────────────────────── */
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
      <div
        className="d-flex align-items-center justify-content-between px-3 py-2"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="d-flex align-items-center gap-2">
          <i
            className={`fa ${allGood ? 'fa-check-circle' : 'fa-exclamation-circle'}`}
            style={{ fontSize: '1.1em', color: headerColor }}
          />
          <span className="fw-semibold small" style={{ color: headerColor }}>
            {allGood ? 'All checks passed' : 'Submission Data Check'}
          </span>
          {!allGood && (
            <Badge
              bg="danger"
              pill
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

SectionHeader.propTypes = {
  icon: PropTypes.string,
  title: PropTypes.string.isRequired,
  count: PropTypes.number,
  variant: PropTypes.string,
};

/* ── Main component ───────────────────────────────────── */
export default function PublishSampleModalNew({
  sample: sampleProp,
  show,
  onHide,
}) {
  /* ── refs ── */
  const isMounted = useRef(true);
  const refMeAsAuthor = useRef(null);
  const refGroupLeadAsAuthor = useRef(null);

  /* ── state ── */
  const [sample, setSample] = useState(sampleProp);
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
  const [noEmbargo, setNoEmbargo] = useState(false);
  const [behalfAsAuthor, setBehalfAsAuthor] = useState(false);
  const [newVersion, setNewVersion] = useState(false);
  const [addMeAsAuthor, setAddMeAsAuthor] = useState(true);
  const [addGroupLeadAsAuthor, setAddGroupLeadAsAuthor] = useState(true);

  /* ── derived ── */
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
    LiteraturesFetcher.fetchElementReferences(sample).then((lits) => {
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
  }, [sample, newVersion]);

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
    if (!sampleProp) return;

    const nv = !isUndefined(get(sampleProp, 'tag.taggable_data.previous_version'));
    const prevLicense = get(sampleProp, 'tag.taggable_data.previous_version.license');
    const previousUsers = get(sampleProp, 'tag.taggable_data.previous_version.users', []);

    let behalf = false;
    const users = [];
    previousUsers.forEach((user) => {
      if (user.id !== currentUser.id) {
        behalf = true;
        users.push({ label: user.name, value: user.id });
      }
    });

    setSample(sampleProp);
    setSelectedLicense(isUndefined(prevLicense) ? 'CC BY' : prevLicense);
    setDisableLicense(!isUndefined(prevLicense));
    setBehalfAsAuthor(behalf);
    setSelectedUsers(users);
    setNewVersion(nv);
    loadReferences();
    loadMyCollaborations();
  }, [sampleProp]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── handlers ── */
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

  const handleVersionComment = useCallback((value) => {
    setSample((prev) => {
      const s = { ...prev };
      s.versionComment = value;
      return s;
    });
  }, []);

  const handleSampleChanged = useCallback((s) => {
    setSample(s);
  }, []);

  /* ── validation ── */
  const validateAnalyses = useCallback(() => {
    const analyses = sample.analysisArray();
    const publishedAnalyses = analyses.filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true')
    );
    return publishedAnalyses.length > 0;
  }, [sample]);

  const validateSubmission = useCallback(() => {
    if (selectedEmbargo === '-1' && !noEmbargo && !newVersion) return false;
    const analyses = sample.analysisArray();
    if (!validateAnalyses()) return false;

    let publishedAnalyses = analyses.filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true')
    );
    publishedAnalyses = publishedAnalyses.filter(
      (a) =>
        a.extended_metadata &&
        (a.extended_metadata.kind || '') !== '' &&
        (a.extended_metadata.status || '') === 'Confirmed' &&
        isNmrPass(a, sample) &&
        isDatasetPass(a)
    );
    return publishedAnalyses.length > 0;
  }, [sample, selectedEmbargo, noEmbargo, newVersion, validateAnalyses]);

  const validatePub = useCallback(() => {
    const validates = [];

    validates.push({
      name: 'embargo',
      label: 'Embargo bundle selected',
      value: newVersion || selectedEmbargo !== '-1' || (selectedEmbargo === '-1' && noEmbargo),
      message: newVersion ? '' : 'No embargo bundle selected',
      skip: selectedEmbargo === '-1' && noEmbargo && !newVersion,
    });

    const authorCount = getAuthorCount();
    validates.push({
      name: 'authors',
      label: 'At least 1 author',
      value: authorCount >= 1,
      message: 'At least one author is required',
    });

    const manualAuthorCount = Array.isArray(selectedUsers) ? selectedUsers.length : 0;
    validates.push({
      name: 'behalf-author',
      label: 'Confirmed contributing on behalf',
      value: manualAuthorCount > 0 ? !!behalfAsAuthor : true,
      message: manualAuthorCount > 0
        ? 'Please confirm you are contributing on behalf of the selected author(s)'
        : '',
      skip: manualAuthorCount === 0,
    });

    const analyses = sample.analysisArray();
    const publishedAnalyses = analyses.filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true') &&
        (a.extended_metadata.kind || '') !== '' &&
        (a.extended_metadata.status || '') === 'Confirmed' &&
        isNmrPass(a, sample) &&
        isDatasetPass(a)
    );
    validates.push({
      name: 'analyses',
      label: 'Valid analyses selected',
      value: publishedAnalyses.length > 0,
      message: 'No valid analyses selected for publication',
    });

    return validates;
  }, [
    newVersion, selectedEmbargo, noEmbargo, getAuthorCount,
    selectedUsers, behalfAsAuthor, sample,
  ]);

  const validateInfo = useMemo(() => validatePub(), [validatePub]);
  const validated = useMemo(
    () => !validateInfo.some((v) => v.value === false),
    [validateInfo]
  );
  const canPublish = validateSubmission() && getAuthorCount() >= 1;

  /* ── publish action ── */
  const handlePublishSample = useCallback(() => {
    const manualAuthorCount = selectedUsers && selectedUsers.length;
    const authorCount = getAuthorCount();

    if (
      selectedLicense === 'CC0' &&
      !disableLicense &&
      (!cc0Consent.consent1 || !cc0Consent.consent2)
    ) {
      alert('Please check the license section before sending your data.');
      return;
    }

    if (!validateSubmission()) {
      alert('Submission Check fail. Please review your data and re-submit.');
      return;
    }

    if (manualAuthorCount > 0 && !behalfAsAuthor) {
      alert(
        `Please confirm you are contributing on behalf of the author${manualAuthorCount > 1 ? 's' : ''}`
      );
      return;
    }

    if (authorCount < 1) {
      alert('Please add at least one author.');
      return;
    }

    const analyses = sample.analysisArray();
    let publishedAnalyses = analyses.filter(
      (a) =>
        a.extended_metadata &&
        a.extended_metadata.publish &&
        (a.extended_metadata.publish === true ||
          a.extended_metadata.publish === 'true')
    );
    publishedAnalyses = publishedAnalyses.filter(
      (a) =>
        a.extended_metadata &&
        (a.extended_metadata.kind || '') !== '' &&
        (a.extended_metadata.status || '') === 'Confirmed' &&
        isNmrPass(a, sample) &&
        isDatasetPass(a)
    );

    sample.container.children.find(
      (c) => c && c.container_type === 'analyses'
    ).children = publishedAnalyses;

    RepoLoadingActions.start();
    RepositoryActions.publishSample(
      {
        sample,
        coauthors: selectedUsers.map((u) => u.value),
        reviewers: selectedReviewers.map((u) => u.value),
        refs: selectedRefs,
        embargo: selectedEmbargo,
        license: selectedLicense,
        addMe: addMeAsAuthor,
        addGroupLead: addGroupLeadAsAuthor,
      },
      true
    );
    onHide();
  }, [
    sample, selectedUsers, selectedReviewers, selectedRefs, selectedEmbargo,
    selectedLicense, disableLicense, cc0Consent, behalfAsAuthor,
    addMeAsAuthor, addGroupLeadAsAuthor, getAuthorCount, validateSubmission, onHide,
  ]);

  /* ── sub-renders ── */
  const renderContributor = () => {
    const orcid = OrcidIcon({ orcid: currentUser.orcid });
    const aff =
      currentUser?.current_affiliations &&
      Object.keys(currentUser.current_affiliations).map((k) => (
        <div key={`aff-${k}`} className="text-muted small">
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
                  <Citation literature={citation} />
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
  const analyses = sample.analysisArray();
  const selectedAnalysesCount = analyses.filter(
    (a) =>
      a.extended_metadata &&
      a.extended_metadata.publish &&
      (a.extended_metadata.publish === true ||
        a.extended_metadata.publish === 'true') &&
      a.extended_metadata.kind &&
      a.extended_metadata.status === 'Confirmed' &&
      isNmrPass(a, sample) &&
      isDatasetPass(a)
  ).length;

  const { molecule } = sample;

  const embargoOpts = bundles.map((col) => {
    const tag = col.taggable_data || {};
    return { value: col.element_id, name: tag.label, label: tag.label };
  });

  const awareEmbargo =
    selectedEmbargo === '-1' && !newVersion ? (
      <Form.Check
        type="checkbox"
        onChange={() => setNoEmbargo((p) => !p)}
        checked={noEmbargo}
        label={
          <span>
            I know that the data that is submitted without the selection of an
            embargo bundle will be published immediately after a successful
            review.
          </span>
        }
      />
    ) : (
      <div />
    );

  return (
    <Modal
      animation
      show={show}
      size="xl"
      onHide={() => onHide()}
    >
      <Modal.Header closeButton>
        <Modal.Title>Publish Sample</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          paddingBottom: 'unset',
          maxHeight: 'calc(100vh - 210px)',
          overflowY: 'auto',
        }}
      >
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
        <Card>
          <Card.Body>
            <MoleculeInfo
              molecule={molecule}
              sample_svg_file={sample.sample_svg_file}
            />
          </Card.Body>
        </Card>
        <div style={{ margin: '5px 0px' }}>
          <SubmissionValidationPanel validates={validateInfo} />
        </div>
        {hasVersion(sample) && (
          <VersionComment
            element={sample}
            onChange={handleVersionComment}
          />
        )}
        {awareEmbargo}
        <Accordion id="publish-sample-config">
          <Accordion.Item eventKey="2">
            <Accordion.Header>
              <SectionHeader icon="bar-chart" title="Select Analyses" count={selectedAnalysesCount} />
            </Accordion.Header>
            <Accordion.Body>
              <SampleDetailsContainers
                readOnly
                publish
                sample={sample}
                handleSampleChanged={handleSampleChanged}
                handleSubmit={() => {}}
              />
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="3">
            <Accordion.Header>
              <SectionHeader icon="users" title="Select Authors" count={selectedUsers.length} />
            </Accordion.Header>
            <Accordion.Body>
              {renderContributor()}
              {renderSelectUsers()}
            </Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="5">
            <Accordion.Header>
              <SectionHeader icon="book" title="Select References" count={selectedRefs.length} />
            </Accordion.Header>
            <Accordion.Body>{renderReferences()}</Accordion.Body>
          </Accordion.Item>
          <Accordion.Item eventKey="6">
            <Accordion.Header>
              <SectionHeader icon="user-plus" title="Group Lead / Additional Reviewers" count={selectedReviewers.length} />
            </Accordion.Header>
            <Accordion.Body>{renderReviewers()}</Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-start">
        <Button variant="light" onClick={() => onHide()}>Close</Button>
        <Button
          variant="primary"
          disabled={!canPublish || !validated}
          onClick={handlePublishSample}
        >
          Publish Sample
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

PublishSampleModalNew.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onPublishRefreshClose: PropTypes.func.isRequired,
};
