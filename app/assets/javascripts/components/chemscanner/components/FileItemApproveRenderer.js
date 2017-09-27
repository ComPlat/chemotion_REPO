import PropTypes from 'prop-types';
import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

class FileItemApproveRenderer extends React.Component {
  constructor(props) {
    super(props);

    this.approveItem = this.approveItem.bind(this);
  }

  approveItem() {
    const { approveItems, data } = this.props;
    const { type, id, isApproved } = data;

    const val = !(isApproved || false);
    approveItems([id], type, val);
  }

  render() {
    const { data } = this.props;
    const { type, id, isApproved } = data;

    if (type.startsWith('Item')) return <span />;
    if (type === 'File' && !data.children) return <span />;

    const tooltipId = `cs-approve-${type}-${id}-tooltip`;
    const tooltip = <Tooltip id={tooltipId}>Approve</Tooltip>;

    let bsStyle;
    let icon;
    if (isApproved) {
      bsStyle = 'success';
      icon = 'check-circle';
    } else {
      bsStyle = 'default';
      icon = 'check-circle-o';
    }

    return (
      <div style={{ marginTop: '-2px', paddingLeft: '15px' }}>
        <OverlayTrigger placement="top" overlay={tooltip}>
          <Button bsSize="xsmall" bsStyle={bsStyle} onClick={this.approveItem}>
            <i className={`fa fa-${icon}`} />
          </Button>
        </OverlayTrigger>
      </div>
    );
  }
}

FileItemApproveRenderer.propTypes = {
  approveItems: PropTypes.func.isRequired,
  data: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default FileItemApproveRenderer;
