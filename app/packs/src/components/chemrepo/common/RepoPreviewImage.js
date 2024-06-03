/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import ImageModal from 'src/components/common/ImageModal';
import RepoSpectraBtn from 'src/components/chemrepo/common/RepoSpectra';
import RepoNmriumBtn from 'src/components/chemrepo/common/RepoNmrium';
import spc from 'src/components/chemrepo/spc-utils';

function getClassName(nmrium, spectra) {
  const sClass = spectra ? 'btn1' : 'btn0';
  let nClass = 'btn0';
  if (nmrium && spectra) {
    nClass = 'btn2';
  } else if (nmrium) {
    nClass = 'btn1';
  }
  return { nmrium: nClass, spectra: sClass };
}

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
  const spcs = spc(element, analysis);
  const btnClass = getClassName(spcs.nmrium.hasData, spcs.spectra.hasData);
  return (
    <div className="preview">
      <div className={btnClass.nmrium} {...imageStyle}>
        {spcs.nmrium.hasData ? (
          <RepoNmriumBtn
            element={element}
            spc={spcs.nmrium.data}
            isPublic={isPublic}
          />
        ) : null}
      </div>
      <div className={btnClass.spectra} {...imageStyle}>
        {spcs.spectra.hasData ? (
          <RepoSpectraBtn
            element={element}
            spc={spcs.spectra.data}
            isLogin
            isPublic={isPublic}
          />
        ) : null}
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
