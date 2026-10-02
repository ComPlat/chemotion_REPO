
import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup, Tooltip, OverlayTrigger } from 'react-bootstrap';
import uuid from 'uuid';

const fa = klass => klass && (<i className={klass} aria-hidden="true" />);
const FaBtn = props => (
  <OverlayTrigger placement={props.place} overlay={<Tooltip id={uuid.v4()}>{props.tip}</Tooltip>}>
    <Button variant={props.variant} size={props.size} onClick={props.onClick} >
      <span className="d-flex align-items-center">
        {fa(props.fa) && <span>{fa(props.fa)}</span>}{props.txt && <span>{props.txt}</span>}
      </span>
    </Button>
  </OverlayTrigger>
);

FaBtn.propTypes = {
  tip: PropTypes.string.isRequired,
  txt: PropTypes.string.isRequired,
  fa: PropTypes.string,
  place: PropTypes.string,
  variant: PropTypes.string,
  size: PropTypes.string,
  onClick: PropTypes.func,
};
FaBtn.defaultProps = {
  fa: '',
  place: 'top',
  variant: 'outline-dark',
  size: 'small',
  onClick: null,
};

const EditorBtn = props => (
  <ButtonGroup className="mt-2">
    <FaBtn tip="Add Text Section" txt="Add" fa="fa fa-file-text-o" onClick={() => props.onClick('txt')} size="sm" />
    <FaBtn tip="Add Image Section" txt="Add" fa="fa fa-picture-o" onClick={() => props.onClick('img')} size="sm" />
  </ButtonGroup>
);

EditorBtn.propTypes = {
  onClick: PropTypes.func,
};

EditorBtn.defaultProps = {
  onClick: null,
};

const EditorBaseBtn = props => (
  <div className="mt-2 d-flex gap-2">
    <FaBtn tip="Save" txt="Save" variant="success" onClick={() => props.onClick('save')} />
    <FaBtn tip="Delete" txt="Delete" variant="danger" onClick={() => props.onClick('delete')} />
  </div>
);

EditorBaseBtn.propTypes = {
  onClick: PropTypes.func,
};

EditorBaseBtn.defaultProps = {
  onClick: null,
};

export {
  FaBtn,
  EditorBtn,
  EditorBaseBtn,
};
