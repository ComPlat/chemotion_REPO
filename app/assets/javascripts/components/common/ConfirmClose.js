import React, { Component } from 'react'
import ReactDOM from 'react-dom';
import { Button, ButtonGroup, Tooltip, Overlay, OverlayTrigger } from 'react-bootstrap';
import DetailActions from '.././actions/DetailActions';

export default class ConfirmClose extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
    };

    this.onClickButton = this.onClickButton.bind(this);
    this.getTargetButton = this.getTargetButton.bind(this);
  }

  onClickButton(el) {
    this.setState(
      prevState => ({ ...prevState, showTooltip: !prevState.showTooltip }),
      () => (DetailActions.close(el)));
  }

  getTargetButton() {
    return ReactDOM.findDOMNode(this.target);
  }

  render() {
    const { el } = this.props
    const popover = (
      <Tooltip placement="left" className="in" id="tooltip-bottom"> 
        Unsaved data will be lost.<br /> Close {el.type}?<br />
        <ButtonGroup>
          <Button
            bsStyle="danger"
            bsSize="xsmall"
            onClick={DetailActions.confirmDelete}
          >Yes
          </Button>
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            onClick={() => this.setState({ showTooltip: false })}
          >No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );
    const sharedProps = {
      containter: this,
      target: this.getTargetButton,
      show: this.state.showTooltip,
      placement: "bottom",
    }

    return(
      <span>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="closeSample">Close {el.type}</Tooltip>}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => this.onClickButton(el)}
            ref={button => {this.target = button}}
          >
              <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
        <Overlay {...sharedProps}
          rootClose
          onHide={() => this.setState({ showTooltip: false })}
        >
          { popover }
        </Overlay>
      </span>
    )
  }
}