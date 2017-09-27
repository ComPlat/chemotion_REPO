import React from 'react';

export default class Switch extends React.Component {
  constructor(props) {
    super(props)

    this.toggle = this.toggle.bind(this)
  }

  toggle(checked) {
    this.props.onChange(checked)
  }

  render() {
    const {
      checked,
      checkedChildren,
      classSize,
      unCheckedChildren,
      ...restProps
    } = this.props

    let className = "switch ";
    className += checked ? "switch-checked" : "";
    let innerClass = "switch-inner";
    if (typeof (classSize) !== 'undefined' && classSize==='switchb') {
      className = "switchb ";
      className += checked ? "switchb-checked" : "";
      innerClass = "switchb-inner";
    }

    return (
      <span tabIndex="0" onClick={() => this.toggle(checked)}
        className={className} {...restProps}>
        <span className={innerClass}>
          {checked ? checkedChildren : unCheckedChildren}
        </span>
      </span>
    )
  }
}
