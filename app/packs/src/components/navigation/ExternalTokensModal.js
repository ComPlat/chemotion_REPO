import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  Panel,
  Form,
  FormControl,
  FormGroup,
  ControlLabel,
} from 'react-bootstrap';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class ExternalTokensModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      externalTokens: [],
      nmrxivCredentials: {
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
      },
      isRegistering: false,
      tokenLoading: false,
      nmrxivSyncEnabled: false,
      syncPreferenceLoading: false,
      modalMessage: null,
    };

    this.handleNmrxivCredentialsChange = this.handleNmrxivCredentialsChange.bind(this);
    this.handleNmrxivLogin = this.handleNmrxivLogin.bind(this);
    this.handleNmrxivRegister = this.handleNmrxivRegister.bind(this);
    this.fetchExternalTokens = this.fetchExternalTokens.bind(this);
    this.deleteExternalToken = this.deleteExternalToken.bind(this);
    this.handleNmrxivSyncChange = this.handleNmrxivSyncChange.bind(this);
    this.handleSaveSyncPreference = this.handleSaveSyncPreference.bind(this);
    this.fetchUserProfile = this.fetchUserProfile.bind(this);
    this.showModalMessage = this.showModalMessage.bind(this);
    this.clearModalMessage = this.clearModalMessage.bind(this);
  }

  componentDidMount() {
    if (this.props.show) {
      this.fetchExternalTokens();
      this.fetchUserProfile();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.show && !prevProps.show) {
      this.fetchExternalTokens();
      this.fetchUserProfile();
    }
  }

  handleNmrxivCredentialsChange(field, value) {
    this.setState({
      nmrxivCredentials: {
        ...this.state.nmrxivCredentials,
        [field]: value,
      },
    });
  }

  async fetchExternalTokens() {
    try {
      const response = await fetch('/api/v1/external_tokens', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.setState({ externalTokens: data.tokens || [] });
      }
    } catch (error) {
      console.error('Failed to fetch external tokens:', error);
      NotificationActions.add({
        message: 'Failed to fetch external tokens',
        level: 'error',
      });
    }
  }

  async fetchUserProfile() {
    try {
      const response = await fetch('/api/v1/profiles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const profileData = await response.json();
        const nmrxivSyncEnabled = profileData.data?.nmrxiv_sync_enabled || false;
        this.setState({ nmrxivSyncEnabled });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }

  async handleNmrxivLogin() {
    const { nmrxivCredentials } = this.state;

    if (!nmrxivCredentials.username || !nmrxivCredentials.password) {
      this.showModalMessage('Please enter both username and password', 'error');
      return;
    }

    this.setState({ tokenLoading: true });

    try {
      const response = await fetch('/api/v1/external_tokens/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: 'nmrxiv',
          credentials: {
            username: nmrxivCredentials.username,
            password: nmrxivCredentials.password
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        this.showModalMessage('Successfully authenticated with NMRXiv!', 'success');
        this.fetchExternalTokens();
        this.setState({
          nmrxivCredentials: {
            username: '',
            password: '',
            confirmPassword: '',
            email: ''
          }
        });
      } else {
        this.showModalMessage(data.error || 'Authentication failed', 'error');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showModalMessage('Network error during authentication', 'error');
    } finally {
      this.setState({ tokenLoading: false });
    }
  }

  async handleNmrxivRegister() {
    const { nmrxivCredentials } = this.state;

    if (!nmrxivCredentials.username || !nmrxivCredentials.password ||
        !nmrxivCredentials.confirmPassword || !nmrxivCredentials.email) {
      this.showModalMessage('Please fill in all required fields', 'error');
      return;
    }

    if (nmrxivCredentials.password !== nmrxivCredentials.confirmPassword) {
      this.showModalMessage('Passwords do not match', 'error');
      return;
    }

    this.setState({ tokenLoading: true });

    try {
      // First register with NMRXiv
      const registerResponse = await fetch('https://dev.nmrxiv.org/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: nmrxivCredentials.username,
          email: nmrxivCredentials.email,
          password: nmrxivCredentials.password,
          password_confirmation: nmrxivCredentials.confirmPassword
        })
      });

      if (registerResponse.ok) {
        this.showModalMessage('Successfully registered with NMRXiv! Please check your email for verification.', 'success');

        // After successful registration, try to login
        setTimeout(() => {
          this.handleNmrxivLogin();
        }, 2000);
      } else {
        const errorData = await registerResponse.json();
        this.showModalMessage(errorData.error || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showModalMessage('Network error during registration', 'error');
    } finally {
      this.setState({ tokenLoading: false });
    }
  }

  async deleteExternalToken(provider) {
    if (!confirm(`Are you sure you want to delete the ${provider} token?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/external_tokens/${provider}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        credentials: 'include'
      });

      if (response.ok) {
        this.showModalMessage(`Successfully deleted ${provider} token`, 'success');
        this.fetchExternalTokens();
      } else {
        const data = await response.json();
        this.showModalMessage(data.error || 'Failed to delete token', 'error');
      }
    } catch (error) {
      console.error('Delete token error:', error);
      this.showModalMessage('Network error while deleting token', 'error');
    }
  }

  async handleNmrxivSyncChange(event) {
    this.setState({ nmrxivSyncEnabled: event.target.checked });
  }

  async handleSaveSyncPreference() {
    this.setState({ syncPreferenceLoading: true });

    try {
      const response = await fetch('/api/v1/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          data: {
            nmrxiv_sync_enabled: this.state.nmrxivSyncEnabled
          }
        })
      });

      if (response.ok) {
        this.showModalMessage('NMRXiv sync preference saved successfully!', 'success');
      } else {
        const errorData = await response.json();
        this.showModalMessage(errorData.error || 'Failed to save sync preference', 'error');
      }
    } catch (error) {
      console.error('Save sync preference error:', error);
      this.showModalMessage('Network error while saving sync preference', 'error');
    } finally {
      this.setState({ syncPreferenceLoading: false });
    }
  }

  showModalMessage(message, type = 'info') {
    this.setState({ modalMessage: { text: message, type } });
    // Also send to notifications as before
    NotificationActions.add({
      message,
      level: type,
    });
  }

  clearModalMessage() {
    this.setState({ modalMessage: null });
  }

  getAlertClass(type) {
    switch (type) {
      case 'success':
        return 'alert alert-success alert-dismissible';
      case 'error':
        return 'alert alert-danger alert-dismissible';
      default:
        return 'alert alert-info alert-dismissible';
    }
  }

  handleClose = () => {
    this.setState({
      isRegistering: false,
      nmrxivCredentials: {
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
      },
    });
    this.props.onHide();
  };

  render() {
    const { show } = this.props;
    const {
      externalTokens,
      nmrxivCredentials,
      isRegistering,
      tokenLoading,
      nmrxivSyncEnabled,
      syncPreferenceLoading,
      modalMessage,
    } = this.state;

    if (!show) {
      return null;
    }

    const nmrxivToken = externalTokens.find(token => token.provider === 'nmrxiv');

    return (
      <Modal
        show={show}
        onHide={this.handleClose}
        dialogClassName="importChemDrawModal"
        style={{
          maxWidth: '70%',
          maxHeight: '80%',
          margin: 'auto',
          overflowY: 'auto',
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Repository Integration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalMessage && (
            <div
              className={this.getAlertClass(modalMessage.type)}
              style={{ marginBottom: '15px' }}
            >
              <span>{modalMessage.text}</span>
              <button
                type="button"
                className="close"
                onClick={this.clearModalMessage}
                style={{ fontSize: '18px', lineHeight: '1' }}
              >
                ×
              </button>
            </div>
          )}
          <div>
            <Panel bsStyle="info">
              <Panel.Heading>
                <Panel.Title>NMRXiv Token</Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                {nmrxivToken ? (
                  <div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Status:</strong>
                      <span style={{
                        marginLeft: '10px',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        backgroundColor: nmrxivToken.has_valid_token ? '#d4edda' : '#f8d7da',
                        color: nmrxivToken.has_valid_token ? '#155724' : '#721c24'
                      }}>
                        {nmrxivToken.has_valid_token ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    {nmrxivToken.expires_at && (
                      <div style={{ marginBottom: '15px' }}>
                        <strong>Expires:</strong> {new Date(nmrxivToken.expires_at).toLocaleString()}
                      </div>
                    )}
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Last Updated:</strong> {new Date(nmrxivToken.updated_at).toLocaleString()}
                    </div>
                    <Button
                      bsStyle="danger"
                      bsSize="small"
                      onClick={() => this.deleteExternalToken('nmrxiv')}
                    >
                      Delete Token
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p>No NMRXiv token found. Please authenticate to get access to NMRXiv services.</p>

                    {!isRegistering ? (
                      <div>
                        <h4>Login to NMRXiv</h4>
                        <Form>
                          <FormGroup>
                            <ControlLabel>Username</ControlLabel>
                            <FormControl
                              type="text"
                              placeholder="Enter your NMRXiv username"
                              value={nmrxivCredentials.username}
                              onChange={(e) => this.handleNmrxivCredentialsChange('username', e.target.value)}
                            />
                          </FormGroup>
                          <FormGroup>
                            <ControlLabel>Password</ControlLabel>
                            <FormControl
                              type="password"
                              placeholder="Enter your NMRXiv password"
                              value={nmrxivCredentials.password}
                              onChange={(e) => this.handleNmrxivCredentialsChange('password', e.target.value)}
                            />
                          </FormGroup>
                          <div style={{ marginBottom: '15px' }}>
                            <Button
                              bsStyle="primary"
                              onClick={this.handleNmrxivLogin}
                              disabled={tokenLoading}
                            >
                              {tokenLoading ? 'Authenticating...' : 'Login'}
                            </Button>
                            <Button
                              bsStyle="link"
                              onClick={() => this.setState({ isRegistering: true })}
                            >
                              Don't have an account? Register here
                            </Button>
                          </div>
                        </Form>
                      </div>
                    ) : (
                      <div>
                        <h4>Register for NMRXiv</h4>
                        <Form>
                          <FormGroup>
                            <ControlLabel>Username</ControlLabel>
                            <FormControl
                              type="text"
                              placeholder="Choose a username"
                              value={nmrxivCredentials.username}
                              onChange={(e) => this.handleNmrxivCredentialsChange('username', e.target.value)}
                            />
                          </FormGroup>
                          <FormGroup>
                            <ControlLabel>Email</ControlLabel>
                            <FormControl
                              type="email"
                              placeholder="Enter your email address"
                              value={nmrxivCredentials.email}
                              onChange={(e) => this.handleNmrxivCredentialsChange('email', e.target.value)}
                            />
                          </FormGroup>
                          <FormGroup>
                            <ControlLabel>Password</ControlLabel>
                            <FormControl
                              type="password"
                              placeholder="Enter a password"
                              value={nmrxivCredentials.password}
                              onChange={(e) => this.handleNmrxivCredentialsChange('password', e.target.value)}
                            />
                          </FormGroup>
                          <FormGroup>
                            <ControlLabel>Confirm Password</ControlLabel>
                            <FormControl
                              type="password"
                              placeholder="Confirm your password"
                              value={nmrxivCredentials.confirmPassword}
                              onChange={(e) => this.handleNmrxivCredentialsChange('confirmPassword', e.target.value)}
                            />
                          </FormGroup>
                          <div style={{ marginBottom: '15px' }}>
                            <Button
                              bsStyle="success"
                              onClick={this.handleNmrxivRegister}
                              disabled={tokenLoading}
                            >
                              {tokenLoading ? 'Registering...' : 'Register'}
                            </Button>
                            <Button
                              bsStyle="link"
                              onClick={() => this.setState({ isRegistering: false })}
                            >
                              Already have an account? Login here
                            </Button>
                          </div>
                        </Form>
                      </div>
                    )}
                  </div>
                )}
              </Panel.Body>
            </Panel>

            <Panel bsStyle="warning">
              <Panel.Heading>
                <Panel.Title>About External Tokens</Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <p>
                  External tokens allow you to authenticate with third-party services like NMRXiv.
                  These tokens are securely encrypted and stored in our system.
                </p>
                <ul>
                  <li><strong>NMRXiv:</strong> Access to NMR data repository and analysis tools</li>
                  <li>Tokens are automatically refreshed when possible</li>
                  <li>You can delete tokens at any time</li>
                </ul>
              </Panel.Body>
            </Panel>

            {nmrxivToken && (
              <Panel bsStyle="info">
                <Panel.Heading>
                  <Panel.Title>NMRXiv Sync Preference</Panel.Title>
                </Panel.Heading>
                <Panel.Body>
                  <FormGroup>
                    <ControlLabel>
                      <input
                        type="checkbox"
                        checked={nmrxivSyncEnabled}
                        onChange={this.handleNmrxivSyncChange}
                        disabled={syncPreferenceLoading}
                      />
                      {' '}
                      Do you want to sync. publication to NMRXiv?
                    </ControlLabel>
                  </FormGroup>
                  <div style={{ marginBottom: '15px' }}>
                    <Button
                      bsStyle="primary"
                      onClick={this.handleSaveSyncPreference}
                      disabled={syncPreferenceLoading}
                    >
                      {syncPreferenceLoading ? 'Saving...' : 'Save Preference'}
                    </Button>
                  </div>
                  <p className="text-muted">
                    When enabled, your publications will be automatically synchronized to the NMRXiv system and linked to your NMRXiv account once they are accepted and released in the Chemotion Repository.
                  </p>
                </Panel.Body>
              </Panel>
            )}
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

ExternalTokensModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};
