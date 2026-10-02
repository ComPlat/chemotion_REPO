import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import ContactEmail from 'src/repo/chemrepo/core/ContactEmail';

// Reusable styles
const styles = {
  welcomeSection: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '25px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: '5px',
  },
  checkIcon: {
    color: '#28a745',
    marginRight: '12px',
    marginTop: '3px',
    fontSize: '16px',
  },
  actionButton: {
    padding: '4px 8px',
    borderRadius: '3px',
    marginLeft: '5px',
  },
  filterButton: {
    backgroundColor: '#e9ecef',
    padding: '2px 6px',
    borderRadius: '3px',
    marginLeft: '5px',
    marginRight: '5px',
  },
  callToAction: {
    backgroundColor: '#d1ecf1',
    border: '1px solid #bee5eb',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
  },
};

// Reusable components
const FeatureItem = ({ children }) => (
  <div className="feature-item" style={styles.featureItem}>
    <i className="fa fa-check" aria-hidden="true" style={styles.checkIcon} />
    <div>{children}</div>
  </div>
);

const ActionButton = ({ icon, text, isFilter = false }) => (
  <span
    className="download"
    style={isFilter ? styles.filterButton : styles.actionButton}
  >
    <i className={`fa fa-${icon}`} aria-hidden="true" />
    {text && <>&nbsp;{text}</>}
  </span>
);

FeatureItem.propTypes = {
  children: PropTypes.node.isRequired,
};

ActionButton.propTypes = {
  icon: PropTypes.string.isRequired,
  text: PropTypes.string,
  isFilter: PropTypes.bool,
};

ActionButton.defaultProps = {
  text: null,
  isFilter: false,
};

const RepoGenericHubDesc = () => (
  <div className="repo-generic-hub-desc">
    <div className="header-section" style={{ marginBottom: '30px' }}>
      <div className="welcome-section" style={styles.welcomeSection}>
        <h3 style={{ color: '#495057' }}>
          Welcome to the <strong>LabIMotion Template Hub</strong>
        </h3>
        <p style={{ fontSize: '16px', color: '#6c757d', marginBottom: '0' }}>
          Your platform for sharing new elements, segments, and datasets
          templates.
        </p>
        <div style={{ position: 'relative', top: '-80px' }}>
          <span className="contact" style={{ marginLeft: '10px' }}>
            <ContactEmail
              email="chemotion-labimotion@lists.kit.edu"
              label="Send feedback about LabIMotion"
              size="sm"
            />
          </span>
          <span className="contact" style={{ marginLeft: '10px' }}>
            <Button
              onClick={() => {
                window.open(
                  'https://www.chemotion.net/docs/labimotion',
                  '_blank'
                );
              }}
              size="sm"
            >
              <i className="fa fa-book" aria-hidden="true" />
              &nbsp;LabIMotion Docs
            </Button>
          </span>
        </div>
      </div>
    </div>

    <div className="instructions-section">
      <h3 style={{ color: '#495057', marginBottom: '20px' }}>
        <i
          className="fa fa-info-circle"
          aria-hidden="true"
          style={{ color: '#1976d2' }}
        />
        &nbsp;Getting Started: Selecting a Template
      </h3>

      <div className="intro-text" style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '16px', color: '#6c757d' }}>
          The templates are conveniently displayed in a grid layout. You can:
        </p>
      </div>

      <div className="features-list" style={{ marginBottom: '25px' }}>
        <FeatureItem>
          <strong>Sort</strong> the grid by clicking on the column headers.
        </FeatureItem>

        <FeatureItem>
          <strong>Filter</strong> the grid by clicking on the filter icon{' '}
          <ActionButton icon="bars" isFilter />
          located at the right of the column headers.
        </FeatureItem>

        <FeatureItem>
          <strong>Preview</strong> a template by clicking on the button{' '}
          <ActionButton icon="eye" text="View Example" />
        </FeatureItem>

        <FeatureItem>
          <strong>Download</strong> a template by clicking on the button{' '}
          <ActionButton icon="download" text="Download" />
        </FeatureItem>
      </div>

      <div className="call-to-action" style={styles.callToAction}>
        <h3 style={{ color: '#0c5460', marginBottom: '10px' }}>
          <i
            className="fa fa-rocket"
            aria-hidden="true"
            style={{ marginRight: '10px' }}
          />
          Ready to Get Started?
        </h3>
        <p style={{ color: '#0c5460', fontSize: '16px', marginBottom: '0' }}>
          Choose the template type you need from the menu on the left and begin
          exploring available templates.
        </p>
      </div>
    </div>
  </div>
);

export default RepoGenericHubDesc;
