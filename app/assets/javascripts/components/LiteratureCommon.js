import React from 'react';
import PropTypes from 'prop-types';
import { Button, FormControl, OverlayTrigger, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';
import Cite from 'citation-js';
import Literature from './models/Literature';


const RefByUserInfo = ({ info }) => {
  if (typeof (info) === 'undefined' || !info || info.length === 0) {
    return (<div />);
  }
  return (
    <OverlayTrigger
      placement="bottom"
      overlay={
        <Tooltip id={`ref_by_user_${uuid.v4()}`}>
          Reference added by {Object.keys(info).map(k => info[k]).join(', ')}
        </Tooltip>
      }
    >
      <i className="fa fa-book" />
    </OverlayTrigger>
  );
};

const TitleInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('title', event)}
    placeholder="Title..."
    value={literature.title || ''}
  />
);

const UrlInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('url', event)}
    placeholder="URL..."
    value={literature.url || ''}
  />
);

const DoiInput = ({ literature, handleInputChange }) => (
  <FormControl
    type="text"
    onChange={event => handleInputChange('doi', event)}
    placeholder="DOI: 10.... or  http://dx.doi.org/10... or 10. ..."
    value={literature.doi || ''}
  />
);

const isLiteratureValid = literature => (
  literature.title !== '' && literature.url.concat(literature.doi) !== ''
);

const AddButton = ({ onLiteratureAdd, literature, title }) => (
  <Button
    bsStyle="success"
    bsSize="small"
    onClick={() => onLiteratureAdd(literature)}
    style={{ marginTop: 2 }}
    disabled={!isLiteratureValid(literature)}
    title={title}
  >
    <i className="fa fa-plus" />
  </Button>
);


AddButton.propTypes = {
  onLiteratureAdd: PropTypes.func.isRequired,
  literature: PropTypes.instanceOf(Literature).isRequired,
  title: PropTypes.string,
};

AddButton.defaultProps = {
  title: 'add citation'
};

const literatureUrl = (literature) => {
  const { url } = literature;
  if (url.match(/https?\:\/\//)) {
    return url;
  }
  return `//${url}`;
};

const sanitizeDoi = (doi) => {
  const m = doi.match(/(?:\.*10\.)(\S+)\s*/);
  return m ? '10.'.concat(m[1]) : null;
};

const doiValid = (doi) => {
  const sanitized = sanitizeDoi(doi);
  return sanitized && sanitized.match(/10.\w+\/\S+/) && true;
};

const literatureContent = (literature, onlyText) => {
  let content;
  if (literature.refs && literature.refs.citation) {
    content = (
      <div>
        {literature.refs.citation.format('bibliography', {
           format: 'text',
           template: 'apa',
        })}
      </div>
    );
  } else if (literature.refs && literature.refs.bibtex) {
    let litBibtex = literature.refs.bibtex;
    if (litBibtex.split('{').length > 1) {
      let indexData = litBibtex.split('{')[1];
      indexData = indexData.substr(0, indexData.lastIndexOf(','));
      litBibtex = litBibtex.replace(indexData, indexData.replace(/[^a-zA-Z0-9\-_]/g, ''));
    }
    const citation = new Cite(litBibtex);
    if (onlyText) {
      content = citation.format('bibliography', {
        format: 'text',
        template: 'apa',
      });
    } else {
      content = (
        <div>
          {citation.format('bibliography', {
             format: 'text',
             template: 'apa',
          })}
        </div>
      );
    }
  } else if (onlyText) {
    content = literature.title || ' ';
  } else {
    content = <span>{literature.title}{literature.year ? `, ${literature.year}` : null}</span>;
  }
  return content;
}

const Citation = ({ literature }) => {
  const { doi, url } = literature;
  const formatedDoi = doi ? `https://dx.doi.org/${sanitizeDoi(doi)}` : null;
  const link = formatedDoi || url;
  const content = literatureContent(literature);
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={link}
    >{content}
    </a>
  );
};
Citation.propTypes = {
  literature: PropTypes.any.isRequired,
};

const CitationUserRow = ({ literature, userId }) => (
  <span>added by {userId && literature.user_id === userId ? 'me' : literature.user_name}</span>
);

CitationUserRow.propTypes = {
  literature: PropTypes.instanceOf(Literature).isRequired,
  userId: PropTypes.number,
};
CitationUserRow.defaultProps = {
  userId: 0,
};

const groupByCitation = literatures => (
  literatures.keySeq().toArray().sort((i, j) => {
    // group by literature id then sort by user id
    const a = literatures.get(i);
    const b = literatures.get(j);
    return ((a.id === b.id) ? (a.user_id - b.user_id) : (a.id - b.id));
  }).reduce((acc, currentValue, i, array) => {
    // duplicate first row of each literature group
    acc.push(currentValue)
    if (i > 0) {
      const a = literatures.get(array[i]);
      const b = literatures.get(array[i - 1]);
      if (a.id !== b.id) { acc.push(currentValue); }
    } else { acc.push(currentValue); }
    return acc;
  }, [])
);

const sortByElement = literatures => (
  literatures.keySeq().toArray().sort((i, j) => {
    // group by literature id then sort by user id
    const a = literatures.get(i);
    const b = literatures.get(j);
    if (a.element_id === b.element_id && a.element_type === b.element_type) {
      return (a.id - b.id);
    } else {
      return (a.element_id - b.element_id);
    }
  }).reduce((acc, currentValue, i, array) => {
    // duplicate first row of each literature group
    acc.push(currentValue)
    if (i > 0) {
      const a = literatures.get(array[i]);
      const b = literatures.get(array[i - 1]);
      if (a.id !== b.id || ( a.element_id !== b.element_id || a.element_type !== b.element_type)) { acc.push(currentValue); }
    } else { acc.push(currentValue); }
    return acc;
  }, [])
);

const sortByReference = literatures => (
  literatures.keySeq().toArray().sort((i, j) => {
    // group by literature id then sort by user id
    const a = literatures.get(i);
    const b = literatures.get(j);
    if (a.id === b.id) {
      return ((a.element_id === b.element_id && a.element_type === b.element_type) ? (a.user_id - b.user_id) : (a.element_updated_at - b.element_updated_at));
    } else {
      return (a.id - b.id);
    }
  }).reduce((acc, currentValue, i, array) => {
    // duplicate first row of each literature group
    acc.push(currentValue)
    if (i > 0) {
      const a = literatures.get(array[i]);
      const b = literatures.get(array[i - 1]);
      if (a.id !== b.id) { acc.push(currentValue); }
    } else { acc.push(currentValue); }
    return acc;
  }, [])
);

export {
  Citation,
  CitationUserRow,
  doiValid,
  sanitizeDoi,
  literatureUrl,
  AddButton,
  isLiteratureValid,
  DoiInput,
  UrlInput,
  TitleInput,
  groupByCitation,
  sortByElement,
  sortByReference,
  literatureContent,
  RefByUserInfo
};
