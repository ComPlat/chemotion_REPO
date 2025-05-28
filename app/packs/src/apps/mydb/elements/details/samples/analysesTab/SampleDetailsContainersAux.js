import React from 'react';
import PropTypes from 'prop-types';
import { Button, Checkbox, OverlayTrigger, Tooltip, ButtonGroup, SplitButton, MenuItem } from 'react-bootstrap';
import QuillViewer from 'src/components/QuillViewer';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import { stopBubble } from 'src/utilities/DomHelper';
import ImageModal from 'src/components/common/ImageModal';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { BuildSpcInfos, JcampIds, BuildSpcInfosForNMRDisplayer, isNMRKind } from 'src/utilities/SpectraHelper';
import { hNmrCheckMsg, cNmrCheckMsg, msCheckMsg, instrumentText } from 'src/utilities/ElementUtils';
import { contentToText } from 'src/utilities/quillFormat';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { chmoConversions } from 'src/components/OlsComponent';
import { previewContainerImage } from 'src/utilities/imageHelper';
import MolViewerListBtn from 'src/components/viewer/MolViewerListBtn';
import MolViewerSet from 'src/components/viewer/MolViewerSet';
import { isNmrPass, isDatasetPass } from 'src/repoHome/RepoCommon';
import MatrixCheck from 'src/components/common/MatrixCheck';
import SpectraEditorButton from 'src/components/common/SpectraEditorButton';

const qCheckPass = () => (
  <div style={{ display: 'inline', color: 'green' }}>
    &nbsp;
    <i className="fa fa-check" />
  </div>
);

const qCheckFail = (msg, kind, atomNum = '') => (
  <div style={{ display: 'inline', color: 'red' }}>
    &nbsp;
    (<sup>{atomNum}</sup>{kind} {msg})
  </div>
);

const qCheckMsg = (sample, container) => {
  if (sample.can_publish === false && sample.can_update === false) { return ''; }
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

const SpectraEditorBtn = ({
  sample, spcInfos, hasJcamp, hasChemSpectra,
  toggleSpectraModal, confirmRegenerate, confirmRegenerateEdited, hasEditedJcamp,
  toggleNMRDisplayerModal, hasNMRium, isReviewer
}) => (
  <span>
    <OverlayTrigger
    placement="bottom"
    delayShow={500}
    overlay={<Tooltip id="spectra">Spectra Editor {spcInfos.length > 0 ? '' : ': Reprocess'}</Tooltip>}
  >{spcInfos.length > 0 ? (
    <ButtonGroup className="button-right">
      <SplitButton
        id="spectra-editor-split-button"
        pullRight
        bsStyle="info"
        bsSize="xsmall"
        title={<i className="fa fa-area-chart" />}
        onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
        onClick={toggleSpectraModal}
        disabled={!(spcInfos.length > 0) || !hasChemSpectra}
      >
        <MenuItem
          id="regenerate-spectra"
          key="regenerate-spectra"
          onSelect={(eventKey, event) => {
            event.stopPropagation();
            confirmRegenerate(event);
          }}
          disabled={!hasJcamp || !sample.can_update}
        >
          <i className="fa fa-refresh" /> Reprocess
        </MenuItem>
        {
          hasEditedJcamp && isReviewer ?
            (<MenuItem
              id="regenerate-edited-spectra"
              key="regenerate-edited-spectra"
              onSelect={(eventKey, event) => {
                event.stopPropagation();
                confirmRegenerateEdited(event);
              }}
            >
              <i className="fa fa-refresh" /> Regenerate .edit.jdx files
            </MenuItem>) : <span></span>
        }
      </SplitButton>
    </ButtonGroup>
  ) : (
    <Button
      bsStyle="warning"
      bsSize="xsmall"
      className="button-right"
      onClick={confirmRegenerate}
      disabled={!hasJcamp || !sample.can_update || !hasChemSpectra}
    >
      <i className="fa fa-area-chart" /><i className="fa fa-refresh " />
    </Button>
  )}
  </OverlayTrigger>

  {
        hasNMRium ? (
            <OverlayTrigger
            placement="top"
            delayShow={500}
            overlay={<Tooltip id="spectra_nmrium_wrapper">Process with NMRium</Tooltip>}
            >
                <ButtonGroup className="button-right">
                    <Button
                    id="spectra-editor-split-button"
                    pullRight
                    bsStyle="info"
                    bsSize="xsmall"
                    onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
                    onClick={toggleNMRDisplayerModal}
                    disabled={!hasJcamp || !sample.can_update}
                    >
                    <i className="fa fa-bar-chart"/>
                    </Button>
                </ButtonGroup>
            </OverlayTrigger>
        ) : null
    }
  </span>
);

SpectraEditorBtn.propTypes = {
  sample: PropTypes.object,
  hasJcamp: PropTypes.bool,
  spcInfos: PropTypes.array,
  hasChemSpectra: PropTypes.bool,
  toggleSpectraModal: PropTypes.func.isRequired,
  confirmRegenerate: PropTypes.func.isRequired,
  confirmRegenerateEdited: PropTypes.func.isRequired,
  hasEditedJcamp: PropTypes.bool,
  toggleNMRDisplayerModal: PropTypes.func.isRequired,
  hasNMRium: PropTypes.bool,
};

SpectraEditorBtn.defaultProps = {
  hasJcamp: false,
  spcInfos: [],
  sample: {},
  hasChemSpectra: false,
  hasEditedJcamp: false,
  hasNMRium: false,
};

const editModeBtn = (toggleMode, isDisabled) => (
  <Button
    bsSize="xsmall"
    bsStyle="primary"
    onClick={toggleMode}
    disabled={isDisabled}
  >
    <span>
      <i className="fa fa-edit" />&nbsp;
      Edit mode
    </span>
  </Button>
);

const orderModeBtn = (toggleMode, isDisabled) => (
  <Button
    bsSize="xsmall"
    bsStyle="success"
    onClick={toggleMode}
    disabled={isDisabled}
  >
    <span>
      <i className="fa fa-reorder" />&nbsp;
      Order mode
    </span>
  </Button>
);

const AnalysisModeBtn = (mode, toggleMode, isDisabled) => {
  switch (mode) {
    case 'order':
      return orderModeBtn(toggleMode, isDisabled);
    default:
      return editModeBtn(toggleMode, isDisabled);
  }
};

const undoBtn = (container, mode, handleUndo) => {
  const clickUndo = () => handleUndo(container);

  if (mode === 'edit') {
    return (
      <Button
        className="pull-right"
        bsSize="xsmall"
        bsStyle="danger"
        onClick={clickUndo}
      >
        <i className="fa fa-undo" />
      </Button>
    );
  }
  return null;
};

const HeaderDeleted = ({ container, handleUndo, mode }) => {
  const mKind = container.extended_metadata.kind;
  const mStatus = container.extended_metadata.status;
  const kind = (mKind && mKind !== '') ? ` - Type: ${(mKind.split('|')[1] || mKind).trim()}` : '';
  const status = (mStatus && mStatus !== '') ? ` - Status: ${mStatus}` : '';

  return (
    <div className="analysis-header-delete">
      <strike>
        {container.name}
        {kind}
        {status}
      </strike>
      <div className="button-right undo-middle">
        {undoBtn(container, mode, handleUndo)}
      </div>
    </div>
  );
};

const headerBtnGroup = (
  container, sample, mode, handleRemove, handleSubmit,
  toggleAddToReport, isDisabled, readOnly,
  publish, isReviewer
) => {
  if (mode !== 'edit') {
    return null;
  }

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

  const xm = container && container.extended_metadata;
  const typeMissing = !xm.kind || ((xm.kind || '').split('|').length < 2);
  const statusMissing = (xm.status || '') !== 'Confirmed';
  const nmrMissing = !isNmrPass(container, sample);
  const datasetMissing = !isDatasetPass(container);
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

  const addToLabelBtn = publish ? (
   (xm.public_analysis ? null :
     <OverlayTrigger
       placement="left"
       overlay={<Tooltip id="checkAnalysis" className="publish_tooltip">{btnTip()}</Tooltip>}
     >
       <div>
      <Checkbox
        onClick={onToggleAddToReport}
        // TODO: use null and true because the Boolean value is coerced into string: check why
            defaultChecked={(xm && (xm.publish && (xm.publish === true || xm.publish === 'true')) && !xm.public_analysis && xm.kind && !statusMissing && !nmrMissing && !datasetMissing) ? true : false}
        disabled={!!xm.public_analysis || typeMissing || statusMissing || nmrMissing || datasetMissing}
      >
        {
              (!!xm.public_analysis || typeMissing || statusMissing || nmrMissing || datasetMissing) ?
                <span style={{ color: 'red' }}>Add to publication</span>
                :
                <span>Add to publication</span>
        }
      </Checkbox>
      </div>
    </OverlayTrigger>
  )) : (
    <Checkbox
      onClick={onToggleAddToReport}
      defaultChecked={inReport}
      disabled={!sample.can_update}
    >
      <span>Add to Report</span>
    </Checkbox>
  );

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

  const { hasChemSpectra, hasNmriumWrapper, repoVersioning } = UIStore.getState();
  const { chmos } = UserStore.getState();
  const hasNMRium = isNMRKind(container, chmos) && hasNmriumWrapper;
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  const enableMoleculeViewer = MatrixCheck(currentUser.matrix, MolViewerSet.PK);

  return (
    <div className="upper-btn">
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        className="button-right"
        disabled={readOnly || isDisabled}
        onClick={confirmDelete}
      >
        <i className="fa fa-trash" />
      </Button>
      {
        container.link_id &&
        <NewVersionModal
          type="Analysis"
          element={container}
          repoVersioning={repoVersioning}
          parent={sample}
          bsSize="xsmall"
          className="button-right"
        />
      }
      <PrintCodeButton
        element={sample}
        analyses={[container]}
        ident={container.id}
      />
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
        isReviewer={isReviewer}
      />
      <span className="button-right">
        <MolViewerListBtn el={sample} container={container} isPublic={false} disabled={!enableMoleculeViewer} />
      </span>
      <span
        className="button-right add-to-report"
        onClick={stopBubble}
      >
        {addToLabelBtn}
      </span>
    </div>
  );
};

const HeaderNormal = ({
  sample, container, mode, readOnly, isDisabled, serial,
  handleRemove, handleSubmit, handleAccordionOpen, toggleAddToReport,
  publish,isReviewer
}) => {
  const clickToOpen = () => handleAccordionOpen(serial);

  let kind = container.extended_metadata.kind || '';
  kind = (kind.split('|')[1] || kind).trim();
  let insText = '';
  if (typeof publish === 'undefined' || publish === null || publish === false) {
    insText = instrumentText(container);
  }
  const status = container.extended_metadata.status || '';
  const previewImg = previewContainerImage(container);
  const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
  const contentOneLine = {
    ops: content.ops.map((x) => {
      const c = Object.assign({}, x);
      if (c.insert && typeof c.insert === 'string') c.insert = c.insert.replace(/\n/g, ' ');
      return c;
    }),
  };
  let hasPop = true;
  let fetchNeeded = false;
  let fetchId = 0;
  if (previewImg.startsWith('data:image')) {
    fetchNeeded = true;
    fetchId = container.preview_img.id;
  } else {
    hasPop = false;
  }
  const nmrMissing = !isNmrPass(container, sample);

  let statusChk = (status !== 'Confirmed' || nmrMissing);
  if (sample.can_publish === false && sample.can_update === false) {
    statusChk = false;
  }

  return (
    <div
      className={`analysis-header ${mode === 'edit' ? '' : 'order'}`}
      onClick={clickToOpen}
    >
      <div className="preview">
        <ImageModal
          hasPop={hasPop}
          previewObject={{
            src: previewImg
          }}
          popObject={{
            title: container.name,
            src: previewImg,
            fetchNeeded,
            fetchId
          }}
        />
      </div>
      <div className="abstract">
        {
          headerBtnGroup(
            container, sample, mode, handleRemove, handleSubmit,
            toggleAddToReport, isDisabled, readOnly,
            publish, isReviewer
          )
        }
        <div className="lower-text">
          <div className="main-title">
            {container.name}
          </div>
          <div className="sub-title" style={kind === '' ? { color: 'red' } : null}>
            Type: {kind}
          </div>
          <div className="sub-title">
            <span style={statusChk ? { color: 'red' } : null}>Status:</span> {status} {qCheckMsg(sample, container)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {insText}
          </div>
          <div className="desc sub-title">
            <span style={{ float: 'left', marginRight: '5px' }}>
              Content:
            </span>
            <QuillViewer value={contentOneLine} />
          </div>
        </div>
      </div>
    </div>
  );
};

export { HeaderDeleted, HeaderNormal, AnalysisModeBtn };
