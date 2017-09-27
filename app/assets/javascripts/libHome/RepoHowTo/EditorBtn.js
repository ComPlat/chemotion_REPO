
import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import uuid from 'uuid';

const fa = klass => (<i className={klass} aria-hidden="true" />);
const FaBtn = props => (
  <OverlayTrigger placement={props.place} overlay={<Tooltip id={uuid.v4()}>{props.tip}</Tooltip>}>
    <Button bsStyle={props.bsStyle} bsSize={props.bsSize} onClick={props.onClick} >
      {props.txt}&nbsp;{fa(props.fa)}
    </Button>
  </OverlayTrigger>
);
FaBtn.propTypes = {
  tip: PropTypes.string.isRequired,
  txt: PropTypes.string.isRequired,
  fa: PropTypes.string,
  place: PropTypes.string,
  bsStyle: PropTypes.string,
  bsSize: PropTypes.string,
  onClick: PropTypes.func,
};
FaBtn.defaultProps = {
  fa: '',
  place: 'top',
  bsStyle: 'primary',
  bsSize: 'small',
  onClick: null,
};

const EditorBtn = props => (
  <div className="editor-btn">
    <FaBtn tip="Add Text Section" txt="Add" fa="fa fa-file-text-o" onClick={() => props.onClick('txt')} />
    <FaBtn tip="Add Image Section" txt="Add" fa="fa fa-picture-o" onClick={() => props.onClick('img')} />
  </div>
);

EditorBtn.propTypes = {
  onClick: PropTypes.func,
};

EditorBtn.defaultProps = {
  onClick: null,
};

const EditorBaseBtn = props => (
  <div className="editor-btn">
    {/* <FaBtn tip="Preview" txt="Preview" bsStyle="info" onClick={onClick} /> */}
    <FaBtn tip="Save" txt="Save" bsStyle="success" onClick={() => props.onClick('save')} />
    <FaBtn tip="Delete" txt="Delete" bsStyle="danger" onClick={() => props.onClick('delete')} />
  </div>
);

EditorBaseBtn.propTypes = {
  onClick: PropTypes.func,
};

EditorBaseBtn.defaultProps = {
  onClick: null,
};

module.exports = {
  FaBtn,
  EditorBtn,
  EditorBaseBtn,
};
