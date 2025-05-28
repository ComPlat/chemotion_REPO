/* eslint-disable react/forbid-prop-types */
import React, { useMemo } from 'react';
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

// Constants
const TOOLTIP_IDS = {
  DESCRIPTION: '_tip_dataset_description',
  QUILL_VIEWER: '_tip_dataset_quill_viewer',
};

/**
 * Reusable component for clickable content with clipboard functionality
 * @param {Object} props - Component properties
 * @param {string} props.tooltipId - ID for the tooltip
 * @param {Function} props.getClipboardText - Function that returns text to copy
 * @param {React.ReactNode} props.children - Content to display
 * @param {string} props.className - Additional CSS class
 * @param {Object} props.style - Additional inline styles
 * @returns {React.ReactElement} Clickable component
 */
const ClickableClipboardContent = ({
  tooltipId,
  getClipboardText,
  children,
  className = '',
  style = {},
}) => {
  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(getClipboardText());
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(getClipboardText());
      }
    }
  };

  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id={tooltipId}>copy to clipboard</Tooltip>}
    >
      <div
        className={className}
        tabIndex={0}
        role="button"
        onClick={handleCopy}
        onKeyDown={handleKeyDown}
        style={style}
      >
        {children}
      </div>
    </OverlayTrigger>
  );
};

ClickableClipboardContent.propTypes = {
  tooltipId: PropTypes.string.isRequired,
  getClipboardText: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

ClickableClipboardContent.defaultProps = {
  className: '',
  style: {},
};

const descriptionSection = val => {
  return !val || val === '' ? null : (
    <div>
      <b style={{ fontSize: '14px' }}>Description</b>
      <div className="desc small-p expand-p">
        <ClickableClipboardContent
          tooltipId={TOOLTIP_IDS.DESCRIPTION}
          getClipboardText={() => val}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {val}
        </ClickableClipboardContent>
      </div>
    </div>
  );
};

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
    const memoizedData = useMemo(() => {
      const content = analysis?.extended_metadata?.content || [];
      const kind = (analysis.extended_metadata?.kind || '')
        .split('|')
        .pop()
        .trim();
      const previewImg = previewContainerImage(analysis);
      const insText = instrumentText(analysis);
      const anaDescription = analysis?.description || '';

      return { content, kind, previewImg, insText, anaDescription };
    }, [analysis]);

    const { content, kind, previewImg, insText, anaDescription } = memoizedData;

    // Common props for comment components
    const commentProps = {
      id: analysis.id,
      type,
      pageId,
      pageType,
    };

    const doiLink = <AnalysisDOILink analysis={analysis} isPublic={isPublic} />;
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
                id={commentProps.id}
                type={commentProps.type}
                pageId={commentProps.pageId}
                pageType={commentProps.pageType}
                userInfo={userInfo}
                title={kind}
                element={element}
              />
              &nbsp;
              <RepoUserComment
                isLogin={isLogin}
                id={commentProps.id}
                type={commentProps.type}
                pageId={commentProps.pageId}
                pageType={commentProps.pageType}
                isPublished={isPublic}
              />
            </div>
            {doiLink}
            {crdLink}
          </div>
          <div className="desc small-p expand-p">
            <ClickableClipboardContent
              tooltipId={TOOLTIP_IDS.QUILL_VIEWER}
              getClipboardText={() => contentToText(content)}
              className="repo-quill-viewer"
            >
              <Quill2Viewer value={content} />
            </ClickableClipboardContent>
          </div>
          {descriptionSection(anaDescription)}
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
