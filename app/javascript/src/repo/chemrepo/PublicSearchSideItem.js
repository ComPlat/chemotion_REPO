import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class PublicSearchSideItem extends Component {
  constructor(props) {
    super(props);
    this.state = { open: false };
    this.toggle = this.toggle.bind(this);
    this.close = this.close.bind(this);
    this.onDocClick = this.onDocClick.bind(this);
    this.setRef = this.setRef.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.open !== this.state.open) {
      if (this.state.open) {
        document.addEventListener('mousedown', this.onDocClick);
      } else {
        document.removeEventListener('mousedown', this.onDocClick);
      }
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.onDocClick);
  }

  onDocClick(e) {
    if (!this.rootEl || this.rootEl.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.modal, .modal-backdrop, .popover, [role="dialog"]')) return;
    if (document.body.classList.contains('modal-open')) return;
    this.close();
  }

  setRef(el) { this.rootEl = el; }

  toggle(e) {
    if (e) e.stopPropagation();
    this.setState(s => ({ open: !s.open }));
  }

  close() { this.setState({ open: false }); }

  render() {
    const {
      expanded, renderContent, label, icon, popoverClassName, hasActiveFilters,
    } = this.props;
    const { open } = this.state;
    const popoverCls = ['repo-publ-sidenav-popover', popoverClassName].filter(Boolean).join(' ');

    const item = (
      <li
        ref={this.setRef}
        role="button"
        tabIndex={0}
        className={`repo-publ-sidenav-tool repo-publ-sidenav-tool-wrap ${open ? 'active' : ''}`}
        onClick={this.toggle}
        onKeyPress={(e) => { if (e.key === 'Enter') this.toggle(e); }}
      >
        <span className="repo-publ-sidenav-tool-icon">
          <i className={icon} aria-hidden="true" />
          {hasActiveFilters && <span className="repo-publ-sidenav-tool-dot" aria-label="active filters" />}
        </span>
        {expanded && <span className="sidenav-label">{label}</span>}
        {open && (
          <div
            className={popoverCls}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => e.stopPropagation()}
            role="presentation"
          >
            <div className="repo-publ-sidenav-popover-header">
              <span>{label}</span>
              <button
                type="button"
                className="repo-publ-sidenav-popover-close"
                onClick={(e) => { e.stopPropagation(); this.close(); }}
                aria-label="Close"
              >
                <i className="fa fa-times" aria-hidden="true" />
              </button>
            </div>
            <div className="repo-publ-sidenav-popover-body">
              {renderContent && renderContent()}
            </div>
          </div>
        )}
      </li>
    );

    return item;
  }
}

PublicSearchSideItem.propTypes = {
  expanded: PropTypes.bool,
  renderContent: PropTypes.func.isRequired,
  label: PropTypes.string,
  icon: PropTypes.string,
  popoverClassName: PropTypes.string,
  hasActiveFilters: PropTypes.bool,
};

PublicSearchSideItem.defaultProps = {
  expanded: true,
  label: 'Search',
  icon: 'fa fa-search',
  popoverClassName: '',
  hasActiveFilters: false,
};
