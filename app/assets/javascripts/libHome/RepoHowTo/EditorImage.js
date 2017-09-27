import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';

export default class EditorImage extends Component {
  handleDrop(files) {
    if (files && files.length > 0) {
      this.props.onChange('pfad', files);
    }
  }
  render() {
    return (
      <div style={{ backgroundColor: 'white' }}>
        <Dropzone
          accept="image/*"
          multiple={false}
          onDrop={files => this.handleDrop(files)}
          className="dropzone"
        >
          {
            this.props.pfad !== '' ?
              <div className="image-container">
                <img src={`/${this.props.editor_type}/${this.props.pfad}`} alt="" />
              </div>
              : <p>Drop Files, or Click to Select.</p>
          }
        </Dropzone>
      </div>
    );
  }
}

EditorImage.propTypes = {
  pfad: PropTypes.string,
  onChange: PropTypes.func,
  editor_type: PropTypes.string,
};

EditorImage.defaultProps = {
  pfad: '',
  onChange: null,
  editor_type: '',
};
