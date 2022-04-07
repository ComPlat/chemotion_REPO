import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Col, Panel, ListGroupItem, ButtonToolbar, Button,
  Tabs, Tab, OverlayTrigger, Tooltip,
  Row, Alert, Label
} from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import { findIndex, cloneDeep } from 'lodash';
import uuid from 'uuid';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import ElementActions from './actions/ElementActions';
import DetailActions from './actions/DetailActions';
import LoadingActions from './actions/LoadingActions';
import RepositoryActions from './actions/RepositoryActions';
import ReactionDetailsLiteratures from './DetailsTabLiteratures';
import ReactionDetailsContainers from './ReactionDetailsContainers';
import SampleDetailsContainers from './SampleDetailsContainers';
import ReactionDetailsScheme from './ReactionDetailsScheme';
import ReactionDetailsProperties from './ReactionDetailsProperties';
import GreenChemistry from './green_chem/GreenChemistry';
import Utils from './utils/Functions';
import PrintCodeButton from './common/PrintCodeButton';
import XTabs from './extra/ReactionDetailsXTabs';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import { setReactionByType } from './ReactionDetailsShare';
import { sampleShowOrNew } from './routesUtils';
import ReactionSvgFetcher from './fetchers/ReactionSvgFetcher';
import ConfirmClose from './common/ConfirmClose';
import { rfValueFormat } from './utils/ElementUtils';
import ExportSamplesBtn from './ExportSamplesBtn';
import CopyElementModal from './common/CopyElementModal';
import { permitOn } from './common/uis';
import { addSegmentTabs } from './generic/SegmentDetails';
import Immutable from 'immutable';
import ElementDetailSortTab from './ElementDetailSortTab';
import ScifinderSearch from './scifinder/ScifinderSearch';

import PublishReactionModal from './PublishReactionModal';
import {
  PublishedTag,
  LabelPublication,
  PublishBtnReaction,
  ReviewPublishBtn,
  validateMolecule,
  validateYield
} from './PublishCommon';
import ReactionDetailsRepoComment from './ReactionDetailsRepoComment';
import { contentToText } from './utils/quillFormat';
import HelpInfo from './common/HelpInfo';

export default class ReactionDetails extends Component {
  constructor(props) {
    super(props);

    const { reaction } = props;
    const publication = reaction.tag && reaction.tag.taggable_data
      && reaction.tag.taggable_data.publication
    this.state = {
      reaction,
      literatures: reaction.literatures,
      activeTab: UIStore.getState().reaction.activeTab,
      visible: Immutable.List(),
      sfn: UIStore.getState().hasSfn,
      showPublishReactionModal: false,
      commentScreen: false
    };

    // remarked because of #466 reaction load image issue (Paggy 12.07.2018)
    // if(reaction.hasMaterials()) {
    //   this.updateReactionSvg();
    // }

    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.handleReactionChange = this.handleReactionChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    this.handlePublishReactionModal = this.handlePublishReactionModal.bind(this);
    this.forcePublishRefreshClose = this.forcePublishRefreshClose.bind(this);
    this.handleCommentScreen = this.handleCommentScreen.bind(this);
    this.handleFullScreen = this.handleFullScreen.bind(this);
    this.handleValidation = this.handleValidation.bind(this);
    this.handleResetValidation = this.handleResetValidation.bind(this);
    this.handleModalAnalysesCheck = this.handleModalAnalysesCheck.bind(this);
    if(!reaction.reaction_svg_file) {
      this.updateReactionSvg();
    }
  }

  onUIStoreChange(state) {
    if (state.reaction.activeTab != this.state.activeTab){
      this.setState({
        activeTab: state.reaction.activeTab
      })
    }
  }


  componentDidMount() {
    UIStore.listen(this.onUIStoreChange)
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { reaction } = this.state;
    const nextReaction = nextProps.reaction;

    if (nextReaction.id !== reaction.id ||
        nextReaction.can_publish !== reaction.can_publish ||
        nextReaction.can_update !== reaction.can_update ||
        nextReaction.updated_at !== reaction.updated_at ||
        nextReaction.reaction_svg_file !== reaction.reaction_svg_file ||
        nextReaction.changed || nextReaction.editedSample) {
      this.setState(prevState => ({ ...prevState, reaction: nextReaction }));
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const nextReaction = nextProps.reaction;
    const nextActiveTab = nextState.activeTab;
    const nextVisible = nextState.visible;
    const { reaction, activeTab, visible } = this.state;
    return (
      nextReaction.can_publish !== reaction.can_publish ||
      nextReaction.can_update !== reaction.can_update ||
      nextReaction.id !== reaction.id ||
      nextReaction.updated_at !== reaction.updated_at ||
      nextReaction.reaction_svg_file !== reaction.reaction_svg_file ||
      !!nextReaction.changed || !!nextReaction.editedSample ||
      nextActiveTab !== activeTab || nextVisible !== visible ||
      nextState.commentScreen !== this.state.commentScreen ||
      nextProps.fullScreen !== this.props.fullScreen ||
      ((nextState.reaction.validates || false)) ||
      nextState.showPublishReactionModal !== this.state.showPublishReactionModal
    );
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  forcePublishRefreshClose(reaction, show) {
    this.setState({ reaction, showPublishReactionModal: show });
    this.forceUpdate();
  }

  handleModalAnalysesCheck(reaction) {
    this.setState({ reaction });
  }

  handleValidation(element) {
    let validates = [];
    const reaction = element;
    const schemeOnly = (reaction && reaction.publication && reaction.publication.taggable_data &&
    reaction.publication.taggable_data.scheme_only === true) || false;
    if ((reaction.rxno || '') === '' && schemeOnly === false) {
      validates.push({ name: 'reaction_type', value: false, message: 'Reaction Type is missing.' });
    }
    const duration = (reaction.duration || '').split(' ').shift();
    if (duration === '' || (duration === reaction.duration)) {
      validates.push({ name: 'duration', value: false, message: 'No duration' });
    }
    const hasTemperature = !!(reaction.temperature && reaction.temperature.userText);
    if (!hasTemperature) {
      validates.push({ name: 'temperature', value: false, message: 'Temperature is missing' });
    }
    const desc = contentToText(reaction.description).trim() || '';
    if (desc === '' && schemeOnly === false) {
      validates.push({ name: 'description', value: false, message: 'Description is missing' });
    }

    if (schemeOnly === false) {
      let hasAnalyses = (reaction.container.children.filter(c => c.container_type === 'analyses')[0].children.length > 0);
      const startingMaterisls = (reaction.starting_materials || []);
      if (startingMaterisls.length < 1) {
        validates.push({ name: 'start_material', value: false, message: 'Start material is missing' });
      }
      startingMaterisls.forEach((st) => {
        if (!st.amount || !st.amount.value) {
          validates.push({ name: 'starting_materials-amount', value: false, message: `${st.molecule_iupac_name}: amount is 0` });
        }
      });
      const products = (reaction.products || []);
      if (products.length < 1) {
        validates.push({ name: 'product', value: false, message: 'Product is missing' });
      }
      products.forEach((pt) => {
        if (!pt.amount || !pt.amount.value) {
          validates.push({ name: 'product-amount', value: false, message: `${pt.molecule_iupac_name}: amount is 0` });
        }
        if (pt.analysisArray().length > 0) {
          hasAnalyses = true;
        }
        const validatePt = validateMolecule(pt);
        if (validatePt.length > 0) {
          validates = validates.concat(validatePt);
        }
      });
      if (!hasAnalyses) {
        validates.push({ name: 'analyses', value: false, message: 'Analyses data is missing.' });
      }
    }
    validates = validates.concat(validateYield(reaction));
    if (validates.length > 0) {
      reaction.validates = validates;
      this.setState({ reaction });
    } else {
      LoadingActions.start();
      RepositoryActions.reviewPublish(element);
    }
  }

  handleResetValidation() {
    const { reaction } = this.state;
    reaction.validates = [];
    this.setState({ reaction });
  }

  handleCommentScreen() {
    this.setState({ commentScreen: true });
    this.props.toggleCommentScreen(true);
  }

  handleFullScreen() {
    this.setState({ commentScreen: false });
    this.props.toggleFullScreen();
  }

  handlePublishReactionModal(show) {
    this.setState({ showPublishReactionModal: show });
  }

  updateReactionSvg() {
    const {reaction} = this.state;
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map(material => material.svgPath),
      reactants: reaction.reactants.map(material => material.svgPath),
      products: reaction.products.map(material => [material.svgPath, material.equivalent])
    };

    const solvents = reaction.solvents.map((s) => {
      const name = s.preferred_label;
      return name;
    }).filter(s => s);
  }

  onUIStoreChange(state) {
    if (state.reaction.activeTab != this.state.activeTab) {
      this.setState({
        activeTab: state.reaction.activeTab
      });
    }
  }

  handleSubmit(closeView = false) {
    LoadingActions.start();

    const { reaction } = this.state;
    if (reaction && reaction.isNew) {
      ElementActions.createReaction(reaction);
    } else {
      ElementActions.updateReaction(reaction, closeView);
    }

    if (reaction.is_new || closeView) {
      DetailActions.close(reaction, true);
    }
  }

  reactionIsValid() {
    const {reaction} = this.state;
    return reaction.hasMaterials() && reaction.SMGroupValid();
  }

  handleReactionChange(reaction, options={}) {
    reaction.changed = true;
    if(options.schemaChanged) {
      this.setState({ reaction }, () => this.updateReactionSvg());
    } else {
      this.setState({ reaction });
    }
  }

  handleInputChange(type, event) {
    let value;
    if (type === 'temperatureUnit' || type === 'temperatureData' ||
      type === 'description' || type === 'role' || type === 'observation' || type === 'durationUnit' || type === 'duration' || type === 'rxno') {
      value = event;
    } else if (type === 'rfValue') {
      value = rfValueFormat(event.target.value) || '';
    } else {
      value = event.target.value;
    }

    const { reaction } = this.state;

    const { newReaction, options } = setReactionByType(reaction, type, value);
    this.handleReactionChange(newReaction, options);
  }

  handleProductClick(product) {
    const uri = Aviator.getCurrentURI();
    const uriArray = uri.split(/\//);
    Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/sample/${product.id}`, { silent: true });
    sampleShowOrNew({ params: { sampleID: product.id} });
  }

  handleProductChange(product, cb) {
    let {reaction} = this.state

    reaction.updateMaterial(product)
    reaction.changed = true

    this.setState({ reaction }, cb)
  }

  productLink(product) {
    return (
      <span>
        Analysis:
        &nbsp;
        <span className="pseudo-link"
           onClick={() => this.handleProductClick(product)}
           style={{cursor: 'pointer'}}
           title="Open sample window">
          <i className="icon-sample" />&nbsp;{product.title()}
        </span>
      </span>
    )
  }

  productData(reaction) {
    const { products } = this.state.reaction;

    const tabs = products.map((product, key) => {
      const title = this.productLink(product);
      const setState = () => this.handleProductChange(product);
      const handleSampleChanged = (_, cb) => this.handleProductChange(product, cb);
      return (
        <Tab
          key={product.id}
          eventKey={key}
          title={title}
        >
          <SampleDetailsContainers
            sample={product}
            setState={setState}
            handleSampleChanged={handleSampleChanged}
            handleSubmit={this.handleSubmit}
            style={{ marginTop: 10 }}
            publish={reaction.is_published}
          />
        </Tab>
      );
    });
    const reactionTab = <span>Analysis:&nbsp;<i className="icon-reaction" />&nbsp;{reaction.short_label}</span>;
    return (
      <Tabs
        id="data-detail-tab"
        style={{ marginTop: '10px' }}
        unmountOnExit
      >
        {tabs}
        <Tab eventKey={4.1} title={reactionTab}>
          <ListGroupItem style={{ paddingBottom: 20 }}>
            <ReactionDetailsContainers
              reaction={reaction}
              parent={this}
              readOnly={!permitOn(reaction)}
              handleSubmit={this.handleSubmit}
            />
          </ListGroupItem>
        </Tab>
      </Tabs>
    );
  }

  extraTab(ind) {
    const reaction = this.state.reaction || {};
    const num = ind;
    const NoName = XTabs["content"+num];
    const TabName = XTabs["title"+num];
    return (
      <Tab eventKey={ind + 5} title={TabName} key={`sampleDetailsTab${ind + 3}`} >
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <NoName reaction={reaction} />
        </ListGroupItem>
      </Tab>
    );
  }

  reactionSVG(reaction) {
    if(!reaction.svgPath) {
      return false;
    } else {
      const svgProps = reaction.svgPath.substr(reaction.svgPath.length - 4) === '.svg' ? { svgPath: reaction.svgPath } : { svg: reaction.reaction_svg_file }
      return (
        <SvgFileZoomPan
          duration={300}
          resize={true}
          {...svgProps}
        />)
    }
  }

  reactionHeader(reaction) {
    let hasChanged = reaction.changed ? '' : 'none'
    const titleTooltip = `Created at: ${reaction.created_at} \n Updated at: ${reaction.updated_at}`;

    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.is_shared === false &&
      currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;


    const copyBtn = (reaction.can_copy === true && !reaction.isNew) ? (
      <CopyElementModal
        element={reaction}
        defCol={defCol}
      />
    ) : null;

    const colLabel = reaction.isNew ? null : (
      <ElementCollectionLabels element={reaction} key={reaction.id} placement="right" />
    );
    if (reaction.is_published) {
      hasChanged = 'none';
    }

    const schemeOnly = (reaction && reaction.publication && reaction.publication.taggable_data &&
      reaction.publication.taggable_data.scheme_only === true) || false;



    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="sampleDates">{titleTooltip}</Tooltip>}>
          <span><i className="icon-reaction"/>&nbsp;{reaction.title()}</span>
        </OverlayTrigger>
        <ConfirmClose el={reaction} forceClose={reaction.is_published} />
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveReaction">Save and Close Reaction</Tooltip>}>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.handleSubmit(true)}
            disabled={!permitOn(reaction) || !this.reactionIsValid() || reaction.isNew}
            style={{ display: hasChanged }}
          >
            <i className="fa fa-floppy-o" />
            <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveReaction">Save Reaction</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
              onClick={() => this.handleSubmit()}
              disabled={!permitOn(reaction) || !this.reactionIsValid()}
              style={{display: hasChanged}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        {copyBtn}
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}
        >
          <Button
            bsStyle="info"
            bsSize="xsmall"
            className="button-right"
            onClick={this.handleFullScreen}
          >
            <i className="fa fa-expand" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="generateReport">Generate Report</Tooltip>}
        >
          <Button
            bsStyle="success"
            bsSize="xsmall"
            className="button-right"
            disabled={reaction.changed || reaction.isNew}
            title={(reaction.changed || reaction.isNew) ?
              "Report can be generated after reaction is saved."
              : "Generate report for this reaction"}
            onClick={() => Utils.downloadFile({
              contents: "/api/v1/reports/docx?id=" + reaction.id,
              name: reaction.name
            })}
          >
            <i className="fa fa-cogs" />
          </Button>
        </OverlayTrigger>
        <div style={{display: "inline-block", marginLeft: "10px"}}>
          {colLabel}
          <ElementAnalysesLabels element={reaction} key={reaction.id+"_analyses"}/>
          { schemeOnly ? <span>&nbsp;<Label>scheme only</Label></span> : '' }
        </div>
        <PublishBtnReaction
          reaction={reaction}
          showModal={this.handlePublishReactionModal}
        />
        <ReviewPublishBtn element={reaction} showComment={this.handleCommentScreen} validation={this.handleValidation} />
        <div style={{ display: "inline-block", marginLeft: "10px" }}>
          <PublishedTag element={reaction} />
          <LabelPublication element={reaction} />
        </div>
      </div>
    );
  }

  handleSelect(key) {
    UIActions.selectTab({tabKey: key, type: 'reaction'});
    this.setState({
      activeTab: key
    })
  }

  onTabPositionChanged(visible) {
    this.setState({ visible })
  }

  updateReactionSvg() {
    const { reaction } = this.state;
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map(material => material.svgPath),
      reactants: reaction.reactants.map(material => material.svgPath),
      products: reaction.products.map(material => [material.svgPath, material.equivalent])
    };

    const solvents = reaction.solvents.map((s) => {
      const name = s.preferred_label;
      return name;
    }).filter(s => s);

    let temperature = reaction.temperature_display;
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = `${temperature} ${reaction.temperature.valueUnit}`;
    }

    ReactionSvgFetcher.fetchByMaterialsSvgPaths(materialsSvgPaths, temperature, solvents, reaction.duration, reaction.conditions).then((result) => {
      reaction.reaction_svg_file = result.reaction_svg;
      this.setState(reaction);
    });
  }

  handleSegmentsChange(se) {
    const { reaction } = this.state;
    const { segments } = reaction;
    const idx = findIndex(segments, o => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    reaction.segments = segments;
    reaction.changed = true;
    this.setState({ reaction });
  }

  render() {
    const { reaction } = this.state;
    const { visible } = this.state;
    const tabContentsMap = {
      scheme: (
        <Tab eventKey="scheme" title="Scheme"  key={`scheme_${reaction.id}`}>
          <ReactionDetailsScheme
            reaction={reaction}
            onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
            onInputChange={(type, event) => this.handleInputChange(type, event)}
            />
        </Tab>
      ),
      properties: (
        <Tab eventKey="properties" title="Properties" key={`properties_${reaction.id}`}>
          <ReactionDetailsProperties
            reaction={reaction}
            onReactionChange={r => this.handleReactionChange(r)}
            onInputChange={(type, event) => this.handleInputChange(type, event)}
            key={reaction.checksum}
          />
        </Tab>
      ),
      references: (
        <Tab eventKey="references" title="References" key={`references_${reaction.id}`}>
          <ReactionDetailsLiteratures
            element={reaction}
            literatures={reaction.isNew === true ? reaction.literatures : null}
            onElementChange={r => this.handleReactionChange(r)}
          />
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${reaction.id}`}>
          {this.productData(reaction)}
        </Tab>
      ),
/*
      green_chemistry: (
        <Tab eventKey="green_chemistry" title="Green Chemistry" key={`green_chem_${reaction.id}`}>
          <GreenChemistry
            reaction={reaction}
            onReactionChange={this.handleReactionChange}
          />
        </Tab>
      )
*/
    };

    const tabTitlesMap = {
      green_chemistry: 'Green Chemistry'
    }

    for (let j = 0; j < XTabs.count; j += 1) {
      if (XTabs[`on${j}`](reaction)) {
        const NoName = XTabs[`content${j}`];
        tabContentsMap[`xtab_${j}`] = (
          <Tab eventKey={`xtab_${j}`} key={`xtab_${j}`} title={XTabs[`title${j}`]} >
            <ListGroupItem style={{ paddingBottom: 20 }} >
              <NoName reaction={reaction} />
            </ListGroupItem>
          </Tab>
        );
        tabTitlesMap[`xtab_${j}`] = XTabs[`title${j}`];
      }
    }

    addSegmentTabs(reaction, this.handleSegmentsChange, tabContentsMap);

    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
    });

    const { showPublishReactionModal } = this.state;
    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    const exportButton = (reaction && reaction.isNew) ? null : <ExportSamplesBtn type="reaction" id={reaction.id} />;

    const activeTab = (this.state.activeTab !== 0 && this.state.activeTab) || visible[0];
    const panelStylePre = reaction.isPendingToSave ? 'info' : 'primary';
    const publication = reaction.tag && reaction.tag.taggable_data &&
      reaction.tag.taggable_data.publication
    const panelStyle = publication ? 'success' : panelStylePre;

    const validateObjs = reaction.validates && reaction.validates.filter(v => v.value === false);
    const validationBlock = (validateObjs && validateObjs.length > 0) ? (
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
    ) : null;
    const schemeTitle = <span>Scheme&nbsp;<HelpInfo source={reaction.is_published ? 'x' : 'scheme'} place="right" /></span>;
    return (
      <Panel
        className="element-panel-detail"
        bsStyle={panelStyle}
      >
        <Panel.Heading>{this.reactionHeader(reaction)}{validationBlock}</Panel.Heading>
        <Panel.Body>
          <Row><Col md={this.props.fullScreen && this.state.commentScreen ? 6 : 12}>
            <div className={this.props.fullScreen ? 'full' : 'base'}>
          {this.reactionSVG(reaction)}
            <PublishReactionModal
                show={showPublishReactionModal}
                reaction={cloneDeep(reaction)}
                onHide={this.handlePublishReactionModal}
                onPublishRefreshClose={this.forcePublishRefreshClose}
                onHandleAnalysesCheck={this.handleModalAnalysesCheck}
            />
          <ElementDetailSortTab
            type="reaction"
            availableTabs={Object.keys(tabContentsMap)}
            tabTitles={tabTitlesMap}
            onTabPositionChanged={this.onTabPositionChanged}
          />
          {this.state.sfn ? <ScifinderSearch el={reaction} /> : null}
          <Tabs activeKey={activeTab} onSelect={this.handleSelect.bind(this)} id="reaction-detail-tab">
            {tabContents}
          </Tabs>
          <hr />
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(reaction)}>
              Close
            </Button>
            <Button id="submit-reaction-btn" bsStyle="warning" onClick={() => this.handleSubmit()} disabled={!permitOn(reaction) || !this.reactionIsValid()}>
              {submitLabel}
            </Button>
            {exportButton}
          </ButtonToolbar>
            </div>
          </Col>
            {
              this.props.fullScreen && this.state.commentScreen ?
                <Col md={6}>
                  <div className={this.props.fullScreen ? 'full' : 'base'}>
                    <ReactionDetailsRepoComment reactionId={reaction.id} />
                  </div>
                </Col>
                :
                <div />
            }
          </Row>
        </Panel.Body>
      </Panel>
    );
  }
}

ReactionDetails.propTypes = {
  reaction: PropTypes.object,
  toggleFullScreen: PropTypes.func,
  toggleCommentScreen: PropTypes.func.isRequired,
  fullScreen: PropTypes.bool.isRequired,
  validates: PropTypes.array
}
