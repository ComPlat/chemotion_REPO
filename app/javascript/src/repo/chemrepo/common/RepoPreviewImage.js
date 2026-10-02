/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import ImageModal from 'src/components/common/ImageModal';
import RepoSpectraBtn from 'src/repo/chemrepo/common/RepoSpectra';
import RepoNmriumBtn from 'src/repo/chemrepo/common/RepoNmrium';
import spc from 'src/repo/chemrepo/spc-utils';

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
  const { element, analysis, isLogin, isPublic, attachment, title } = props;
  const hasAttachment = !!attachment;
  const imageStyle = hasAttachment ? { style: { cursor: 'default' } } : { style: { cursor: 'default', display: 'none' } };
  const spcs = spc(element, analysis);
  const btnClass = getClassName(spcs.nmrium.hasData, spcs.spectra.hasData);
  return (
    <div className="preview">
      <div className={btnClass.nmrium} {...imageStyle}>
        {spcs.nmrium.hasData ? (
          <RepoNmriumBtn spc={spcs.nmrium.data} isPublic={isPublic} />
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
        attachment={attachment}
        popObject={{ title }}
        placement="left"
      />
    </div>
  );
}

RepoPreviewImage.propTypes = {
  element: PropTypes.object,
  analysis: PropTypes.object,
  isLogin: PropTypes.bool,
  isPublic: PropTypes.bool,
  attachment: PropTypes.object,
  title: PropTypes.string,
};

RepoPreviewImage.defaultProps = { isLogin: false, isPublic: false, attachment: null, title: '' };

export default RepoPreviewImage;
