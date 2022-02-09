/* eslint-disable react/forbid-prop-types */
import React from 'react';
import {
  Panel,
  Row,
  Col
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import { CommentBtn, ReactionTable, ReactionRinChiKey, resizableSvg } from './RepoCommon';
import QuillViewer from '../components/QuillViewer';

const RepoReactionSchemeInfo = (props) => {
  const content = props.reaction.description;
  const contentlength = (content && content.ops && content.ops.length > 0
    && content.ops[0].insert) ? content.ops[0].insert.trim().length : 0;
  const descQV = contentlength > 0 ?
    (<span><b>Description:</b><QuillViewer value={content} /></span>) : null;
  return (
    <Panel style={{ marginBottom: '4px' }}>
      <Panel.Body style={{ paddingBottom: '1px' }}>
        <Row>
          <Col sm={12} md={12} lg={12}>
            {resizableSvg(props.svgPath)}
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
  reviewLevel: PropTypes.number,
  propInfo: PropTypes.string,
  history: PropTypes.array,
  onComment: PropTypes.func,
  canComment: PropTypes.bool,
};

RepoReactionSchemeInfo.defaultProps = {
  history: [],
  reviewLevel: 0,
  propInfo: '',
  onComment: () => {},
  canComment: false
};

export default RepoReactionSchemeInfo;
