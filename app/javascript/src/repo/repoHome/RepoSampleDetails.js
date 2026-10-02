import React, { Component, useState } from 'react';
import { Card, Collapse } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { ClosePanel, MoleculeInfo } from 'src/repo/repoHome/RepoCommon';
import UserStore from 'src/stores/alt/stores/UserStore';
import RepoLoadingActions from 'src/repo/actions/RepoLoadingActions';
import ReviewActions from 'src/repo/actions/ReviewActions';
import RepoReviewButtonBar from 'src/repo/repoHome/RepoReviewButtonBar';
import RepoSample from 'src/repo/repoHome/RepoSample';
import RepoConst from 'src/repo/chemrepo/common/RepoConst';
import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';
import { getFormattedISODate } from 'src/repo/chemrepo/date-utils';

// Collapsible wrapper for one published sample. Collapsed by default so the
// user can scan the two-line header (sample id + key metadata) and only expand
// the samples they care about. Keyed by sample id in the parent map, so
// navigating to a different molecule remounts it in the collapsed state.
const CollapsibleSample = ({ title, summary, defaultOpen, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  // Drop segments without a value so we never render "undefined" or a stray separator.
  const summaryItems = (summary || []).filter((item) => item && item.value);
  return (
    <div className="repo-sample-collapsible">
      <button
        type="button"
        className="repo-sample-collapse-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <i
          className={`fa fa-chevron-${open ? 'down' : 'right'} me-2`}
          aria-hidden="true"
        />
        <span className="repo-sample-collapse-heading">
          <span className="repo-sample-collapse-title">{title}</span>
          {summaryItems.length > 0 && (
            <span className="repo-sample-collapse-summary">
              {summaryItems.map((item) => (
                <span
                  key={item.label}
                  className="repo-sample-collapse-summary-item"
                >
                  <span className="repo-sample-collapse-summary-label">
                    {item.label}
                  </span>
                  <span className="repo-sample-collapse-summary-value">
                    {item.value}
                  </span>
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
      <Collapse in={open}>
        <div>{children}</div>
      </Collapse>
    </div>
  );
};

CollapsibleSample.propTypes = {
  title: PropTypes.string.isRequired,
  summary: PropTypes.arrayOf(
    PropTypes.shape({ label: PropTypes.string, value: PropTypes.string }),
  ),
  defaultOpen: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

CollapsibleSample.defaultProps = {
  summary: [],
  defaultOpen: false,
};

export default class RepoSampleDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showReviewModal: false,
      showCommentModal: false,
      commentField: '',
      originInfo: '',
    };
    this.handleReviewBtn = this.handleReviewBtn.bind(this);
    this.handleCommentBtn = this.handleCommentBtn.bind(this);
    this.handleSubmitReview = this.handleSubmitReview.bind(this);
  }

  handleReviewBtn(showReviewModal, btnAction) {
    ReviewActions.handleReviewModal(showReviewModal, btnAction);
  }

  handleCommentBtn(showCommentModal, commentField, originInfo) {
    ReviewActions.handleCommentModal(showCommentModal, 'Comment', commentField, originInfo);
  }
  handleSubmitReview(elementId, comment, action, checklist, reviewComments) {
    RepoLoadingActions.start();
    ReviewActions.reviewPublish(elementId, 'sample', comment, action, checklist, reviewComments);
  }


  render() {
    const {
      element,
      isPublished,
      canComment: propsCanComment,
      review_info,
      showComment,
      review,
      canClose,
    } = this.props;
    const { currentUser } = UserStore.getState();
    const canComment =
      currentUser?.type === RepoConst.U_TYPE.ANONYMOUS
        ? false
        : propsCanComment;

    let { buttons } = this.props;

    const history = review?.history || [];
    if (typeof (element) === 'undefined' || !element) {
      return <div />;
    }
    if (review_info?.groupleader === true && review_info?.preapproved !== true) {
      buttons = ['Comments', 'Review', 'Approve'];
    }

    const {
      molecule, isLogin, isCI, isReviewer, xvialCom, labels
    } = element;

    const idyLogin = typeof isLogin === 'undefined' ? true : isLogin;
    const idyReview = typeof isReviewer === 'undefined' ? false : isReviewer;
    let samples = [];
    let pubData = {};
    let tagData = {};
    let { sample } = element;
    let hasXvial = false;
    if (isPublished) {
      samples = element.published_samples;
      sample = samples.find(x => x !== undefined) || {};
      sample.id = sample.sample_id;
      hasXvial = samples.filter(s => s !== undefined && s.xvial && s.xvial !== '').length > 0;
    } else {
      samples.push(element.sample);
      pubData = element.publication;
    }

    tagData = (pubData?.taggable_data) || {};
    const details = (samples || []).map((s, idx) => {
      // only display the active version
      if (isEmpty(review) && !s.show) {
        return null;
      }
      if (isPublished) {
        pubData = {
          id: s.pub_id
        };
        tagData = {
          published_at: s.published_at,
          doi_reg_at: s.doi_reg_at
        };
      }

      if (typeof s === 'undefined' || !s) {
        console.log('Sample is undefined');
        return null;
      }

      const el = {
        id: s.id || s.sample_id,
        decoupled: s.decoupled,
        sid: s.sid,
        short_label: s.short_label || '',
        comp_num: s.comp_num || '',
        xvial: s.xvial,
        embargo: s.embargo,
        pub_info: s.pub_info,
        ana_infos: s.ana_infos,
        affiliation_ids: s.affiliation_ids || tagData.affiliation_ids,
        ror_ids: s.rors || tagData.rors,
        affiliations: s.affiliations || tagData.affiliations,
        literatures: s.literatures || element.literatures,
        license: s.license || tagData.license || 'CC BY-SA',
        author_ids: s.author_ids || tagData.author_ids || [],
        contributors: s.contributors || tagData.contributors,
        creators: s.creators || tagData.creators,
        doi: s.doi || element.doi,
        concept: s.concept,
        reaction_ids: s.reaction_ids || [],
        showed_name: s.showed_name,
        name: s.name,
        description: s.description,
        molecule_iupac: molecule.iupac_name || [],
        molecule_id: molecule.id,
        container: s.container || element.analyses || {},
        segments: s.segments || [],
        boiling_point: s.boiling_point || '',
        melting_point: s.melting_point || '',
        labels: (isPublished ? s.labels : labels) || [],
        molecular_mass: s.molecular_mass || '',
        sum_formula: s.sum_formula || '',
        new_version: s.new_version,
        versions: (s.versions || []),
        molecule: s.molecule || '',
        sample_svg_file: s.sample_svg_file || '',
        molfile: s.molfile || '',
        zip_download_url: s.zip_download_url || '',
        chemotion_zip_url: s.chemotion_zip_url || '',
        fundingReferences: s.fundingReferences || [],
      };

      // Match the CRS id shown inside the sample (ChemotionId uses pubData.id).
      const crsId = s.pub_id || pubData.id;
      const collapseTitle = crsId
        ? `Sample ${idx + 1}: CRS-${crsId}`
        : `Sample ${idx + 1}`;

      // Two-line header summary so the collapsed panel is scannable. Rendered as
      // plain text (the toggle is a <button>, so no nested links/buttons here).
      const doiText = typeof el.doi === 'string' ? el.doi : el.doi?.full_doi;
      const publishedText = getFormattedISODate(s.published_at || s.doi_reg_at);
      const collapseSummary = [
        { label: 'Contributor', value: el.contributors?.name },
        { label: 'Published', value: publishedText },
        { label: 'DOI', value: doiText },
        { label: 'Embargo', value: el.embargo },
      ];

      return (
        <CollapsibleSample
          key={el.id}
          defaultOpen={false}
          title={collapseTitle}
          summary={collapseSummary}
        >
          <RepoSample
            sample={el}
            pubData={pubData}
            tagData={tagData}
            handleCommentBtn={this.handleCommentBtn}
            isLogin={idyLogin}
            isCI={!!isCI}
            isReviewer={idyReview}
            isPublisher={s.isPublisher}
            {...this.props}
          />
        </CollapsibleSample>
      );
    });

    return (
      <Card style={{ border: 'none' }} >
        <Card.Body>
          {
            canComment ?
              <RepoReviewButtonBar
                element={{ id: sample.id, elementType: 'Sample', user_labels: sample.user_labels }}
                buttonFunc={this.handleReviewBtn}
                review_info={review_info}
                pubState={pubData.state}
                showComment={showComment}
                canClose={this.props.canClose}
                currComment={(history && history.slice(-1).pop()) || {}}
                buttons={buttons}
                taggData={tagData}
              /> : null
          }
          <MoleculeInfo molecule={molecule} sample_svg_file={sample.sample_svg_file} hasXvial={hasXvial} xvialCom={xvialCom}>
            {canClose ? <ClosePanel element={sample} /> : null}
          </MoleculeInfo>
          <div>
            {details}
          </div>
          <NMRiumDisplayer
            sample={element}
            handleSampleChanged={() => {}}
            handleSubmit={() => {}}
            readOnly
          />
        </Card.Body>
      </Card>
    );
  }
}

RepoSampleDetails.propTypes = {
  element: PropTypes.object.isRequired,
  isPublished: PropTypes.bool,
  canComment: PropTypes.bool,
  btnAction: PropTypes.string,
  review_info: PropTypes.object,
  showComment: PropTypes.bool,
  review: PropTypes.object,
  canClose: PropTypes.bool,
  buttons: PropTypes.arrayOf(PropTypes.string),
  onReviewUpdate: PropTypes.func,
};

RepoSampleDetails.defaultProps = {
  isPublished: false,
  canComment: false,
  btnAction: '',
  review_info: {},
  showComment: true,
  review: {},
  canClose: true,
  buttons: ['Decline', 'Comments', 'Review', 'Submit', 'Accept', 'Revert'],
  onReviewUpdate: () => {},
};
