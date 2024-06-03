/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { contentToText } from 'src/utilities/quillFormat';
import { instrumentText } from 'src/utilities/ElementUtils';
import { previewContainerImage } from 'src/utilities/imageHelper';
import AnalysisDOILink from 'src/components/chemrepo/analysis/AnalysisDOILink';
import AnalysisIDLink from 'src/components/chemrepo/analysis/AnalysisIDLink';
import MolViewerListBtn from 'src/components/viewer/MolViewerListBtn';
import Quill2Viewer from 'src/components/QuillViewer';
import RepoContainerDatasets from 'src/repoHome/RepoContainerDatasets';
import RepoPreviewImage from 'src/components/chemrepo/common/RepoPreviewImage';
import RepoPublicComment from 'src/components/chemrepo/common/RepoPublicComment';
import RepoUserComment from 'src/components/chemrepo/common/RepoUserComment';

/**
 * Reusable component to render published analysis panel
 * This component displays analysis details including header and datasets
 * @param {Object} props - Component properties
 * @returns {React.ReactElement} AnalysisRenderer component
 */
const AnalysisRenderer = ({
  analysis,
  isPublic,
  userInfo,
  isLogin,
  isReviewer,
  pageId,
  type,
  pageType,
  element,
}) => {
  /**
   * Renders the header section of the analysis panel
   * @returns {React.ReactElement} Header section
   */
  const renderHeader = () => {
    const content = analysis?.extended_metadata?.content || [];
    const previewImg = previewContainerImage(analysis);
    const kind = (analysis.extended_metadata?.kind || '')
      .split('|')
      .pop()
      .trim();

    const doiLink = <AnalysisDOILink analysis={analysis} isPublic={isPublic} />;
    const insText = instrumentText(analysis);
    const crdLink = (
      <AnalysisIDLink
        analysis={analysis}
        isPublic={isPublic}
        insText={insText}
      />
    );

    return (
      <div className="repo-analysis-header">
        <RepoPreviewImage
          key={`preview-${analysis.id}`}
          element={element}
          analysis={analysis}
          isLogin={isLogin}
          isPublic={isPublic}
          previewImg={previewImg}
          title={kind}
        />
        <div className="abstract">
          <div className="lower-text">
            <div className="sub-title">
              <b>{kind}</b>&nbsp;
              <MolViewerListBtn
                el={element}
                container={analysis}
                isPublic={isPublic}
                disabled={false}
              />
              <RepoPublicComment
                isReviewer={isReviewer}
                id={analysis.id}
                type={type}
                pageId={pageId}
                pageType={pageType}
                userInfo={userInfo}
                title={kind}
              />
              &nbsp;
              <RepoUserComment
                isLogin={isLogin}
                id={analysis.id}
                type={type}
                pageId={pageId}
                pageType={pageType}
                isPublished={isPublic}
              />
            </div>
            {doiLink}
            {crdLink}
          </div>
          <div className="desc small-p expand-p">
            <OverlayTrigger
              placement="bottom"
              overlay={
                <Tooltip id="_tip_dataset_quill_viewer">
                  copy to clipboard
                </Tooltip>
              }
            >
              <div
                className="repo-quill-viewer"
                tabIndex={0}
                role="button"
                onClick={() => {
                  navigator.clipboard.writeText(contentToText(content));
                }}
              >
                <Quill2Viewer value={content} />
              </div>
            </OverlayTrigger>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {renderHeader()}
      <div>
        <b>Datasets</b>
        <RepoContainerDatasets container={analysis} isPublic={isPublic} />
      </div>
    </div>
  );
};

AnalysisRenderer.propTypes = {
  analysis: PropTypes.object.isRequired,
  type: PropTypes.string.isRequired,
  userInfo: PropTypes.string,
  isPublic: PropTypes.bool,
  isLogin: PropTypes.bool,
  isReviewer: PropTypes.bool,
  pageId: PropTypes.number,
  pageType: PropTypes.string,
  element: PropTypes.object,
};

AnalysisRenderer.defaultProps = {
  userInfo: '',
  isPublic: true,
  isLogin: false,
  isReviewer: false,
  pageId: null,
  pageType: 'reactions',
  element: null,
};

export default AnalysisRenderer;
