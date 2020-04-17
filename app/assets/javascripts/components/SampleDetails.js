import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonToolbar,
  InputGroup, FormGroup, FormControl,
  Panel, ListGroup, ListGroupItem, Glyphicon, Tabs, Tab, Row, Col,
  Tooltip, OverlayTrigger, DropdownButton, MenuItem,
  ControlLabel, Modal, Alert
} from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import Clipboard from 'clipboard';
import Barcode from 'react-barcode';
import Select from 'react-select';
import _ from 'lodash';
import uuid from 'uuid';
import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';
import DetailActions from './actions/DetailActions';
import LoadingActions from './actions/LoadingActions';
import RepositoryActions from './actions/RepositoryActions';

import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';
import UIActions from './actions/UIActions';
import QcActions from './actions/QcActions';
import QcStore from './stores/QcStore';

import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import PubchemLabels from './PubchemLabels';
import ElementReactionLabels from './ElementReactionLabels';
import SampleDetailsContainers from './SampleDetailsContainers';

import XLabels from './extra/SampleDetailsXLabels';
import XTabs from './extra/SampleDetailsXTabs';

import StructureEditorModal from './structure_editor/StructureEditorModal';
import PublishSampleModal from './PublishSampleModal';

import Sample from './models/Sample';
import Container from './models/Container'
import PolymerSection from './PolymerSection';
import ElementalCompositionGroup from './ElementalCompositionGroup';
import ToggleSection from './common/ToggleSection'
import SampleName from './common/SampleName'
import ClipboardCopyText from './common/ClipboardCopyText';
import SampleForm from './SampleForm'
import ComputedPropsContainer from './computed_props/ComputedPropsContainer';
import ComputedPropLabel from './computed_props/ComputedPropLabel';
import Utils from './utils/Functions';
import PrintCodeButton from './common/PrintCodeButton'
import SampleDetailsLiteratures from './DetailsTabLiteratures';
import MoleculesFetcher from './fetchers/MoleculesFetcher';
import PubchemLcss from './PubchemLcss';
import QcMain from './qc/QcMain';
import { chmoConversions } from './OlsComponent';
import ConfirmClose from './common/ConfirmClose';
import {
  PublishedTag,
  LabelPublication,
  PublishBtn,
  ReviewPublishBtn,
  validateMolecule,
} from './PublishCommon';
import SampleDetailsRepoComment from './SampleDetailsRepoComment';

const MWPrecision = 6;

export default class SampleDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sample: props.sample,
      reaction: null,
      materialGroup: null,
      showStructureEditor: false,
      loadingMolecule: false,
      showElementalComposition: false,
      activeTab: UIStore.getState().sample.activeTab,
      qrCodeSVG: "",
      isCasLoading: false,
      showMolfileModal: false,
      smileReadonly: !props.sample.isNew,
      quickCreator: false,
      showInchikey: false,
      pageMessage: null,
      showPublishSampleModal: false,
      commentScreen: false
    };

    const data = (UserStore.getState().profile || {}).data || {};
    this.enableComputedProps = _.get(data, 'computed_props.enable', false);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.clipboard = new Clipboard('.clipboardBtn');
    this.addManualCas = this.addManualCas.bind(this);
    this.handleMolfileShow = this.handleMolfileShow.bind(this);
    this.handleMolfileClose = this.handleMolfileClose.bind(this);
    this.handleSampleChanged = this.handleSampleChanged.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleSelect = this.handleSelect.bind(this);
    this.toggleInchi = this.toggleInchi.bind(this);
    this.fetchQcWhenNeeded = this.fetchQcWhenNeeded.bind(this);
    this.showPublishSampleModal = this.showPublishSampleModal.bind(this);
    this.forcePublishRefreshClose = this.forcePublishRefreshClose.bind(this);
    this.handleCommentScreen = this.handleCommentScreen.bind(this);
    this.handleFullScreen = this.handleFullScreen.bind(this);
    this.handleValidation = this.handleValidation.bind(this);
    this.handleResetValidation = this.handleResetValidation.bind(this);
    this.handleAssociateClick = this.handleAssociateClick.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.sample.isNew && (typeof (nextProps.sample.molfile) === 'undefined' || nextProps.sample.molfile.length === 0)) {
      this.setState({
        smileReadonly: false,
      });
    } else {
      this.setState({
        smileReadonly: true,
      });
    }
    this.setState({
      sample: nextProps.sample,
      loadingMolecule: false,
      isCasLoading: false,
    });
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
    const { activeTab } = this.state;
    this.fetchQcWhenNeeded(activeTab);
  }

  componentWillUnmount() {
    this.clipboard.destroy();
    UIStore.unlisten(this.onUIStoreChange);
  }

  onUIStoreChange(state) {
    if (state.sample.activeTab != this.state.activeTab){
      this.setState((previousState)=>{ return {
        ...previousState, activeTab: state.sample.activeTab
      }})
    }
  }

  forcePublishRefreshClose(sample, show) {
    this.setState({ sample, showPublishSampleModal: show });
    this.forceUpdate();
  }

  handleAssociateClick() {
    const { sample } = this.state;
    ElementActions.tryFetchReactionById(sample.tag.taggable_data.reaction_id);
    sample.validates = [];
    this.setState({ sample });
  }

  handleValidation(element) {
    let validates = [];
    const sample = element;
    if (sample.tag && sample.tag.taggable_data && sample.tag.taggable_data.reaction_id) {
      validates.push({ name: `sample [${sample.name}]`, value: false, message: `${sample.name} is associated with a Reaction.` });
    } else {
      const analyses = sample.analysisArray();
      if (analyses.length < 1) {
        validates.push({ name: `sample [${sample.name}]`, value: false, message: 'Analyses data is missing.' });
      } else {
        const validatePt = validateMolecule(sample);
        if (validatePt.length > 0) {
          validates = validates.concat(validatePt);
        }
      }
    }
    if (validates.length > 0) {
      sample.validates = validates;
      this.setState({ sample });
    } else {
      LoadingActions.start();
      RepositoryActions.reviewPublish(element);
    }
  }

  handleResetValidation() {
    const { sample } = this.state;
    sample.validates = [];
    this.setState({ sample });
  }

  handleCommentScreen() {
    this.setState({ commentScreen: true });
    this.props.toggleCommentScreen(true);
  }

  handleFullScreen() {
    this.setState({ commentScreen: false });
    this.props.toggleFullScreen();
  }

  handleMolfileShow() {
    this.setState({
      showMolfileModal: true
    });
  }

  handleMolfileClose() {
    this.setState({
      showMolfileModal: false
    });
  }

  handleSampleChanged(sample, cb) {
    this.setState({
      sample,
    }, cb);
  }

  handleAmountChanged(amount) {
    const sample = this.state.sample;
    sample.setAmountAndNormalizeToGram(amount);
    this.setState({ sample });
  }

  handleImportedReadoutChanged(e) {
    let sample = this.state.sample;
    sample.imported_readout = e.target.value
    this.setState({
      sample: sample
    });
  }

  showStructureEditor() {
    this.setState({
      showStructureEditor: true
    })
  }

  hideStructureEditor() {
    this.setState({
      showStructureEditor: false
    })
  }

  toggleInchi() {
    const { showInchikey } = this.state
    this.setState({ showInchikey: !showInchikey })
  }

  handleMoleculeBySmile() {
    const smi = this.smilesInput.value;
    const { sample } = this.state;

    MoleculesFetcher.fetchBySmi(smi)
      .then((result) => {
        if (!result || result == null) {
          alert('Can not create molecule with this smiles!');
        } else {
          sample.molfile = result.molfile;
          sample.molecule_id = result.id;
          sample.molecule = result;
          this.molfileInput.value = result.molfile;
          this.inchistringInput.value = result.inchistring;
          this.setState({
            quickCreator: true,
            sample,
            smileReadonly: true,
            pageMessage: result.ob_log
          });
          ElementActions.refreshElements('sample');
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleStructureEditorSave(molfile, svg_file = null, config = null) {
    const { sample } = this.state;
    sample.molfile = molfile;
    const smiles = (config && sample.molecule) ? config.smiles : null;
    sample.contains_residues = molfile.indexOf(' R# ') > -1;
    sample.formulaChanged = true;
    // this.updateMolecule(molfile, svg_file, smiles);
    if (!smiles || smiles === '') {
      this.setState({ loadingMolecule: true });
      MoleculesFetcher.fetchByMolfile(molfile, svg_file)
        .then((result) => {
          sample.molecule = result;
          sample.molecule_id = result.id;
          this.setState({
            sample,
            smileReadonly: true,
            loadingMolecule: false,
            pageMessage: result.ob_log
          });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    } else {
      this.setState({ loadingMolecule: true });
      MoleculesFetcher.fetchBySmi(smiles, svg_file, molfile)
        .then((result) => {
          sample.molecule = result;
          sample.molecule_id = result.id;
          this.setState({
            sample,
            smileReadonly: true,
            loadingMolecule: false,
            pageMessage: result.ob_log
          });
        });
    }
    this.hideStructureEditor();
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor();
  }

  handleSubmit(closeView = false) {
    LoadingActions.start();
    const { sample } = this.state;
    if (sample.belongTo && sample.belongTo.type === 'reaction') {
      const reaction = sample.belongTo;
      reaction.editedSample = sample;
      const materialGroup = sample.matGroup;
      if (sample.isNew) {
        ElementActions.createSampleForReaction(sample, reaction, materialGroup);
      } else {
        ElementActions.updateSampleForReaction(sample, reaction, closeView);
      }
    } else if (sample.belongTo && sample.belongTo.type === 'wellplate') {
      const wellplate = sample.belongTo;
      ElementActions.updateSampleForWellplate(sample, wellplate)
    } else {
      if (sample.isNew) {
        ElementActions.createSample(sample, closeView)
      } else {
        ElementActions.updateSample(new Sample(sample), closeView)
      }
    }
    if (sample.is_new || closeView) {
      DetailActions.close(sample, true);
    }
    sample.updateChecksum();
  }

  showPublishSampleModal(show) {
    this.setState({showPublishSampleModal: show});
    this.forceUpdate();
  }

  svgOrLoading(sample) {
    let svgPath = "";
    if (this.state.loadingMolecule) {
      svgPath = "/images/wild_card/loading-bubbles.svg";
    } else {
      svgPath = sample.svgPath;
    }
    let className = svgPath ? 'svg-container' : 'svg-container-empty'
    return (
      sample.can_update
        ? <div className={className}
               onClick={this.showStructureEditor.bind(this)}>
            <Glyphicon className="pull-right" glyph='pencil'/>
            <SVG key={svgPath} src={svgPath} className="molecule-mid"/>
          </div>
        : <div className={className}>
            <SVG key={svgPath} src={svgPath} className="molecule-mid"/>
          </div>
    );
  }

  sampleAverageMW(sample) {
    let mw = sample.molecule_molecular_weight;
    if(mw)
      return <ClipboardCopyText text={`${mw.toFixed(MWPrecision)} g/mol`} />;
    else
      return '';
  }

  sampleExactMW(sample) {
    let mw = sample.molecule_exact_molecular_weight
    if(mw)
      return <ClipboardCopyText text={`Exact mass: ${mw.toFixed(MWPrecision)} g/mol`} />;
    else
      return '';
  }

  initiateAnalysisButton(sample) {
    return (
      <div style={{display: "inline-block", marginLeft: "100px"}}>
        <DropdownButton id="InitiateAnalysis" bsStyle="info" bsSize="xsmall" title="Initiate Analysis">
          <MenuItem eventKey="1" onClick={() => this.initiateAnalysisWithKind(sample, chmoConversions.nmr_1h.termId)}>{chmoConversions.nmr_1h.label}</MenuItem>
          <MenuItem eventKey="2" onClick={() => this.initiateAnalysisWithKind(sample, chmoConversions.nmr_13c.termId)}>{chmoConversions.nmr_13c.label}</MenuItem>
          <MenuItem eventKey="3" onClick={() => this.initiateAnalysisWithKind(sample, "Others")}>others</MenuItem>
          <MenuItem eventKey="4" onClick={() => this.initiateAnalysisWithKind(sample, "Others2x")}>others 2x</MenuItem>
          <MenuItem eventKey="5" onClick={() => this.initiateAnalysisWithKind(sample, "Others3x")}>others 3x</MenuItem>
        </DropdownButton>
      </div>
    )
  }

  initiateAnalysisWithKind(sample, kind) {
    let analysis = '';
    let a1 = Container.buildAnalysis(chmoConversions.others.value),
        a2 = Container.buildAnalysis(chmoConversions.others.value),
        a3 = Container.buildAnalysis(chmoConversions.others.value);
    switch(kind) {
      case chmoConversions.nmr_1h.termId:
        analysis = Container.buildAnalysis(chmoConversions.nmr_1h.value);
        sample.addAnalysis(analysis);
        ElementActions.updateSample(sample);
        Utils.downloadFile({contents: "/api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + analysis.id + "&type=nmr_analysis&size=small"})
        break;
      case chmoConversions.nmr_13c.termId:
        analysis = Container.buildAnalysis(chmoConversions.nmr_13c.value);
        sample.addAnalysis(analysis);
        ElementActions.updateSample(sample);
        Utils.downloadFile({ contents: "/api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + analysis.id + "&type=nmr_analysis&size=small" })
        break;
      case "Others":
        sample.addAnalysis(a1);
        ElementActions.updateSample(sample);
        Utils.downloadFile({contents: "/api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + a1.id + "&type=analysis&size=small"})
        break;
      case "Others2x":
        sample.addAnalysis(a1);
        sample.addAnalysis(a2);
        ElementActions.updateSample(sample);
        Utils.downloadFile({contents: "/api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + a1.id + "&analyses_ids[]=" + a2.id  + "&type=analysis&size=small"})
        break;
      case "Others3x":
        sample.addAnalysis(a1);
        sample.addAnalysis(a2);
        sample.addAnalysis(a3);
        ElementActions.updateSample(sample);
        Utils.downloadFile({contents: "/api/v1/code_logs/print_analyses_codes?sample_id=" + sample.id + "&analyses_ids[]=" + a1.id + "&analyses_ids[]=" + a2.id + "&analyses_ids[]=" + a3.id + "&type=analysis&size=small"})
        break;
    }
  }

  sampleHeader(sample) {
    let saveBtnDisplay = sample.isEdited ? '' : 'none'
    const titleTooltip = `Created at: ${sample.created_at} \n Updated at: ${sample.updated_at}`;
    
    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="sampleDates">{titleTooltip}</Tooltip>}>
          <span><i className="icon-sample" />{sample.title()}</span>
        </OverlayTrigger>
        <ConfirmClose el={sample} />
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveCloseSample">Save and Close Sample</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
            onClick={() => this.handleSubmit(true)}
            style={{display: saveBtnDisplay}}
            disabled={!this.sampleIsValid() || !sample.can_update} >
            <i className="fa fa-floppy-o" />
            <i className="fa fa-times"  />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveSample">Save Sample</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
            onClick={() => this.handleSubmit()}
            style={{display: saveBtnDisplay}}
            disabled={!this.sampleIsValid() || !sample.can_update} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right"
            onClick={this.handleFullScreen}>
            <i className="fa fa-expand"></i>
          </Button>
        </OverlayTrigger>

        <PublishBtn sample={sample} showModal={this.showPublishSampleModal} />
        <ReviewPublishBtn element={sample} showComment={this.handleCommentScreen} validation={this.handleValidation} />
        <div style={{display: "inline-block", marginLeft: "10px"}}>
          <ElementReactionLabels element={sample} key={sample.id + "_reactions"}/>
          <ElementCollectionLabels element={sample} key={sample.id} placement="right"/>
          <ElementAnalysesLabels element={sample} key={sample.id+"_analyses"}/>
          <PubchemLabels element={sample} />
          <PublishedTag element={sample} />
          <LabelPublication element={sample} />
          {this.extraLabels().map((Lab,i)=><Lab key={i} element={sample}/>)}
        </div>

      </div>
    )
  }

  transferToDeviceButton(sample) {
    return (
      <Button bsSize="xsmall"
        onClick={() => {
          const {selectedDeviceId, devices} = ElementStore.getState().elements.devices
          const device = devices.find((d) => d.id === selectedDeviceId)
          ElementActions.addSampleToDevice(sample, device, {save: true})
        }}
        style={{marginLeft: 25}}
      >
        Transfer to Device
      </Button>
    )
  }

  sampleInfo(sample) {
    const style = { height: '200px' };
    const pubchemLcss = sample.pubchem_tag && sample.pubchem_tag.pubchem_lcss ?
      sample.pubchem_tag.pubchem_lcss.Record.Section[0].Section[0].Section[0].Information : null;
    const pubchemCid = sample.pubchem_tag && sample.pubchem_tag.pubchem_cid ?
      sample.pubchem_tag.pubchem_cid : 0;
    const lcssSign = pubchemLcss ?
      <PubchemLcss cid={pubchemCid} informArray={pubchemLcss} /> : <div />;

    return (
      <Row style={style}>
        <Col md={4}>
          <h4><SampleName sample={sample}/></h4>
          <h5>{this.sampleAverageMW(sample)}</h5>
          <h5>{this.sampleExactMW(sample)}</h5>
          {lcssSign}
        </Col>
        <Col md={8}>
          {this.svgOrLoading(sample)}
        </Col>
      </Row>
    );
  }

  moleculeInchi(sample) {
    if (typeof (this.inchistringInput) !== 'undefined' && this.inchistringInput
        && typeof (sample.molecule_inchistring) !== 'undefined' && sample.molecule_inchistring) {
      this.inchistringInput.value = sample.molecule_inchistring;
    }
    const inchiLabel = this.state.showInchikey ? 'InChIKey' : 'InChI';
    const inchiTooltip = <Tooltip id="inchi_tooltip">toggle InChI/InChIKey</Tooltip>;

    return (
      <InputGroup className='sample-molecule-identifier'>
        <InputGroup.Button>
          <OverlayTrigger placement="top" overlay={inchiTooltip}>
            <Button
              active
              onClick={this.toggleInchi}
            >
              {inchiLabel}
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <FormGroup controlId="inchistringInput">
          <FormControl type="text"
            inputRef={(m) => { this.inchistringInput = m; }}
            key={sample.id}
            value={(this.state.showInchikey ? sample.molecule_inchikey : sample.molecule_inchistring) || ''}
            defaultValue={(this.state.showInchikey ? sample.molecule_inchikey : sample.molecule_inchistring) || ''}
            disabled
            readOnly
          />
        </FormGroup>
        <InputGroup.Button>
          <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
            <Button active className="clipboardBtn" data-clipboard-text={(this.state.showInchikey ? sample.molecule_inchikey : sample.molecule_inchistring) || " "} >
              <i className="fa fa-clipboard"></i>
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
      </InputGroup>
    )
  }

  clipboardTooltip() {
    return(
      <Tooltip id="assign_button">copy to clipboard</Tooltip>
    )
  }

  moleculeCreatorTooltip() {
    return(
      <Tooltip id="assign_button">create molecule</Tooltip>
    )
  }

  moleculeCanoSmiles(sample) {
    if (this.state.smileReadonly && typeof (this.smilesInput) !== 'undefined'
       && this.smilesInput && typeof (sample.molecule_cano_smiles) !== 'undefined'
       && sample.molecule_cano_smiles) {
      this.smilesInput.value = sample.molecule_cano_smiles;
    }
    return (
      <InputGroup className='sample-molecule-identifier'>
        <InputGroup.Addon>Canonical Smiles</InputGroup.Addon>
        <FormGroup controlId="smilesInput">
          <FormControl type="text"
             inputRef={(m) => { this.smilesInput = m; }}
             defaultValue={sample.molecule_cano_smiles || ''}
             disabled={this.state.smileReadonly}
             readOnly={this.state.smileReadonly}
          />
        </FormGroup>
        <InputGroup.Button>
          <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
            <Button active className="clipboardBtn" data-clipboard-text={sample.molecule_cano_smiles || " "} >
              <i className="fa fa-clipboard"></i>
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <InputGroup.Button>
          <OverlayTrigger placement="bottom" overlay={this.moleculeCreatorTooltip()}>
            <Button active className="clipboardBtn"
              disabled={this.state.smileReadonly}
              readOnly={this.state.smileReadonly}
              onClick={() => this.handleMoleculeBySmile()} >
                <i className="fa fa-save"></i>
            </Button>
        </OverlayTrigger>
        </InputGroup.Button>
      </InputGroup>
    )
  }

  moleculeMolfile(sample) {
    if (typeof (this.molfileInput) !== 'undefined' && this.molfileInput
        && typeof (sample.molfile) !== 'undefined' && sample.molfile) {
      this.molfileInput.value = sample.molfile;
    }

  const textAreaStyle = {
    height: '35px',
    overflow: 'auto',
    whiteSpace: 'pre',
  };

    return (
      <InputGroup className='sample-molecule-identifier'>
        <InputGroup.Addon>Molfile</InputGroup.Addon>
        <FormGroup controlId="molfileInput">
          <FormControl componentClass="textarea" style={textAreaStyle}
             inputRef={(m) => { this.molfileInput = m; }}
             defaultValue={sample.molfile || ''}
             disabled={true}
             readOnly={true}
          />
        </FormGroup>
        <InputGroup.Button>
          <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
            <Button active className="clipboardBtn" data-clipboard-text={sample.molfile || " "} >
              <i className="fa fa-clipboard"></i>
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
        <InputGroup.Button>
          <Button active className="clipboardBtn"
            onClick={this.handleMolfileShow} >
              <i className="fa fa-file-text"></i>
          </Button>
        </InputGroup.Button>
      </InputGroup>
    )
  }

  addManualCas(e) {
    DetailActions.updateMoleculeCas(this.props.sample, e.value);
  }

  moleculeCas() {
    const { sample, isCasLoading } = this.state;
    const { molecule, xref } = sample;
    const cas = xref ? xref.cas : "";
    const casLabel = cas && cas.label ? cas.label : "";
    let casArr = [];
    if(molecule && molecule.cas) {
      casArr = molecule.cas.map(c => Object.assign({label: c}, {value: c}));
    }
    const onChange = e => this.updateCas(e);
    const onOpen = e => this.onCasSelectOpen(e, casArr);

    return (
      <InputGroup className='sample-molecule-identifier'>
        <InputGroup.Addon>CAS</InputGroup.Addon>
        <Select.Creatable
          name='cas'
          multi={false}
          options={casArr}
          onChange={onChange}
          onOpen={onOpen}
          onNewOptionClick={this.addManualCas}
          isLoading={isCasLoading}
          value={cas}
          disabled={!sample.can_update}
        />
        <InputGroup.Button>
          <OverlayTrigger placement="bottom"
                          overlay={this.clipboardTooltip()} >
            <Button active className="clipboardBtn"
                    data-clipboard-text={casLabel} >
              <i className="fa fa-clipboard"></i>
            </Button>
          </OverlayTrigger>
        </InputGroup.Button>
      </InputGroup>
    )
  }

  updateCas(e) {
    let sample = this.state.sample;
    sample.xref = { ...sample.xref, cas: e };
    this.setState({sample});
  }

  onCasSelectOpen(e, casArr) {
    if(casArr.length === 0) {
      this.setState({isCasLoading: true})
      DetailActions.getMoleculeCas(this.state.sample)
    }
  }

  handleSectionToggle() {
    this.setState({
      showElementalComposition: !this.state.showElementalComposition
    });
  }

  elementalPropertiesItemHeader(sample) {
    let label
    if(sample.contains_residues) {
      label = 'Polymer section'
      if(!this.state.showElementalComposition)
        label += ' / Elemental composition';
    }
    else
      label = 'Elemental composition';

    return (
      <ListGroupItem onClick={() => this.handleSectionToggle()}>
        <Col className="padding-right elem-composition-header" md={6}>
          <label>{label}</label>
        </Col>
        <div className="col-md-6">
          <ToggleSection show={this.state.showElementalComposition}/>
        </div>
      </ListGroupItem>
    )
  }

  elementalPropertiesItemContent(sample, materialGroup, show) {
    if(!show)
      return false;

    if(sample.contains_residues)
      return (
        <ListGroupItem className="ea-section">
          <PolymerSection sample={sample}
                          parent={this}
                          show={sample.contains_residues}
                          materialGroup={materialGroup}/>
        </ListGroupItem>
      )
    else
      return (
        <ListGroupItem className="ea-section">
          <Row>
            <Col md={6}>
              <ElementalCompositionGroup
                handleSampleChanged={(s) => this.handleSampleChanged(s)}
                sample={sample}/>
            </Col>
          </Row>
        </ListGroupItem>
      )
  }

  elementalPropertiesItem(sample) {
    // avoid empty ListGroupItem
    if(!sample.molecule.sum_formular)
      return false;

    let show = this.state.showElementalComposition;
    let materialGroup = this.state.materialGroup;

    return(
      <div width="100%" className="polymer-section">
        {this.elementalPropertiesItemHeader(sample)}

        {this.elementalPropertiesItemContent(sample, materialGroup, show)}
      </div>
    )

  }

  samplePropertiesTab(ind){
    let sample = this.state.sample || {};

    return(
      <Tab eventKey={ind} title={'Properties'}
        key={'Props' + sample.id.toString()}>
        <ListGroupItem>
          <SampleForm sample={sample}
                      parent={this}/>
        </ListGroupItem>
        {this.elementalPropertiesItem(sample)}
        <ListGroupItem>
          {this.moleculeInchi(sample)}
          {this.moleculeCanoSmiles(sample)}
          {this.moleculeMolfile(sample)}
          {this.moleculeCas()}
        </ListGroupItem>
      </Tab>
    )
  }

  sampleContainerTab(ind) {
    const { sample } = this.state;
    return(
      <Tab eventKey={ind} title={'Analyses'}
        key={'Container' + sample.id.toString()}>
        <ListGroupItem style={{paddingBottom: 20}}>
          <SampleDetailsContainers
            sample={sample}
            setState={(sample) => {this.setState(sample)}}
            handleSampleChanged={this.handleSampleChanged}
            handleSubmit={this.handleSubmit}
            fromSample
          />
        </ListGroupItem>
      </Tab>
    );
  }

  sampleLiteratureTab(ind) {
    const { sample } = this.state;
    if (!sample) { return null; }
    return (
      <Tab
        eventKey={ind}
        title="Literature"
        key={`Literature_${sample.id}`}
      >
        <ListGroupItem style={{ paddingBottom: 20 }} >
          <SampleDetailsLiteratures
            element={sample}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  sampleImportReadoutTab(ind) {
    let sample = this.state.sample || {}
    return (
      <Tab
        eventKey={ind}
        title={'Results'}
        key={'Results' + sample.id.toString()}
      >
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <FormGroup controlId="importedReadoutInput">
            <ControlLabel>Imported Readout</ControlLabel>
            <InputGroup>
              <FormControl
                type="text"
                value={sample.imported_readout || ''}
                disabled
                readOnly
              />
            </InputGroup>
          </FormGroup>
        </ListGroupItem>
      </Tab>
    );
  }

  moleculeComputedProps(ind) {
    const { sample } = this.state;
    const key = "computed_props_" + sample.id.toString();
    if (!this.enableComputedProps) return <span key={key} />;

    const title = (
      <span>
        <ComputedPropLabel cprops={sample.molecule_computed_props} />
        &nbsp; Computed Properties
      </span>
    );

    return (
      <Tab
        eventKey={ind}
        title={title}
        key
      >
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <ComputedPropsContainer sample={sample} />
        </ListGroupItem>
      </Tab>
    );
  }

  fetchQcWhenNeeded(key) {
    if (key !== 'qcMain') return;
    const { infers } = QcStore.getState();
    const { sample } = this.state;
    let isInStore = false;
    infers.forEach((i) => {
      if (i.sId === sample.id) isInStore = true;
    });
    if (isInStore) return;
    QcActions.setLoading.defer();
    QcActions.loadInfers.defer({ sample });
  }

  qualityCheckTab(ind) {
    const { sample } = this.state;
    if (!sample) { return null; }
    return (
      <Tab
        eventKey="qcMain"
        title="QC & curation"
        key={`QC_${sample.id}_${ind}`}
      >
        <ListGroupItem style={{ paddingBottom: 20 }} >
          <QcMain
            sample={sample}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  extraLabels() {
    let labels = [];
    for (let j = 0; j < XLabels.count; j += 1) {
      labels.push(XLabels[`content${j}`]);
    }
    return labels;
  }

  sampleIsValid() {
    const { sample, loadingMolecule, quickCreator } = this.state;
    return (sample.isValid && !loadingMolecule) || sample.is_scoped == true || quickCreator;
  }

  saveBtn(sample, closeView = false) {
    let submitLabel = (sample && sample.isNew) ? "Create" : "Save";
    const isDisabled = !sample.can_update;
    if(closeView) submitLabel += ' and close';

    return (
      <Button bsStyle="warning"
              onClick={() => this.handleSubmit(closeView)}
              disabled={!this.sampleIsValid() || isDisabled}>
              {submitLabel}
      </Button>
    )
  }

  sampleFooter() {
    const {sample} = this.state;
    const belongToReaction = sample.belongTo && sample.belongTo.type === 'reaction';

    let saveAndCloseBtn = belongToReaction && !sample.isNew
                            ?
                              this.saveBtn(sample, true)
                            :
                              null;
    return (
      <ButtonToolbar>
        <Button bsStyle="primary"
                onClick={() => DetailActions.close(sample)}>
          Close
        </Button>
        {this.saveBtn(sample)}
        {saveAndCloseBtn}
      </ButtonToolbar>
    )
  }

  structureEditorModal(sample) {
    const molfile = sample.molfile;
    const hasParent = sample && sample.parent_id;
    const hasChildren = sample && sample.children_count > 0;
    return(
      <StructureEditorModal
        key={sample.id}
        showModal={this.state.showStructureEditor}
        onSave={this.handleStructureEditorSave.bind(this)}
        onCancel={this.handleStructureEditorCancel.bind(this)}
        molfile={molfile}
        hasParent={hasParent}
        hasChildren={hasChildren} />
    )
  }

  handleSelect(eventKey) {
    UIActions.selectTab({ tabKey: eventKey, type: 'sample' });
    this.fetchQcWhenNeeded(eventKey);
  }

  renderMolfileModal() {
    const textAreaStyle = {
      width: '500px',
      height: '640px',
      margin: '30px',
      whiteSpace: 'pre-line',
    };
    if (this.state.showMolfileModal) {
      let molfile = this.molfileInput.value;
      molfile = molfile.replace(/\r?\n/g, '<br />');
      return (
        <Modal
          show={this.state.showMolfileModal}
          dialogClassName="importChemDrawModal"
          onHide={this.handleMolfileClose}
        >

          <Modal.Header closeButton>
            <Modal.Title>Molfile</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div>
              <FormGroup controlId="molfileInputModal">
                <FormControl
                  componentClass="textarea"
                  style={textAreaStyle}
                  readOnly={true}
                  disabled={true}
                  inputRef={(m) => { this.molfileInputModal = m; }}
                  defaultValue={this.molfileInput.value || ''}
                />
              </FormGroup>
            </div>
            <div>
              <Button bsStyle="warning" onClick={this.handleMolfileClose}>
                Close
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      );
    }
    return (<div />);
  }

  render() {
    const sample = this.state.sample || {};
    let {showPublishSampleModal} = this.state
    const tabContents = [
      i => this.samplePropertiesTab(i),
      i => this.sampleContainerTab(i),
      i => this.sampleLiteratureTab(i),
      i => this.sampleImportReadoutTab(i),
      i => this.moleculeComputedProps(i),
      i => this.qualityCheckTab(i),
    ];

    const offset = tabContents.length;
    for (let j = 0; j < XTabs.count; j += 1) {
      if (XTabs[`on${j}`](sample)) {
        const NoName = XTabs[`content${j}`];
        tabContents.push((() => (
          <Tab eventKey={offset + j} key={offset + j} title={XTabs[`title${j}`]} >
            <ListGroupItem style={{ paddingBottom: 20 }} >
              <NoName sample={sample} />
            </ListGroupItem>
          </Tab>
        )));
      }
    }
    const validateObjs = sample.validates && sample.validates.filter(v => v.value === false);
    let validationBlock = null;
    if (validateObjs && validateObjs.length > 0) {
      const validateAssociate = sample.validates && sample.validates.filter(v => v.value === false && v.message.includes('associated'));
      if (validateAssociate && validateAssociate.length > 0) {
        validationBlock = (
          <Alert bsStyle="danger" style={{ marginBottom: 'unset', padding: '5px', marginTop: '10px' }}>
            <strong>Submission Alert</strong>
            <p>
              This sample is associated with a Reaction and can not be published alone.
            </p>
            <Button bsSize="xsmall" onClick={() => this.handleAssociateClick()}>Go to Reaction&nbsp;<i className="icon-reaction" /></Button>
            <span>&nbsp;&nbsp;or&nbsp;&nbsp;</span>
            <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleResetValidation()}>Close Alert</Button>
          </Alert>
        );
      } else {
        validationBlock = (
          <Alert bsStyle="danger" style={{ marginBottom: 'unset', padding: '5px', marginTop: '10px' }}>
            <strong>Submission Alert</strong>&nbsp;&nbsp;
            <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleResetValidation()}>Close Alert</Button>
            <br />
            {
              validateObjs.map(m => (
                <div key={uuid.v1()}>{m.message}</div>
              ))
            }
          </Alert>
        );
      }
    }

    const { pageMessage } = this.state;
    const messageBlock = (pageMessage && (pageMessage.error.length > 0 || pageMessage.warning.length > 0)) ? (
      <Alert bsStyle="warning" style={{ marginBottom: 'unset', padding: '5px', marginTop: '10px' }}>
        <strong>Structure Alert</strong>&nbsp;
        <Button bsSize="xsmall" bsStyle="warning" onClick={() => this.setState({ pageMessage: null })}>Close Alert</Button>
        <br />
        {
          pageMessage.error.map(m => (
            <div key={uuid.v1()}>{m}</div>
          ))
        }
        {
          pageMessage.warning.map(m => (
            <div key={uuid.v1()}>{m}</div>
          ))
        }
      </Alert>
    ) : null;

    const publication = sample.tag && sample.tag.taggable_data &&
      sample.tag.taggable_data.publication;

    return (
      <Panel
        className="element-panel-detail"
        bsStyle={publication ? 'success' : (sample.isPendingToSave ? 'info' : 'primary')}
      >
        <Panel.Heading>{this.sampleHeader(sample)}{messageBlock}{validationBlock}</Panel.Heading>
        <Panel.Body>
          <Row><Col md={this.props.fullScreen && this.state.commentScreen ? 6 : 12}>
            <div className={this.props.fullScreen ? 'full' : 'base'}>
          {this.sampleInfo(sample)}
          <ListGroup>
          <Tabs activeKey={this.state.activeTab} onSelect={this.handleSelect} id="SampleDetailsXTab">
            {tabContents.map((e, i) => e(i))}
          </Tabs>
          <PublishSampleModal
            show={showPublishSampleModal}
            sample={sample}
            onHide={() => this.showPublishSampleModal(false)}
            onPublishRefreshClose={this.forcePublishRefreshClose}
          />
          </ListGroup>
          {this.sampleFooter()}
          {this.structureEditorModal(sample)}
          {this.renderMolfileModal()}
            </div>
          </Col>
            {
              this.props.fullScreen && this.state.commentScreen ?
                <Col md={6}>
                  <div className={this.props.fullScreen ? 'full' : 'base'}>
                    <SampleDetailsRepoComment sampleId={sample.id} />
                  </div>
                </Col>
                :
                <div />
            }
          </Row>
        </Panel.Body>
      </Panel>
    )
  }
}

SampleDetails.propTypes = {
  sample: PropTypes.object,
  toggleFullScreen: PropTypes.func,
  toggleCommentScreen: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool.isRequired
}
