import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Col, Panel, ListGroupItem, ButtonToolbar, Button,
  Tabs, Tab, OverlayTrigger, Tooltip,
  Row, Alert, Label
} from 'react-bootstrap';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';
import uuid from 'uuid';
import { cloneDeep } from 'lodash';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import ElementActions from './actions/ElementActions';
import DetailActions from './actions/DetailActions';
import CollectionActions from './actions/CollectionActions';
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

import PublishReactionModal from './PublishReactionModal';
import {
  PublishedTag,
  LabelPublication,
  PublishBtnReaction,
  ReviewPublishBtn,
  validateMolecule,
} from './PublishCommon';
import ReactionDetailsRepoComment from './ReactionDetailsRepoComment';
import { contentToText } from './utils/quillFormat';

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
    this.handlePublishReactionModal = this.handlePublishReactionModal.bind(this);
    this.forcePublishRefreshClose = this.forcePublishRefreshClose.bind(this);
    this.handleCommentScreen = this.handleCommentScreen.bind(this);
    this.handleFullScreen = this.handleFullScreen.bind(this);
    this.handleValidation = this.handleValidation.bind(this);
    this.handleResetValidation = this.handleResetValidation.bind(this);
    this.handleModalAnalysesCheck = this.handleModalAnalysesCheck.bind(this);
  }

  onUIStoreChange(state) {
    if (state.reaction.activeTab != this.state.activeTab){
      this.setState({
        activeTab: state.reaction.activeTab
      })
    }
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange);
  }

  componentWillReceiveProps(nextProps) {
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
    const { reaction, activeTab } = this.state;

    return (
      nextReaction.can_publish !== reaction.can_publish ||
      nextReaction.can_update !== reaction.can_update ||
      nextReaction.id !== reaction.id ||
      nextReaction.updated_at !== reaction.updated_at ||
      nextReaction.reaction_svg_file !== reaction.reaction_svg_file ||
      !!nextReaction.changed || !!nextReaction.editedSample ||
      nextActiveTab !== activeTab ||
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

    const solvents = reaction.solvents.map(s => {
      let name = s.preferred_label
      if(name.length > 20) {
        return name.substring(0, 20).concat('...')
      }
      return name
    }).filter(s => s)

    const solventsArray = solvents.length !== 0 ? solvents : [reaction.solvent]
    let temperature = reaction.temperature_display
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = temperature + " " + reaction.temperature.valueUnit
    }

    ReactionSvgFetcher.fetchByMaterialsSvgPaths(materialsSvgPaths, temperature, solvents, reaction.duration, reaction.conditions).then((result) => {
      reaction.reaction_svg_file = result.reaction_svg;
      this.setState(reaction);
    });
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
            <ReactionDetailsContainers reaction={reaction} parent={this} readOnly={reaction.is_published || false} />
          </ListGroupItem>
        </Tab>
      </Tabs>
    );
  }

  extraTab(ind){
    let reaction = this.state.reaction || {}
    let num = ind  ;
    let NoName =  XTabs["content"+num];
    let TabName = XTabs["title"+num];
    return(
       <Tab eventKey={ind+5}  title={TabName} key={"sampleDetailsTab"+ind+3} >
         <ListGroupItem style={{paddingBottom: 20}}>
           <NoName  reaction={reaction}/>
         </ListGroupItem>
       </Tab>
      )
  }

  reactionSVG(reaction) {
    if(!reaction.svgPath) {
      return false;
    } else {
      return (
        <Col md={12}>
          <SvgFileZoomPan svgPath={reaction.svgPath}
                          duration={300}
                          resize={true} />
        </Col>
      )
    }
  }

  reactionHeader(reaction) {
    let hasChanged = reaction.changed ? '' : 'none'
    const titleTooltip = `Created at: ${reaction.created_at} \n Updated at: ${reaction.updated_at}`;

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
            disabled={!this.reactionIsValid() || reaction.isNew || reaction.is_published}
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
              disabled={!this.reactionIsValid() || reaction.is_published}
              style={{display: hasChanged}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
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
          <ElementCollectionLabels element={reaction} key={reaction.id} placement="right" />
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

  render() {
    const { reaction, showPublishReactionModal } = this.state;
    const submitLabel = (reaction && reaction.isNew) ? "Create" : "Save";
    let extraTabs =[];
    for (let j=0;j < XTabs.count;j++){
      if (XTabs['on'+j](reaction)){extraTabs.push((i)=>this.extraTab(i))}
    }

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
          <Tabs activeKey={this.state.activeTab} onSelect={this.handleSelect.bind(this)}
            id="reaction-detail-tab">
            <Tab eventKey={0} title={'Scheme'}>
              <ReactionDetailsScheme
                reaction={reaction}
                onReactionChange={(reaction, options) => this.handleReactionChange(reaction, options)}
                onInputChange={(type, event) => this.handleInputChange(type, event)}
                />
            </Tab>
            <Tab eventKey={1} title={'Properties'}>
              <ReactionDetailsProperties
                reaction={reaction}
                onReactionChange={reaction => this.handleReactionChange(reaction)}
                onInputChange={(type, event) => this.handleInputChange(type, event)}
                key={reaction.checksum}
                />
            </Tab>
            <Tab eventKey={2} title={'References'}>
              <ReactionDetailsLiteratures
                element={reaction}
                literatures={reaction.isNew === true ? reaction.literatures : null}
                onElementChange={reaction => this.handleReactionChange(reaction)}
              />
            </Tab>
            <Tab eventKey={3} title={'Analyses'}>
                {this.productData(reaction)}
            </Tab>
            {/* <Tab eventKey={4} title="Green Chemistry">
              <GreenChemistry
                reaction={reaction}
                onReactionChange={this.handleReactionChange}
              />
            </Tab> */}
            {extraTabs.map((e,i)=>e(i))}
          </Tabs>
          <hr/>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(reaction)}>
              Close
            </Button>
            <Button bsStyle="warning" onClick={() => this.handleSubmit()} disabled={!this.reactionIsValid() || reaction.is_published}>
              {submitLabel}
            </Button>
            <Button bsStyle="default" onClick={() => CollectionActions.downloadReportReaction(reaction.id)}>
              Export samples
            </Button>
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
