import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel, ListGroupItem, ButtonToolbar, Button,
  Tabs, Tab, OverlayTrigger, Tooltip,
  Row, Col, Alert, Label
} from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';
import { findIndex, cloneDeep } from 'lodash';
// For REPO
import RepositoryActions from 'src/stores/alt/repo/actions/RepositoryActions';
import PublishReactionModal from 'src/components/chemrepo/PublishReactionModal';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementResearchPlanLabels from 'src/apps/mydb/elements/labels/ElementResearchPlanLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ReactionVariations from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariations';
import ReactionDetailsLiteratures from 'src/apps/mydb/elements/details/literature/DetailsTabLiteratures';
import ReactionDetailsContainers from 'src/apps/mydb/elements/details/reactions/analysesTab/ReactionDetailsContainers';
import SampleDetailsContainers from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainers';
import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import ReactionDetailsProperties from 'src/apps/mydb/elements/details/reactions/propertiesTab/ReactionDetailsProperties';
import GreenChemistry from 'src/apps/mydb/elements/details/reactions/greenChemistryTab/GreenChemistry';
import Utils from 'src/utilities/Functions';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { setReactionByType } from 'src/apps/mydb/elements/details/reactions/ReactionDetailsShare';
import { sampleShowOrNew } from 'src/utilities/routesUtils';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import ConfirmClose from 'src/components/common/ConfirmClose';
import { rfValueFormat } from 'src/utilities/ElementUtils';
import ExportSamplesBtn from 'src/apps/mydb/elements/details/ExportSamplesBtn';
import CopyElementModal from 'src/components/common/CopyElementModal';
import { permitOn } from 'src/components/common/uis';
import { addSegmentTabs } from 'src/components/generic/SegmentDetails';
import Immutable from 'immutable';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import ScifinderSearch from 'src/components/scifinder/ScifinderSearch';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import MatrixCheck from 'src/components/common/MatrixCheck';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

import {
  PublishedTag,
  OrigElnTag,
  LabelPublication,
  PublishBtnReaction,
  ReviewPublishBtn,
  validateMolecule,
  validateYield
} from 'src/components/chemrepo/PublishCommon';
import ReactionDetailsRepoComment from 'src/components/chemrepo/ReactionDetailsRepoComment';
import { contentToText } from 'src/utilities/quillFormat';
import HelpInfo from 'src/components/common/HelpInfo';
import uuid from 'uuid';

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
      activeAnalysisTab: UIStore.getState().reaction.activeAnalysisTab,
      visible: Immutable.List(),
      sfn: UIStore.getState().hasSfn,
      showPublishReactionModal: false,
      commentScreen: false,
      currentUser: (UserStore.getState() && UserStore.getState().currentUser) || {},
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
    if(!reaction.reaction_svg_file) {
      this.updateReactionSvg();
    }
    this.handlePublishReactionModal = this.handlePublishReactionModal.bind(this);
    this.forcePublishRefreshClose = this.forcePublishRefreshClose.bind(this);
    this.handleCommentScreen = this.handleCommentScreen.bind(this);
    this.handleFullScreen = this.handleFullScreen.bind(this);
    this.handleValidation = this.handleValidation.bind(this);
    this.handleResetValidation = this.handleResetValidation.bind(this);
    this.handleModalAnalysesCheck = this.handleModalAnalysesCheck.bind(this);
    this.unseal = this.unseal.bind(this);
    if (!reaction.reaction_svg_file) {
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
    const { reaction } = this.props;
    const { currentUser } = this.state;

    UIStore.listen(this.onUIStoreChange);

    if (MatrixCheck(currentUser.matrix, commentActivation) && !reaction.isNew) {
      CommentActions.fetchComments(reaction);
    }
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { reaction } = this.state;
    const nextReaction = nextProps.reaction;


    if (nextReaction.id !== reaction.id ||
      nextReaction.updated_at !== reaction.updated_at ||
      nextReaction.reaction_svg_file !== reaction.reaction_svg_file ||
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
    const nextActiveAnalysisTab = nextState.activeAnalysisTab;
    const nextVisible = nextState.visible;
    const {
      reaction, activeTab, visible, activeAnalysisTab
    } = this.state;
    return (
      nextState.sealed !== reaction.sealed ||
      nextReaction.can_publish !== reaction.can_publish ||
      nextReaction.can_update !== reaction.can_update ||
      nextState.showPublishReactionModal !== this.state.showPublishReactionModal ||
      nextReaction.id !== reaction.id ||
      nextReaction.updated_at !== reaction.updated_at ||
      nextReaction.reaction_svg_file !== reaction.reaction_svg_file ||
      !!nextReaction.changed || !!nextReaction.editedSample ||
      nextActiveTab !== activeTab || nextVisible !== visible ||
      nextActiveAnalysisTab !== activeAnalysisTab
    );
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange);
  }

  onUIStoreChange(state) {
    if (state.reaction.activeTab != this.state.activeTab){
      this.setState({
        activeTab: state.reaction.activeTab
      })
    }
  }

  forcePublishRefreshClose(reaction, show) {
    this.setState({ reaction, showPublishReactionModal: show });
    this.forceUpdate();
  }

  unseal() {
    const { reaction } = this.state;
    reaction.sealed = false;
    this.setState({ reaction });
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
    if (state.reaction.activeTab != this.state.activeTab ||
      state.reaction.activeAnalysisTab !== this.state.activeAnalysisTab) {
      this.setState({
        activeTab: state.reaction.activeTab,
        activeAnalysisTab: state.reaction.activeAnalysisTab
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
    const { reaction } = this.state;
    return reaction.hasMaterials() && reaction.SMGroupValid();
  }

  handleReactionChange(reaction, options = {}) {
    reaction.updateMaxAmountOfProducts();
    reaction.changed = true;
    if (options.schemaChanged) {
      this.setState({ reaction }, () => this.updateReactionSvg());
    } else {
      this.setState({ reaction });
    }
  }

  handleInputChange(type, event) {
    let value;
    if (type === 'temperatureUnit' || type === 'temperatureData'
      || type === 'description' || type === 'role'
      || type === 'observation' || type === 'durationUnit'
      || type === 'duration' || type === 'rxno') {
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
    sampleShowOrNew({ params: { sampleID: product.id } });
  }

  handleProductChange(product, cb) {
    let { reaction } = this.state

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
          style={{ cursor: 'pointer' }}
          title="Open sample window">
          <i className="icon-sample" />&nbsp;{product.title()}
        </span>
      </span>
    )
  }

  productData(reaction) {
    const { products } = this.state.reaction;
    const { activeAnalysisTab } = this.state;

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
        activeKey={activeAnalysisTab}
        onSelect={this.handleSelectActiveAnalysisTab.bind(this)}
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

  reactionSVG(reaction) {
    if (!reaction.svgPath) {
      return false;
    } else {
      const svgProps = reaction.svgPath.substr(reaction.svgPath.length - 4) === '.svg' ? { svgPath: reaction.svgPath } : { svg: reaction.reaction_svg_file }
      if (reaction.hasMaterials()) {
        return (
          <SvgFileZoomPan
            duration={300}
            resize={true}
            {...svgProps}
          />)
      }
    }
  }

  reactionHeader(reaction) {
    let hasChanged = reaction.changed ? '' : 'none';
    const titleTooltip = formatTimeStampsOfElement(reaction || {});

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

    const rsPlanLabel = (reaction.isNew || _.isEmpty(reaction.research_plans)) ? null : (
      <ElementResearchPlanLabels plans={reaction.research_plans} key={reaction.id} placement="right" />
    );

    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="sampleDates">{titleTooltip}</Tooltip>}>
          <span><i className="icon-reaction" />&nbsp;{reaction.title()}</span>
        </OverlayTrigger>
        <ConfirmClose el={reaction} forceClose={reaction.is_published} />
        <OverlayTrigger placement="bottom"
          overlay={<Tooltip id="saveReaction">Save and Close Reaction</Tooltip>}>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.handleSubmit(true)}
            disabled={
              !permitOn(reaction) || !this.reactionIsValid() || reaction.isNew
            }
            style={{ display: hasChanged }}
          >
            <i className="fa fa-floppy-o" />
            <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="saveReaction">Save Reaction</Tooltip>}
        >
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.handleSubmit()}
            disabled={!permitOn(reaction) || !this.reactionIsValid()}
            style={{ display: hasChanged }}
          >
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
        <div style={{ display: "inline-block", marginLeft: "10px" }}>
          {colLabel}
          {rsPlanLabel}
          <ElementAnalysesLabels element={reaction} key={reaction.id + "_analyses"} />
          { schemeOnly ? <span>&nbsp;<Label>scheme only</Label></span> : '' }
          <HeaderCommentSection element={reaction} />
        </div>
        {reaction.isNew
          ? null
          : <OpenCalendarButton isPanelHeader eventableId={reaction.id} eventableType="Reaction" />}
        <PrintCodeButton element={reaction} />

        <PublishBtnReaction
          reaction={reaction}
          showModal={this.handlePublishReactionModal}
        />
        <ReviewPublishBtn element={reaction} showComment={this.handleCommentScreen} validation={this.handleValidation} />
        <div style={{ display: "inline-block", marginLeft: "10px" }}>
          <OrigElnTag element={reaction} />
          <PublishedTag element={reaction} fnUnseal={this.unseal} />
          <LabelPublication element={reaction} />
        </div>
      </div>
    );
  }

  handleSelect(key) {
    UIActions.selectTab({ tabKey: key, type: 'reaction' });
    this.setState({
      activeTab: key
    });
  }

  handleSelectActiveAnalysisTab(key) {
    UIActions.selectActiveAnalysisTab(key);
    this.setState({
      activeAnalysisTab: key
    });
  }

  onTabPositionChanged(visible) {
    this.setState({ visible });
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
        <Tab eventKey="scheme" title="Scheme" key={`scheme_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_scheme" element={reaction} />
          }
          <ReactionDetailsScheme
            reaction={reaction}
            onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
            onInputChange={(type, event) => this.handleInputChange(type, event)}
          />
        </Tab>
      ),
      properties: (
        <Tab eventKey="properties" title="Properties" key={`properties_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_properties" element={reaction} />
          }
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
          {
            !reaction.isNew && <CommentSection section="reaction_references" element={reaction} />
          }
          <ReactionDetailsLiteratures
            element={reaction}
            literatures={reaction.isNew === true ? reaction.literatures : null}
            onElementChange={r => this.handleReactionChange(r)}
          />
        </Tab>
      ),
      analyses: (
        <Tab eventKey="analyses" title="Analyses" key={`analyses_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_analyses" element={reaction} />
          }
          {this.productData(reaction)}
        </Tab>
      ),
      green_chemistry: (
        <Tab eventKey="green_chemistry" title="Green Chemistry" key={`green_chem_${reaction.id}`}>
          {
            !reaction.isNew && <CommentSection section="reaction_green_chemistry" element={reaction}/>
          }
          <GreenChemistry
            reaction={reaction}
            onReactionChange={this.handleReactionChange}
          />
        </Tab>
      ),
      variations: (
        <Tab eventKey="variations" title="Variations" key={`variations_${reaction.id}`} unmountOnExit={false}>
          <ReactionVariations
            reaction={reaction}
            onReactionChange={this.handleReactionChange}
          />
        </Tab>
      )
    };

    const tabTitlesMap = {
      green_chemistry: 'Green Chemistry'
    }

    addSegmentTabs(reaction, this.handleSegmentsChange, tabContentsMap);
    const stb = [];
    const tabContents = [];
    visible.forEach((value) => {
      const tabContent = tabContentsMap[value];
      if (tabContent) { tabContents.push(tabContent); }
      stb.push(value);
    });

    // For REPO
    let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
    segmentKlasses =
      segmentKlasses.filter(s => s.element_klass && s.element_klass.name === reaction.type);
    segmentKlasses.forEach((klass) => {
      const visIdx = visible.indexOf(klass.label);
      const idx = findIndex(reaction.segments, o => o.segment_klass_id === klass.id);
      if (visIdx < 0 && idx > -1) {
        const tabContent = tabContentsMap[klass.label];
        if (tabContent) { tabContents.push(tabContent); }
        stb.push(klass.label);
      }
    });


    const { showPublishReactionModal } = this.state;
    const submitLabel = (reaction && reaction.isNew) ? 'Create' : 'Save';
    const exportButton = (reaction && reaction.isNew) ? null : <ExportSamplesBtn type="reaction" id={reaction.id} />;

    const activeTab = (this.state.activeTab !== 0 && stb.indexOf(this.state.activeTab) > -1 &&
      this.state.activeTab) || visible[0];
    const panelStylePre = reaction.isPendingToSave ? 'info' : 'primary';
    const publication = reaction.tag && reaction.tag.taggable_data &&
      reaction.tag.taggable_data.publication;
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
              <Tabs activeKey={activeTab} onSelect={this.handleSelect.bind(this)} id="reaction-detail-tab" unmountOnExit={true}>
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
              <CommentModal element={reaction} />
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
};
