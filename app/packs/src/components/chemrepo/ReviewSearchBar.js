import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

export default class ReviewSearchBar extends Component {
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
    const { showSearchBar } = this.state;
    const { renderSearch } = this.props;
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1100,
          background: showSearchBar ? '#f8f9fa' : '#1976d2',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          minWidth: showSearchBar ? '50vw' : '38px',
          maxWidth: showSearchBar ? '90vw' : '38px',
          padding: showSearchBar ? '4px 12px' : '0',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s',
          height: 'auto',
          marginLeft: '-20px',
        }}
      >
        <Button
          bsStyle="default"
          bsSize="xsmall"
          onClick={this.toggleSearchBar}
          style={{
            background: showSearchBar ? '#f8f9fa' : '#1976d2',
            border: 'none',
            color: showSearchBar ? '#888' : '#fff',
            fontSize: showSearchBar ? '18px' : '16px',
            boxShadow: 'none',
            outline: 'none',
            padding: 0,
            width: showSearchBar ? 'unset' : '40px',
            height: showSearchBar ? 'unset' : '40px',
            borderRadius: '0 !important',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '0',
            transition: 'background 0.2s',
          }}
          title={showSearchBar ? 'Hide Search Bar' : 'Show Search Bar'}
        >
          {!showSearchBar && <i className="fa fa-search" aria-hidden="true" />}
          {showSearchBar && <i className="fa fa-times" aria-hidden="true" />}
        </Button>
        {showSearchBar && renderSearch && renderSearch()}
        {showSearchBar && (
          <Button
            bsStyle="default"
            bsSize="xsmall"
            onClick={this.toggleSearchBar}
            style={{
              background: '#f8f9fa',
              border: 'none',
              color: '#888',
              fontSize: '18px',
              boxShadow: 'none',
              outline: 'none',
              paddingLeft: '8px',
              width: 'unset',
              height: 'unset',
              borderRadius: '0 !important',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '0',
              transition: 'background 0.2s',
            }}
            title="Hide Search Bar"
          >
            <i className="fa fa-times" aria-hidden="true" />
          </Button>
        )}
      </div>
    );
  }
}

ReviewSearchBar.propTypes = { renderSearch: PropTypes.func.isRequired };
