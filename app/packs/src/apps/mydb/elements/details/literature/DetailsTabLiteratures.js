/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ListGroup, ListGroupItem, Button, Row, Col, Tooltip
} from 'react-bootstrap';
import uuid from 'uuid';
import Immutable from 'immutable';
import {
  Citation, doiValid, sanitizeDoi, groupByCitation, AddButton, LiteratureInput, LiteralType
} from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import ResearchPlan from 'src/models/ResearchPlan';
import CellLine from 'src/models/cellLine/CellLine';
import Literature from 'src/models/Literature';
import LiteraturesFetcher from 'src/fetchers/LiteraturesFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import CitationPanel from 'src/apps/mydb/elements/details/literature/CitationPanel';
import { createCitationTypeMap } from 'src/apps/mydb/elements/details/literature/CitationTools';

// import CitationTable from 'src/apps/mydb/elements/details/reactions/analysesTab/CitationTable';

const Cite = require('citation-js');
require('@citation-js/plugin-isbn');

const notification = (message) => ({
  title: 'Add Literature',
  message,
  level: 'error',
  dismissible: 'button',
  autoDismiss: 5,
  position: 'tr',
  uid: uuid.v4()
});

const warningNotification = (message) => ({
  title: '',
  message,
  level: 'warning',
  dismissible: 'button',
  autoDismiss: 5,
  position: 'tr',
  uid: uuid.v4()
});

const clipboardTooltip = () => (
  <Tooltip id="assign_button">copy to clipboard</Tooltip>
);

const sameConseqLiteratureId = (citations, sortedIds, i) => {
  if (i === 0) { return false; }
  const a = citations.get(sortedIds[i])
  const b = citations.get(sortedIds[i-1])
  return (a.id === b.id)
};

const checkElementStatus = (element) => {
  const type = element.type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (element.isNew) {
    NotificationActions.add(notification(`Create ${type} first.`));
    return false;
  }
  const isPub = !!(element.publication && element.publication.state === 'completed');
  if (isPub) {
    NotificationActions.add(notification('Already published. This data can not be changed.'));
    return false;
  }
  return true;
};

export default class DetailsTabLiteratures extends Component {
  constructor(props) {
    super(props);

    this.state = {
      literature: this.createEmptyLiterature(this.props.element.type),
      literatures: new Immutable.Map(),
      sortedIds: [],
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleTypeUpdate = this.handleTypeUpdate.bind(this);
    this.handleLiteratureAdd = this.handleLiteratureAdd.bind(this);
    this.handleLiteratureRemove = this.handleLiteratureRemove.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
    this.fetchISBNMetadata = this.fetchISBNMetadata.bind(this);
    this.fetchMetadata = this.fetchMetadata.bind(this);
  }

  componentDidMount() {
    const { literatures, element } = this.props;
    if (literatures && literatures.size > 0) {
      const sortedIds = groupByCitation(literatures);
      this.setState((prevState) => ({
        ...prevState,
        literatures,
        sortedIds,
        sorting: 'literature_id'
      }));
    } else {
      LiteraturesFetcher.fetchElementReferences(element).then((fetchedLiterature) => {
        const sortedIds = groupByCitation(fetchedLiterature);
        this.setState((prevState) => ({
          ...prevState,
          literatures: fetchedLiterature,
          sortedIds,
          sorting: 'literature_id'
        }));
      });
    }
  }

  createEmptyLiterature(elementType) {
    const literature = Literature.buildEmpty();
    literature.litype = Object.keys(createCitationTypeMap(elementType))[0];
    return literature;
  }

  handleInputChange(type, event) {
    const { literature } = this.state;
    const { value } = event.target;
    literature[type] = value;
    this.setState((prevState) => ({ ...prevState, literature }));
  }

  handleTypeUpdate(updId, rType) {
    const { element } = this.props;
    if (!checkElementStatus(element)) { return; }
    LoadingActions.start();
    const params = {
      element_id: element.id, element_type: element.type, id: updId, litype: rType
    };
    LiteraturesFetcher.updateReferenceType(params)
      .then((literatures) => {
        this.setState(
          {
            literatures,
            sortedIds: groupByCitation(literatures),
            sorting: 'literature_id'
          },
          LoadingActions.stop()
        );
      });
  }

  handleLiteratureRemove(literature) {
    const { element } = this.props;
    if (!checkElementStatus(element)) { return; }
    if (Number.isNaN(element.id) && element.type === 'reaction') {
      this.setState((prevState) => ({
        ...prevState,
        literatures: prevState.literatures.delete(literature.literal_id),
        sortedIds: groupByCitation(prevState.literatures.delete(literature.literal_id))
      }));
      if (element.type === 'reaction') {
        element.literatures = element.literatures && element.literatures.delete(literature.literal_id);
        this.setState({
          reaction: element
        });
      }
    } else {
      LiteraturesFetcher.deleteElementReference({ element, literature })
        .then(() => {
          this.setState((prevState) => ({
            ...prevState,
            literatures: prevState.literatures.delete(literature.literal_id),
            sortedIds: groupByCitation(prevState.literatures.delete(literature.literal_id))
          }));
        })
        .then(() => { NotificationActions.add(warningNotification('Literature entry successfully removed')); })
        .catch((errorMessage) => {
          NotificationActions.add(notification(errorMessage.error));
        });
    }
  }

  handleLiteratureAdd(literature) {
    const { element } = this.props;
    if (!checkElementStatus(element)) { return; }
    const {
      doi, url, title, isbn
    } = literature;
    if (element.isNew === true && element.type === 'reaction'
      && element.literatures && element.literatures.size > 0) {
      const newlit = {
        ...literature,
        doi: sanitizeDoi(doi),
        url: url.trim().replace(/ +/g, ' '),
        title: title.trim().replace(/ +/g, ' '),
        isbn: isbn.trim()
      };
      const objliterature = new Literature(newlit);
      element.literatures = element.literatures.set(objliterature.id, objliterature);
      this.setState((prevState) => ({
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
          title: title.trim().replace(/ +/g, ' '),
          isbn: isbn.trim()
        },
      }).then((literatures) => {
        this.setState(() => ({
          literature: this.createEmptyLiterature(this.props.element.type),
          literatures,
          sortedIds: groupByCitation(literatures),
          sorting: 'literature_id'
        }));
      }).catch((errorMessage) => {
        NotificationActions.add(notification(errorMessage.error));
        this.setState({ literature: this.createEmptyLiterature(this.props.element.type) });
      });
    }
  }

  fetchMetadata() {
    const { element } = this.props;
    const { literature } = this.state;
    if (!checkElementStatus(element)) { return; }

    if (doiValid(literature.doi_isbn)) {
      this.fetchDOIMetadata(literature.doi_isbn);
    } else {
      this.fetchISBNMetadata(literature.doi_isbn);
    }
  }

  fetchDOIMetadata(doi) {
    NotificationActions.removeByUid('literature');
    LoadingActions.start();
    Cite.async(sanitizeDoi(doi)).then((json) => {
      if (json.data && json.data.length > 0) {
        const data = json.data[0];
        const citation = new Cite(data);
        // this.setState((prevState) => ({
        //   ...prevState,
        //   literature: new Literature({
        //     ...prevState.literature,
        //     doi,
        //     title: data.title || '',
        //     year: (data && data.issued && data.issued['date-parts'][0]) || '',
        //     refs: { citation, bibtex: citation.format('bibtex'), bibliography: json.format('bibliography') }
        //   })
        // }));
        const { literature } = this.state;
        const newLiterature = new Literature({
          ...literature,
          doi,
          title: data.title || '',
          year: (data && data.issued && data.issued['date-parts'][0]) || '',
          refs: { citation, bibtex: citation.format('bibtex'), bibliography: json.format('bibliography') }
        });
        this.handleLiteratureAdd(newLiterature);
      }
    }).catch((errorMessage) => {
      NotificationActions.add(notification(`unable to fetch metadata for this doi: ${doi}, error: ${errorMessage}`));
    }).finally(() => {
      LoadingActions.stop();
    });
  }

  fetchISBNMetadata(isbn) {
    NotificationActions.removeByUid('literature');
    LoadingActions.start();
    Cite.async(isbn).then((json) => {
      if (json.data && json.data.length > 0) {
        const data = json.data[0];
        this.setState((prevState) => ({
          ...prevState,
          literature: {
            ...prevState.literature,
            isbn,
            title: data.title || '',
            year: (data && data.issued && data.issued['date-parts'][0]) || '',
            url: (data && data.URL) || '',
            refs: { citation: json, bibtex: json.format('bibtex'), bibliography: json.format('bibliography') }
          }
        }));
        const { literature } = this.state;
        this.handleLiteratureAdd(literature);
      }
    }).catch((errorMessage) => {
      NotificationActions.add(notification(`unable to fetch metadata for this ISBN: ${isbn}, error: ${errorMessage}`));
    }).finally(() => {
      LoadingActions.stop();
    });
  }

  render() {
    const { literature, literatures, sortedIds } = this.state;
    const { currentUser } = UserStore.getState();
    const isInvalidDoi = !(doiValid(literature.doi_isbn || ''));
    const isInvalidIsbn = !(/^[0-9]([0-9]|-(?!-))+$/.test(literature.doi_isbn || ''));
    const { readOnly } = this.props;
    const citationTypeMap = createCitationTypeMap(this.props.element.type);
    return (
      <ListGroup fill="true">
        <ListGroupItem style={{ border: 'unset' }}>
          <Row>
            <Col md={8} style={{ paddingRight: 0 }}>
              <LiteratureInput
                handleInputChange={this.handleInputChange}
                literature={literature}
                field="doi_isbn"
                readOnly={readOnly}
                placeholder="DOI: 10.... or  http://dx.doi.org/10... or 10. ... or ISBN: 978 ..."
              />
            </Col>
            <Col md={3} style={{ paddingRight: 0 }}>
              <LiteralType
                handleInputChange={this.handleInputChange}
                disabled={readOnly}
                val={literature.litype}
                citationMap={citationTypeMap}
              />
            </Col>
            <Col md={1} style={{ paddingRight: 0 }}>
              <Button
                bsStyle="success"
                bsSize="small"
                style={{ marginTop: 2 }}
                onClick={this.fetchMetadata}
                title="fetch metadata for this doi or ISBN(open services) and add citation to selection"
                disabled={(isInvalidDoi && isInvalidIsbn) || readOnly}
              >
                <i className="fa fa-plus" aria-hidden="true" />
              </Button>
            </Col>
            <Col md={12} style={{ paddingRight: 0 }}>
              <Citation literature={literature} />
            </Col>
            <Col md={7} style={{ paddingRight: 0 }}>
              <LiteratureInput
                handleInputChange={this.handleInputChange}
                literature={literature}
                field="title"
                readOnly={readOnly}
                placeholder="Title..."
              />
            </Col>
            <Col md={4} style={{ paddingRight: 0 }}>
              <LiteratureInput
                handleInputChange={this.handleInputChange}
                literature={literature}
                field="url"
                readOnly={readOnly}
                placeholder="URL..."
              />
            </Col>
            <Col md={1}>
              <AddButton
                readOnly={readOnly}
                onLiteratureAdd={this.handleLiteratureAdd}
                literature={literature}
              />
            </Col>
          </Row>
        </ListGroupItem>
        <ListGroupItem style={{ border: 'unset' }}>
          {
            Object.keys(citationTypeMap)
              .map((e) => (
                <CitationPanel
                  key={`_citation_panel_${e}`}
                  title={e}
                  fnDelete={this.handleLiteratureRemove}
                  sortedIds={sortedIds}
                  rows={literatures}
                  readOnly={readOnly}
                  uid={currentUser && currentUser.id}
                  fnUpdate={this.handleTypeUpdate}
                  citationMap={citationTypeMap[e]}
                  typeMap={citationTypeMap}
                />
              ))
          }
        </ListGroupItem>
      </ListGroup>
    );
  }
}

DetailsTabLiteratures.propTypes = {
  element: PropTypes.oneOfType([
    PropTypes.instanceOf(ResearchPlan),
    PropTypes.instanceOf(Reaction),
    PropTypes.instanceOf(CellLine),
    PropTypes.instanceOf(Sample)
  ]).isRequired,
  literatures: PropTypes.array,
  readOnly: PropTypes.bool
};

DetailsTabLiteratures.defaultProps = {
  readOnly: false,
  literatures: []
};
