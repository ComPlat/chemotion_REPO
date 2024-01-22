/* eslint-disable no-unused-vars */
/* eslint-disable react/require-default-props */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import ImageModal from 'src/components/common/ImageModal';
import RepoSpectraBtn from 'src/components/chemrepo/common/RepoSpectra';

function RepoPreviewImage(props) {
  const { element, analysis, isLogin, isPublic, previewImg, title } = props;
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
        <RepoSpectraBtn
          element={element}
          analysis={analysis}
          isLogin
          isPublic={isPublic}
        />
      </div>
      <ImageModal
        imageStyle={imageStyle}
        hasPop={hasPop}
        previewObject={{ src: previewImg }}
        popObject={{
          title,
          src: previewImg,
          fetchNeeded,
          fetchId,
          fetchFilename,
        }}
      />
    </div>
  );
}

RepoPreviewImage.propTypes = {
  element: PropTypes.object,
  analysis: PropTypes.object,
  isLogin: PropTypes.bool,
  isPublic: PropTypes.bool,
  previewImg: PropTypes.string.isRequired,
  title: PropTypes.string,
};

RepoPreviewImage.defaultProps = { isLogin: false, isPublic: false, title: '' };

export default RepoPreviewImage;
