import React from 'react';
import {
  Panel,
  Row,
  Col
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';
import { CommentBtn, ReactionTable, ReactionRinChiKey, ReactionProperties } from './RepoCommon';
import QuillViewer from '../components/QuillViewer';

const RepoReactionSchemeInfo = (props) => {
  const content = props.reaction.description;
  const contentlength = (content && content.ops && content.ops.length > 0 && content.ops[0].insert) ? content.ops[0].insert.trim().length : 0;
  const descQV = contentlength > 0 ?
  (<span><b>Description:</b><QuillViewer value={content}  /></span>) : null;

  return (
    <Panel style={{ marginBottom: '4px' }}>
      <Panel.Body style={{ paddingBottom: '1px' }}>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <SVG key={props.svgPath} src={props.svgPath} className="reaction-details" />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <CommentBtn {...props} field="Reaction Table" orgInfo="<Reaction Table>" onShow={props.onComment} />
            <ReactionTable
              reaction={props.reaction}
              toggle={() => props.onToggle('Scheme')}
              show={props.showScheme}
              isPublic
              bodyAttrs={props.bodyAttrs}
            />
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <div className="desc small-p">
              {descQV}
            </div>
          </Col>
        </Row>
        <Row>
          <Col sm={12} md={12} lg={12}>
            <ReactionRinChiKey
              reaction={props.reaction}
              toggle={() => props.onToggle('Rinchi')}
              show={props.showRinchi}
              bodyAttrs={props.bodyAttrs}
            />
          </Col>
        </Row>
      </Panel.Body>
    </Panel>
  );
};

RepoReactionSchemeInfo.propTypes = {
  reaction: PropTypes.object.isRequired,
  svgPath: PropTypes.string.isRequired,
  showScheme: PropTypes.bool.isRequired,
  showRinchi: PropTypes.bool.isRequired,
  showProp: PropTypes.bool.isRequired,
  bodyAttrs: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  comments: PropTypes.object,
  reviewLevel: PropTypes.number,
  pubState: PropTypes.string,
  submitter: PropTypes.string,
  propInfo: PropTypes.string,
  onComment: PropTypes.func,
  canComment: PropTypes.bool,
};

RepoReactionSchemeInfo.defaultProps = {
  comments: {},
  reviewLevel: 0,
  pubState: '',
  submitter: '',
  propInfo: '',
  onComment: () => {},
  canComment: false
};

export default RepoReactionSchemeInfo;
