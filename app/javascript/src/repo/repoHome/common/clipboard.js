/* eslint-disable react/no-multi-comp */
import React, { Component } from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { copyToClipboard } from 'src/utilities/clipboard';

class ClipboardCopyLink extends Component {
  handleClick = () => {
    copyToClipboard(this.props.text || ' ');
  }

  render() {
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="copy_clipboard">copy to clipboard</Tooltip>}
      >
        <div role="button" onClick={this.handleClick} className="clipboardBtn clip-copy" >{this.props.text}</div>
      </OverlayTrigger>
    );
  }
}

class ClipboardCopyBtn extends Component {
  handleClick = () => {
    copyToClipboard(this.props.text || ' ');
  }

  render() {
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="copy_clipboard">{this.props.tooltip || 'copy to clipboard'}</Tooltip>}
      >
        <Button onClick={this.handleClick} size="xsm" variant="outline-dark">
          <i className="fa fa-clipboard" />
        </Button>
      </OverlayTrigger>
    );
  }
}

export { ClipboardCopyLink, ClipboardCopyBtn };
