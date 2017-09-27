import React, { Component } from 'react';
import PropTypes from 'prop-types';
import QuillEditor from '../../components/QuillEditor';

export default class EditorRichText extends Component {
  handleChange(e) {
    this.props.onChange('quill', e);
  }
  render() {
    return (
      <div style={{ backgroundColor: 'white' }}>
        <QuillEditor
          value={this.props.quill}
          onChange={e => this.handleChange(e)}
          extraToolbarOptions={[['link'], [{ align: '' }, { align: 'center' }, { align: 'right' }, { align: 'justify' }]]}
        />
      </div>
    );
  }
}

EditorRichText.propTypes = {
  quill: PropTypes.object,
  onChange: PropTypes.func,
};

EditorRichText.defaultProps = {
  quill: null,
  onChange: null,
};
