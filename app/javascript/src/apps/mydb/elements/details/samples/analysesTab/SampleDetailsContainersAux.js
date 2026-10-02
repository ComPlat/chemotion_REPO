import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import QuillViewer from 'src/components/QuillViewer';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import ImageModal from 'src/components/common/ImageModal';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { BuildSpcInfos, JcampIds, BuildSpcInfosForNMRDisplayer, isNMRKind } from 'src/utilities/SpectraHelper';
import { hNmrCheckMsg, cNmrCheckMsg, msCheckMsg, instrumentText } from 'src/utilities/ElementUtils';
import { contentToText } from 'src/utilities/quillFormat';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { chmoConversions } from 'src/components/OlsComponent';
import MolViewerListBtn from 'src/components/viewer/MolViewerListBtn';
import MolViewerSet from 'src/components/viewer/MolViewerSet';
import MatrixCheck from 'src/components/common/MatrixCheck';
import SpectraEditorButton from 'src/components/common/SpectraEditorButton';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';
import { getAttachmentFromContainer } from 'src/utilities/imageHelper';

// Chemotion Repository
import { isNmrPass, isDatasetPass } from 'src/repo/repoHome/RepoCommon';

const qCheckPass = () => (
  <i className="fa fa-check ms-1 text-success"/>
);

const qCheckFail = (msg, kind, atomNum = '') => (
  <span className="ms-1 text-danger">
    (<sup>{atomNum}</sup>{kind} {msg})
  </span>
);

const qCheckMsg = (sample, container) => {
  if (sample.molecule && container.extended_metadata &&
    ((typeof container.extended_metadata.kind === 'undefined' || container.extended_metadata.kind == null ||
      container.extended_metadata.kind.split('|').length < 2) ||
      (container.extended_metadata.kind.split('|')[0].trim() !== chmoConversions.nmr_1h.termId
        && container.extended_metadata.kind.split('|')[0].trim() !== chmoConversions.nmr_13c.termId
        && !container.extended_metadata.kind.split('|')[1].includes('mass spectrometry'))
    )) {
    return '';
  }
  const str = container.extended_metadata && contentToText(container.extended_metadata.content);

  if (container.extended_metadata.kind.split('|')[0].trim() === chmoConversions.nmr_1h.termId) {
    const msg = hNmrCheckMsg(sample.molecule_formula, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'H', '1');
  } else if (container.extended_metadata.kind.split('|')[0].trim() === chmoConversions.nmr_13c.termId) {
    const msg = cNmrCheckMsg(sample.molecule_formula, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'C', '13');
  } else if (container.extended_metadata.kind.split('|')[1].includes('mass spectrometry')) {
    const msg = msCheckMsg(sample.molecule.exact_molecular_weight, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'MS', '');
  }
  return '';
};

const AnalysisModeToggle = (mode, handleToggleMode, isDisabled) => {
  return (
    <ButtonGroup>
      <ButtonGroupToggleButton
        size="xsm"
        active={mode === 'edit'}
        onClick={() => handleToggleMode('edit')}
        disabled={isDisabled}
      >
        <i className="fa fa-edit me-1" />
        Edit mode
      </ButtonGroupToggleButton>
      <ButtonGroupToggleButton
        size="xsm"
        active={mode === 'order'}
        onClick={() => handleToggleMode('order')}
        disabled={isDisabled}
      >
        <i className="fa fa-reorder me-1" />
        Order mode
      </ButtonGroupToggleButton>
    </ButtonGroup>
  )
};

const headerBtnGroup = (
  deleted, container, sample, handleRemove, handleSubmit,
  toggleAddToReport, isDisabled, readOnly, handleUndo,
  publish, isReviewer
) => {

  const inReport = container.extended_metadata.report;
  const confirmDelete = (e) => {
    e.stopPropagation();
    if (confirm('Delete the analysis?')) {
      handleRemove(container);
    }
  };
  const onToggleAddToReport = (e) => {
    e.stopPropagation();
    toggleAddToReport(container);
  };

  // spcInfos = [ { value, label, title, idSp, idAe, idx, ... }, ...]
  const spcInfos = BuildSpcInfos(sample, container);
  const toggleSpectraModal = (e) => {
    e.stopPropagation();
    SpectraActions.ToggleModal();
    SpectraActions.LoadSpectra.defer(spcInfos); // going to fetch files base on spcInfos
  };

  //process open NMRium
  const toggleNMRDisplayerModal = (e) => {
    const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(sample, container);
    e.stopPropagation();
    SpectraActions.ToggleModalNMRDisplayer();
    SpectraActions.LoadSpectraForNMRDisplayer.defer(spcInfosForNMRDisplayer); // going to fetch files base on spcInfos
  }

  const jcampIds = JcampIds(container);
  const hasJcamp = jcampIds.orig.length > 0;
  const confirmRegenerate = (e) => {
    e.stopPropagation();
    if (confirm('Regenerate spectra?')) {
      LoadingActions.start();
      SpectraActions.Regenerate(jcampIds, handleSubmit);
    }
  };

  const hasEditedJcamp = jcampIds.edited.length > 0;
  const confirmRegenerateEdited = (e) => {
    e.stopPropagation();
    if (confirm('Regenerate edited spectra?\nWARNING: This process will override the simulated signals')) {
      LoadingActions.start();
      SpectraActions.RegenerateEdited(jcampIds, sample.molfile, () => {
        LoadingActions.stop();
      });
    }
  }

  const { hasChemSpectra, hasNmriumWrapper } = UIStore.getState();
  const { chmos } = UserStore.getState();
  const hasNMRium = isNMRKind(container, chmos) && hasNmriumWrapper;
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const enableMoleculeViewer = MatrixCheck(currentUser.matrix, MolViewerSet.PK);

  // Chemotion Repository
  const xm = container && container.extended_metadata;
  const typeMissing = !xm.kind || ((xm.kind || '').split('|').length < 2);
  const statusMissing = (xm.status || '') !== 'Confirmed';
  const nmrMissing = !isNmrPass(container, sample);
  const datasetMissing = !isDatasetPass(container);


  // Chemotion Repository
  const btnTip = () => {
    const tip = [];
    if (typeMissing || statusMissing || nmrMissing || datasetMissing) {
      if (typeMissing) tip.push('Type is invalid.');
      if (statusMissing) tip.push('Status must be Confirmed.');
      if (nmrMissing) tip.push('Content is invalid, NMR Check fails.');
      if (datasetMissing) {
        tip.push('Dataset is incomplete. Please check that: ');
        tip.push('1. for NMR, Mass, or IR analyses, at least one dataset has been attached with an image and a jcamp files.');
        tip.push('2. the instrument field is not empty.');
      }
      return tip.join('\r\n');
    }
    return 'publish this analysis';
  };

  // Chemotion Repository
  // Validation flags for publication
  // const typeMissing = !xm.kind;
  // const statusMissing = !xm.status;
  // const nmrMissing = isNMRKind(container, chmos) && !container.children?.some((c) => c.container_type === 'dataset');
  // const datasetMissing = !container.children?.some((c) => c.container_type === 'dataset');
  let addToLabelBtn;
  if (publish) {
    if (xm.public_analysis) {
      addToLabelBtn = null;
    } else {
      const isPublishChecked = xm && (xm.publish && (xm.publish === true || xm.publish === 'true'))
        && !xm.public_analysis && xm.kind && !statusMissing && !nmrMissing && !datasetMissing;
      const isDisabledForPublication = !!xm.public_analysis || typeMissing
        || statusMissing || nmrMissing || datasetMissing;

      addToLabelBtn = (
        <OverlayTrigger
          placement="left"
          overlay={<Tooltip id="checkAnalysis" className="publish_tooltip">{btnTip()}</Tooltip>}
        >
          <div>
            <Form.Check
              type="checkbox"
              onClick={onToggleAddToReport}
              defaultChecked={isPublishChecked}
              disabled={isDisabledForPublication}
              label={
                isDisabledForPublication
                  ? <span style={{ color: 'red' }}>Add to publication1</span>
                  : <span>Add to publication</span>
              }
            />
          </div>
        </OverlayTrigger>
      );
    }
  } else {
    addToLabelBtn = (
      <Form.Check
        id={`add-sample-${sample.id}-to-report`}
        type="checkbox"
        onClick={onToggleAddToReport}
        defaultChecked={inReport}
        label="Add to Report"
        className="mx-2"
      />
    );
  }

  return deleted ? (
    <Button
      size="xxsm"
      variant="danger"
      onClick={() => { handleUndo(container); }}
    >
      <i className="fa fa-undo" />
    </Button>
  ) : (
    <div
      className="d-flex gap-1 align-items-center"
      onClick={(e) => e.stopPropagation()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
    >
      {addToLabelBtn}
      <MolViewerListBtn el={sample} container={container} isPublic={false} disabled={!enableMoleculeViewer} />
      <SpectraEditorButton
        element={sample}
        hasJcamp={hasJcamp}
        spcInfos={spcInfos}
        hasChemSpectra={hasChemSpectra}
        hasEditedJcamp={hasEditedJcamp}
        toggleSpectraModal={toggleSpectraModal}
        confirmRegenerate={confirmRegenerate}
        confirmRegenerateEdited={confirmRegenerateEdited}
        toggleNMRDisplayerModal={toggleNMRDisplayerModal}
        hasNMRium={hasNMRium}
      />
      <PrintCodeButton
        element={sample}
        analyses={[container]}
        ident={container.id}
      />
      <Button
        size="xxsm"
        variant="danger"
        disabled={readOnly || isDisabled}
        onClick={confirmDelete}
      >
        <i className="fa fa-trash" />
      </Button>
    </div>
  );
};

const AnalysesHeader = ({
  sample, container, mode, readOnly, isDisabled, handleRemove, handleUndo, handleSubmit, toggleAddToReport,
  publish, isReviewer,
}) => {

  let kind = container.extended_metadata.kind || '';
  kind = (kind.split('|')[1] || kind).trim();
  const deleted = container.is_deleted;
  const insText = instrumentText(container);
  const status = container.extended_metadata.status || '';
  const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
  const contentOneLine = {
    ops: content.ops.map((x) => {
      const c = Object.assign({}, x);
      if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
      return c;
    }),
  };
   const attachment = getAttachmentFromContainer(container);


   // Chemotion Repository
  const nmrMissing = !isNmrPass(container, sample);
  let statusChk = (status !== 'Confirmed' || nmrMissing);
  if (sample.can_publish === false && sample.can_update === false) {
    statusChk = false;
  }

  return (
    <div className={`analysis-header w-100 d-flex gap-3 lh-base ${mode === 'edit' ? '' : 'order pe-2'}`}>
      <div className="preview border d-flex align-items-center">
        {deleted ?
          <i className="fa fa-ban text-body-tertiary fs-2 text-center d-block" /> :
          <ImageModal
            attachment={attachment}
            popObject={{
              title: container.name,
            }}
          />
    }
      </div>
      <div className={"flex-grow-1" + (deleted ? "" : " analysis-header-fade")}>
        <div className="d-flex justify-content-between align-items-center">
          <h4 className={"flex-grow-1" + (deleted ? " text-decoration-line-through" : "")}>{container.name}</h4>
          {(mode === 'edit') &&
            headerBtnGroup(
              deleted, container, sample, handleRemove, handleSubmit,
              toggleAddToReport, isDisabled, readOnly, handleUndo,
              publish, isReviewer
            )
          }
        </div>
        <div className={deleted ? "text-body-tertiary" : ""} style={kind === '' ? { color: 'red' } : null}>
          Type: {kind}
        </div>
        <div className={deleted ? "text-body-tertiary" : ""} style={statusChk ? { color: 'red' } : null}>
          Status:<span className='me-4'>{status} {qCheckMsg(sample, container)}</span>{insText}
        </div>
        {!deleted &&
          <div className="d-flex gap-2">
            <span>Content:</span>
            <div className="flex-grow-1">
              <QuillViewer value={contentOneLine} className="p-0"/>
            </div>
          </div>
        }
      </div>
    </div>
  );
};

export { AnalysesHeader, AnalysisModeToggle };
