import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

export default class PublicSearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showSearchBar: false,
    };
    this.toggleSearchBar = this.toggleSearchBar.bind(this);
  }

  toggleSearchBar() {
    this.setState(prevState => ({ showSearchBar: !prevState.showSearchBar }));
  }

  render() {
    const { renderSearch, renderAdvancedSearch } = this.props;
    const { showSearchBar } = this.state;

    const containerStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      background: showSearchBar ? '#f8f9fa' : '#1976d2',
      boxShadow: '0 4px 26px rgba(0,0,0,0.15)',
      borderRadius: '8px',
      minWidth: showSearchBar ? '50vw' : '38px',
      maxWidth: showSearchBar ? '90vw' : '38px',
      padding: showSearchBar ? '4px 12px 4px 4px' : '0',
      height: 'auto',
      marginTop: '10px',
      marginLeft: '14px',
    };
    const buttonStyle = {
      background: showSearchBar ? '#f8f9fa' : '#1976d2',
      color: showSearchBar ? '#888' : '#fff',
      border: 'none',
      fontSize: showSearchBar ? '18px' : '16px',
      boxShadow: 'none',
      outline: 'none',
      paddingLeft: showSearchBar ? '14px' : '4px',
      width: showSearchBar ? '0' : '40px',
      height: '40px',
      borderRadius: '0 !important',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 0,
      transition: 'background 0.2s',
    };
    const contentStyle = {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    };

    return (
      <div style={containerStyle}>
        <Button
          bsStyle="default"
          bsSize="xsmall"
          onClick={this.toggleSearchBar}
          style={buttonStyle}
          title={showSearchBar ? 'Hide Search Bar' : 'Show Search Bar'}
        >
          {!showSearchBar && <i className="fa fa-search" aria-hidden="true" />}
          {showSearchBar && <i className="fa fa-times" aria-hidden="true" />}
        </Button>
        {showSearchBar && (
          <div style={contentStyle}>
            <div
              className="navbar-form nav navbar-nav"
              style={{ padding: '0px 8px' }}
            >
              {renderSearch && renderSearch()}
            </div>
            <div style={{ flexGrow: 1 }}>
              {renderAdvancedSearch && renderAdvancedSearch()}
            </div>
          </div>
        )}
        {showSearchBar && (
          <Button
            bsStyle="default"
            bsSize="xsmall"
            onClick={this.toggleSearchBar}
            style={buttonStyle}
            title="Hide Search Bar"
          >
            <i className="fa fa-times" aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }
}

PublicSearchBar.propTypes = {
  renderSearch: PropTypes.func.isRequired,
  renderAdvancedSearch: PropTypes.func.isRequired,
};
