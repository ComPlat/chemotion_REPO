import React, { Component } from 'react';
import { Table, Col, Row, Navbar, ButtonGroup, Button, ButtonToolbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import uuid from 'uuid';
import RepoCollectionDetails from './RepoCollectionDetails';
import PublicActions from '../components/actions/PublicActions';
import PublicStore from '../components/stores/PublicStore';
import { MetadataModal, InfoModal } from './RepoEmbargoModal';
import PublicFetcher from '../components/fetchers/PublicFetcher';

const SvgPath = (svg, type) => {
  if (svg && svg !== '***') {
    if (type === 'Reaction') {
      return `/images/reactions/${svg}`;
    }
    return `/images/samples/${svg}`;
  }
  return 'images/wild_card/no_image_180.svg';
};

const infoTag = (el, la) => {
  let authorInfo = '';
  authorInfo = (<div className="home_wrapper_item"><div>Author</div><div className="item_xvial">{el.published_by}</div></div>);
  return (
    <Row key={`list-reaction-info-${el.id}`} className="home_wrapper">
      <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()} className="left_tooltip bs_tooltip">Chemotion-Repository unique ID</Tooltip>}>
        <div className="home_wrapper_item">
          <div>ID</div><div className="item_xvial">{`${el.type === 'Reaction' ? 'CRR' : 'CRS'}-${el.pub_id}`}</div>
        </div>
      </OverlayTrigger>
      <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()} className="left_tooltip bs_tooltip">an embargo bundle contains publications which have been published at the same time</Tooltip>}>
        <div className="home_wrapper_item">
          <div>Embargo</div><div className="item_xvial">{la}</div>
        </div>
      </OverlayTrigger>
      {authorInfo}
      <div className="home_wrapper_item">
        <div>Published on</div><div className="item_xvial">{el.published_at}</div>
      </div>
      <div className="home_wrapper_item">
        <div>Analyses</div><div className="item_xvial">{el.ana_cnt || 0}</div>
      </div>
    </Row>
  );
};

const Elist = (cid, la, el, selectEmbargo = null, user = null, currentElement = null) => {
  if (!el) {
    return '';
  }
  let listClass;
  if (el.type === 'Reaction') {
    listClass = (currentElement !== null && currentElement.publication && currentElement.publication.element_id === el.id) ? 'list_focus_on' : 'list_focus_off';
  } else {
    listClass = (currentElement !== null && currentElement.published_samples && currentElement.published_samples[0] && currentElement.published_samples[0].id === el.id) ? 'list_focus_on' : 'list_focus_off';
  }
  return (
    <Col md={currentElement ? 12 : 6} key={`list-embargo-${el.id}`} onClick={() => PublicActions.getEmbargoElement(cid, el)}>
      <div className={`home_reaction ${listClass}`}>
        <Row key={`list-reaction-svg-${el.id}`}>
          <Col md={12}>
            <SVG src={SvgPath(el.svg, el.type)} className="layout_svg_reaction" key={el.svg} height={300} />
          </Col>
        </Row>
        {infoTag(el, la)}
      </div>
    </Col>
  );

};

export default class RepoCollection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      current_user: {},
      currentElement: null,
      selectEmbargo: null,
      showInfoModal: false,
      showMetadataModal: false,
    };
    this.onChange = this.onChange.bind(this);
    this.handleInfoShow = this.handleInfoShow.bind(this);
    this.handleInfoClose = this.handleInfoClose.bind(this);
    this.handleMetadataShow = this.handleMetadataShow.bind(this);
    this.handleMetadataClose = this.handleMetadataClose.bind(this);
  }

  componentDidMount() {
    PublicStore.listen(this.onChange);
  }

  componentWillUnmount() {
    PublicStore.unlisten(this.onChange);
  }

  onChange(state) {
    // this.setState(prevState => ({ ...prevState, ...state }));
    if (state.selectEmbargo && state.selectEmbargo != this.state.selectEmbargo) {
      this.setState({ selectEmbargo: state.selectEmbargo });

      PublicFetcher.fetchEmbargoElements(state.selectEmbargo.element_id)
        .then((result) => {
          this.setState({ elements: result.elements });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    }

    if (state.currentElement !== this.state.currentElement) {
      this.setState({ currentElement: state.currentElement });
    }
  }


  handleInfoShow() {
    this.setState({ showInfoModal: true });
  }

  handleInfoClose() {
    this.setState({ showInfoModal: false });
  }

  handleMetadataShow() {
    this.setState({ showMetadataModal: true });
  }

  handleMetadataClose() {
    this.setState({ showMetadataModal: false });
  }

  renderSearch() {
    const { selectEmbargo, elements } = this.state;
    const la = selectEmbargo && selectEmbargo.taggable_data && selectEmbargo.taggable_data.label;

    const actionButtons =
      (
        <span style={{ float: 'right' }}>
          <ButtonToolbar>
            <Button
              id="all-info-button"
              disabled={selectEmbargo === null || (elements && elements.length === 0)}
              onClick={() => this.handleMetadataShow()}
            >
              <i className="fa fa-file-code-o" aria-hidden="true" />&nbsp;Metadata
            </Button>
            <Button
              id="all-info-button"
              disabled={selectEmbargo === null || (elements && elements.length === 0)}
              onClick={() => this.handleInfoShow()}
            >
              <i className="fa fa-users" aria-hidden="true" />&nbsp;Info and DOI
            </Button>
            <Button href="/home/publications" target="_blank">
              back to all publications
            </Button>
          </ButtonToolbar>
        </span>
      );
    const filterDropdown = (
      <ButtonGroup>
        {actionButtons}
      </ButtonGroup>
    );

    return (
      <div style={{ paddingLeft: '15px', marginTop: '8px', marginBottom: '8px' }}>
        <span><b>The data on this page refers to the data collection: &nbsp;{la}&nbsp;</b></span>
        {filterDropdown}
      </div>
    );
  }

  render() {
    const {
      elements, currentElement, currentUser, showInfoModal, selectEmbargo, showMetadataModal
    } = this.state;
    const id = (selectEmbargo && selectEmbargo.element_id) || 0;
    const la = selectEmbargo && selectEmbargo.taggable_data && selectEmbargo.taggable_data.label;
    const metadata = (selectEmbargo && selectEmbargo.metadata_xml) || '';
    return (
      <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
        <Col md={currentElement ? 4 : 12} >
          <Navbar fluid className="navbar-custom" style={{ marginBottom: '5px' }}>
            {this.renderSearch()}
            <div style={{ clear: 'both' }} />
          </Navbar>
          <div className="public-list" style={{ backgroundColor: '#efefef' }}>
            <Table className="sample-entries">
              <tbody>
                {((typeof (elements) !== 'undefined' && elements) || []).map(r => Elist(id, la, r, selectEmbargo, currentUser, currentElement)) }
              </tbody>
            </Table>
          </div>
        </Col>
        <Col
          md={currentElement ? 8 : 0}
        >
          <div className="public-element">
            <RepoCollectionDetails currentElement={currentElement} />
          </div>
          <InfoModal
            key="info-modal"
            showModal={showInfoModal}
            selectEmbargo={selectEmbargo}
            onCloseFn={this.handleInfoClose}
          />
          <MetadataModal
            key="metadata-modal"
            showModal={showMetadataModal}
            label={la}
            metadata={metadata}
            onCloseFn={this.handleMetadataClose}
            elementId={id}
            elementType="Collection"
          />
        </Col>
      </Row>
    );
  }
}
