import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  ListGroup,
  ListGroupItem,
  Button,
  Row,
  Col,
  Glyphicon,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import Immutable from 'immutable';
import Cite from 'citation-js';
import {
  Citation,
  CitationUserRow,
  doiValid,
  sanitizeDoi,
  groupByCitation,
  AddButton,
  DoiInput,
  UrlInput,
  TitleInput,
  literatureContent
} from './LiteratureCommon';
import Sample from './models/Sample';
import Reaction from './models/Reaction';
import ResearchPlan from './models/ResearchPlan';
import Literature from './models/Literature';
import LiteraturesFetcher from './fetchers/LiteraturesFetcher';
import UserStore from './stores/UserStore';
import NotificationActions from './actions/NotificationActions';



const clipboardTooltip = () => {
  return (
    <Tooltip id="assign_button">copy to clipboard</Tooltip>
  )
}

const CitationTable = ({ rows, sortedIds, userId, removeCitation }) => (
  <Table>
    <thead><tr>
      <th width="90%"></th>
      <th width="10%"></th>
    </tr></thead>
    <tbody>
      {sortedIds.map((id, k, ids) => {
        const citation = rows.get(id)
        const prevCit = (k > 0) ? rows.get(ids[k-1]) : null
        const sameRef = prevCit && prevCit.id === citation.id
        const content = literatureContent(citation, true);
        return sameRef ? (
          <tr key={`header-${id}-${citation.id}`} className={`collapse literature_id_${citation.id}`}>
            <td className="padding-right">
              <CitationUserRow literature={citation} userId={userId} />
            </td>
            <td>
              <Button
                bsSize="small"
                bsStyle="danger"
                onClick={() => removeCitation(citation)}
              >
                <i className="fa fa-trash-o" />
              </Button>
            </td>
          </tr>
        ) : (
          <tr key={id} className={``}>
            <td className="padding-right">
              <Citation literature={citation}/>
            </td>
            <td>
              <Button
                data-toggle="collapse"
                data-target={`.literature_id_${citation.id}`}
                bsSize="sm"
              >
                <Glyphicon
                  glyph={   true  ? 'chevron-right' : 'chevron-down' }
                  title="Collapse/Uncollapse"
                  // onClick={() => this.collapseSample(sampleCollapseAll)}
                  style={{
                    // fontSize: '20px',
                    cursor: 'pointer',
                    color: '#337ab7',
                    top: 0
                  }}
                />
              </Button>
              <OverlayTrigger placement="bottom" overlay={clipboardTooltip()}>
                <Button bsSize="small" active className="clipboardBtn" data-clipboard-text={content} >
                  <i className="fa fa-clipboard"></i>
                </Button>
              </OverlayTrigger>
            </td>
          </tr>
        );
      })}
    </tbody>
  </Table>
);
CitationTable.propTypes = {
  rows: PropTypes.instanceOf(Immutable.Map),
  sortedIds: PropTypes.array,
  userId: PropTypes.number,
  removeCitation: PropTypes.func
};

CitationTable.defaultProps = {
  rows: new Immutable.Map(),
  sortedIds: [],
  userId: 0
};



const sameConseqLiteratureId = (citations, sortedIds, i) => {
  if (i === 0) { return false; }
  const a = citations.get(sortedIds[i])
  const b = citations.get(sortedIds[i-1])
  return (a.id === b.id)
};

export default class DetailsTabLiteratures extends Component {
  constructor(props) {
    super(props);
    this.state = {
      literature: Literature.buildEmpty(),
      literatures: new Immutable.Map(),
      sortedIds: [],
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.handleLiteratureRemove = this.handleLiteratureRemove.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
  }

  componentDidMount() {
    if (this.props.literatures && this.props.literatures.size > 0) {
      const sortedIds = groupByCitation(this.props.literatures);
      this.setState(prevState => ({
        ...prevState,
        literatures: this.props.literatures,
        sortedIds,
        sorting: 'literature_id'
      }));
    } else {
      LiteraturesFetcher.fetchElementReferences(this.props.element).then((literatures) => {
        const sortedIds = groupByCitation(literatures);
        this.setState(prevState => ({
          ...prevState,
          literatures,
          sortedIds,
          sorting: 'literature_id'
        }));
      });
    }
  }

  // shouldComponentUpdate(nextProps, nextState){
  //
  // }

  handleInputChange(type, event) {
    const { literature } = this.state;
    const { value } = event.target;
    switch (type) {
      case 'url':
        literature.url = value;
        break;
      case 'title':
        literature.title = value;
        break;
      case 'doi':
        literature.doi = value;
        break;
      default:
        break;
    }
    this.setState(prevState => ({ ...prevState, literature }));
  }

  handleLiteratureRemove(literature) {
    const { element } = this.props;
    if (isNaN(element.id) && element.type === 'reaction') {
      this.setState(prevState => ({
        ...prevState,
        literatures: prevState.literatures.delete(literature.literal_id),
        sortedIds: groupByCitation(prevState.literatures.delete(literature.literal_id))
      }));
      if (element.type === 'reaction') {
        element.literatures = element.literatures && element.literatures.delete(literature.literal_id);
        this.setState({
          reaction: element
        })
      }
    } else {
      LiteraturesFetcher.deleteElementReference({ element, literature })
        .then(() => {
          this.setState(prevState => ({
            ...prevState,
            literatures: prevState.literatures.delete(literature.literal_id),
            sortedIds: groupByCitation(prevState.literatures.delete(literature.literal_id))
          }));
        });
    }
  }

  handleLiteratureAdd(literature) {
    const { element } = this.props;
    const { doi, url, title } = literature;
    if (element.isNew === true && element.type === 'reaction'
    && element.literatures && element.literatures.size > 0) {
      const newlit = {
        ...literature,
        doi: sanitizeDoi(doi),
        url: url.trim().replace(/ +/g, ' '),
        title: title.trim().replace(/ +/g, ' ')
      };
      const objliterature = new Literature(newlit);
      element.literatures = element.literatures.set(objliterature.id, objliterature);
      this.setState(prevState => ({
        ...prevState,
        literature: Literature.buildEmpty(),
        literatures: prevState.literatures.set(objliterature.id, objliterature),
        sortedIds: groupByCitation(prevState.literatures.set(objliterature.id, objliterature))
      }));
    } else {
      LiteraturesFetcher.postElementReference({
        element,
        literature: {
          ...literature,
          doi: sanitizeDoi(doi),
          url: url.trim().replace(/ +/g, ' '),
          title: title.trim().replace(/ +/g, ' ')
        },
      }).then((literatures) => {
        this.setState(() => ({
          literature: Literature.buildEmpty(),
          literatures,
          sortedIds: groupByCitation(literatures),
          sorting: 'literature_id'
        }));
      }).catch((errorMessage) => {
        const notification = {
          title: 'Add Literature',
          message: errorMessage.error,
          level: 'error',
          dismissible: 'button',
          autoDismiss: 5,
          position: 'tr',
          uid: 'literature'
        };
        NotificationActions.add(notification);
        this.setState({ literature: Literature.buildEmpty() });
      });
    }
  }

  fetchDOIMetadata() {
    const { doi } = this.state.literature;
    NotificationActions.removeByUid('literature');
    Cite.inputAsync(sanitizeDoi(doi)).then((json) => {
      if (json[0]) {
        const citation = new Cite(json[0]);
        const { title, year } = json[0];
        this.setState(prevState => ({
          ...prevState,
          literature: {
            ...prevState.literature,
            title,
            year,
            refs: {
              citation,
              bibtex: citation.format('bibtex')
            }
          }
        }));
        this.handleLiteratureAdd(this.state.literature);
      }
    }).catch((errorMessage) => {
      const notification = {
        title: 'Add Literature',
        message: `unable to fetch metadata for this doi: ${doi}`,
        level: 'error',
        dismissible: 'button',
        autoDismiss: 5,
        position: 'tr',
        uid: 'literature'
      };
      NotificationActions.add(notification);
    });
  }

  render() {
    const { literature, literatures, sortedIds } = this.state;
    const { currentUser } = UserStore.getState();
    return (
      <ListGroup fill="true">
        <ListGroupItem>
          <CitationTable rows={literatures} sortedIds={sortedIds} removeCitation={this.handleLiteratureRemove} userId={currentUser && currentUser.id} />
        </ListGroupItem>
        <ListGroupItem>
          <Row>
            <Col md={11} style={{ paddingRight: 0 }}>
              <DoiInput handleInputChange={this.handleInputChange} literature={literature} />
            </Col>
            <Col md={1} style={{ paddingRight: 0 }}>
              <Button
                bsStyle="success"
                bsSize="small"
                style={{ marginTop: 2 }}
                onClick={this.fetchDOIMetadata}
                title="fetch metadata for this doi and add citation to selection"
                disabled={!doiValid(literature.doi)}
              >
                <i className="fa fa-plus" />
              </Button>
            </Col>
            <Col md={12} style={{ paddingRight: 0 }}>
              <Citation literature={literature} />
            </Col>
            <Col md={7} style={{ paddingRight: 0 }}>
              <TitleInput handleInputChange={this.handleInputChange} literature={literature} />
            </Col>
            <Col md={4} style={{ paddingRight: 0 }}>
              <UrlInput handleInputChange={this.handleInputChange} literature={literature} />
            </Col>
            <Col md={1}>
              <AddButton onLiteratureAdd={this.handleLiteratureAdd} literature={literature} />
            </Col>

          </Row>
        </ListGroupItem>
      </ListGroup>
    );
  }
}

DetailsTabLiteratures.propTypes = {
  element: PropTypes.oneOfType([
    PropTypes.instanceOf(ResearchPlan),
    PropTypes.instanceOf(Reaction),
    PropTypes.instanceOf(Sample)
  ]).isRequired,
  literatures: PropTypes.array
};
