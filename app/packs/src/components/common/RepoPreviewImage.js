import React from 'react';
import PropTypes from 'prop-types';
import ImageModal from './ImageModal';
import RepoSpectraBtn from './RepoSpectra';

const RepoPreviewImage = (props) => {
  const {
    element, analysis, isLogin, previewImg, title
  } = props;
  let hasPop = true;
  let fetchNeeded = false;
  let fetchId = 0;
  let fetchFilename = '';
  let imageStyle = { style: { cursor: 'default' } };
  if (previewImg.startsWith('data:image')) {
    fetchNeeded = true;
    fetchId = analysis.preview_img.id;
    fetchFilename = analysis.preview_img.filename;
  } else {
    hasPop = false;
    imageStyle = { style: { cursor: 'default', display: 'none' } };
  }
  return (
    <div className="preview">
      <div className="spectra" {...imageStyle}>
        <RepoSpectraBtn element={element} analysis={analysis} isLogin={isLogin} />
      </div>
      <ImageModal
        imageStyle={imageStyle}
        hasPop={hasPop}
        previewObject={{ src: previewImg }}
        popObject={{
          title, src: previewImg, fetchNeeded, fetchId, fetchFilename
        }}
      />
    </div>
  );
};

RepoPreviewImage.propTypes = {
  element: PropTypes.object,
  analysis: PropTypes.object,
  isLogin: PropTypes.bool,
  previewImg: PropTypes.string.isRequired,
  title: PropTypes.string
};

RepoPreviewImage.defaultProps = {
  isLogin: false,
  title: ''
};

export default RepoPreviewImage;
