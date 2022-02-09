import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';
import RepoHowToDragSource from '../RepoHowToDragSource';
import RepoHowToDropTarget from '../RepoHowToDropTarget';
import EditorRichText from '../RepoHowTo/EditorRichText';
import EditorImage from '../RepoHowTo/EditorImage';
import { FaBtn } from './EditorBtn';

export default class EditorStelle extends Component {
  handleChange(t, e) {
    this.props.onChange(t, e, this.props.sid);
  }

  renderComponent() {
    let label = '';
    let component = <div />;
    switch (this.props.stelle.art) {
      case 'txt':
        label = (<div className="editor-stelle">Text Section</div>);
        component =
          (<EditorRichText
            quill={this.props.stelle.quill}
            onChange={(t, e) => this.handleChange(t, e)}
            sid={this.props.sid}
            editor_type={this.props.editor_type}
          />);
        break;
      case 'img':
        label = (<div className="editor-stelle">Image Section</div>);
        component =
          (<EditorImage
            pfad={this.props.stelle.pfad}
            onChange={(t, e) => this.handleChange(t, e)}
            sid={this.props.sid}
            editor_type={this.props.editor_type}
          />);
        break;
      default:
    }

    return (
      <div>
        {label}
        {component}
      </div>
    );
  }

  render() {
    return (
      <Row>
        <Col md={12} sm={12}>
          <RepoHowToDropTarget
            sid={this.props.sid}
            stelle={this.props.stelle}
            onDrop={this.props.onDrop}
          />
        </Col>
        <Col md={12} sm={12}>
          <div className="pull-right">
            <FaBtn tip="remove this section" txt="" fa="fa fa-trash-o" bsStyle="danger" bsSize="xsmall" onClick={() => this.props.onRemove(this.props.sid)} />
          </div>
          <RepoHowToDragSource sid={this.props.sid} stelle={this.props.stelle} />
          {this.renderComponent()}
        </Col>
      </Row>
    );
  }
}

EditorStelle.propTypes = {
  sid: PropTypes.number.isRequired,
  stelle: PropTypes.shape({
    art: PropTypes.string,
    quill: PropTypes.object,
    pfad: PropTypes.string,
  }).isRequired,
  onDrop: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  editor_type: PropTypes.string.isRequired,
};

