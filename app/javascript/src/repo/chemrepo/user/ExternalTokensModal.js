import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  Card,
  Form,
} from 'react-bootstrap';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const getAlertClass = type => {
  switch (type) {
    case 'success':
      return 'alert alert-success alert-dismissible';
    case 'error':
      return 'alert alert-danger alert-dismissible';
    default:
      return 'alert alert-info alert-dismissible';
  }
};

export default class ExternalTokensModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      externalTokens: [],
      nmrxivCredentials: {
        firstName: '',
        lastName: '',
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

    this.handleNmrxivCredentialsChange =
      this.handleNmrxivCredentialsChange.bind(this);
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
    const { show } = this.props;
    if (show) {
      this.fetchExternalTokens();
      this.fetchUserProfile();
    }
  }

  componentDidUpdate(prevProps) {
    const { show } = this.props;
    if (show && !prevProps.show) {
      this.fetchExternalTokens();
      this.fetchUserProfile();
    }
  }

  handleNmrxivCredentialsChange(field, value) {
    const { nmrxivCredentials } = this.state;
    this.setState({
      nmrxivCredentials: {
        ...nmrxivCredentials,
        [field]: value,
      },
    });
  }

  handleClose = () => {
    const { onHide } = this.props;
    this.setState(
      {
        isRegistering: false,
        nmrxivCredentials: {
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
        },
      },
      () => onHide()
    );
  };

  async handleSaveSyncPreference() {
    this.setState({ syncPreferenceLoading: true });

    try {
      const { nmrxivSyncEnabled } = this.state;
      const response = await fetch('/api/v1/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token':
            document
              .querySelector('meta[name="csrf-token"]')
              ?.getAttribute('content') || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          data: {
            nmrxiv_sync_enabled: nmrxivSyncEnabled,
          },
        }),
      });

      if (response.ok) {
        this.showModalMessage(
          'NMRXiv sync preference saved successfully!',
          'success'
        );
      } else {
        const errorData = await response.json();
        this.showModalMessage(
          errorData.error || 'Failed to save sync preference',
          'error'
        );
      }
    } catch (error) {
      console.error('Save sync preference error:', error);
      this.showModalMessage(
        'Network error while saving sync preference',
        'error'
      );
    } finally {
      this.setState({ syncPreferenceLoading: false });
    }
  }

  async handleNmrxivLogin() {
    const { nmrxivCredentials } = this.state;

    if (!nmrxivCredentials.email || !nmrxivCredentials.password) {
      this.showModalMessage('Please enter both email and password', 'error');
      return;
    }

    this.setState({ tokenLoading: true });

    try {
      const response = await fetch('/api/v1/external_tokens/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token':
            document
              .querySelector('meta[name="csrf-token"]')
              ?.getAttribute('content') || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: 'nmrxiv',
          credentials: {
            email: nmrxivCredentials.email,
            password: nmrxivCredentials.password,
          },
        }),
      });

      const data = await response.json();
      console.log('Authentication response:', data);
      if (response.ok) {
        this.showModalMessage(
          'Successfully authenticated with NMRXiv!',
          'success'
        );
        this.fetchExternalTokens();
        this.setState({
          nmrxivCredentials: {
            firstName: '',
            lastName: '',
            username: '',
            password: '',
            confirmPassword: '',
            email: '',
          },
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

    if (
      !nmrxivCredentials.firstName ||
      !nmrxivCredentials.lastName ||
      !nmrxivCredentials.username ||
      !nmrxivCredentials.password ||
      !nmrxivCredentials.confirmPassword ||
      !nmrxivCredentials.email
    ) {
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
      const registerResponse = await fetch(
        'https://dev.nmrxiv.org/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: nmrxivCredentials.firstName,
            last_name: nmrxivCredentials.lastName,
            username: nmrxivCredentials.username,
            email: nmrxivCredentials.email,
            password: nmrxivCredentials.password,
            password_confirmation: nmrxivCredentials.confirmPassword,
          }),
        }
      );

      if (registerResponse.ok) {
        this.showModalMessage(
          'Successfully registered with NMRXiv! Please check your email for verification.',
          'success'
        );

        // After successful registration, try to login
        setTimeout(() => {
          this.handleNmrxivLogin();
        }, 2000);
      } else {
        const errorData = await registerResponse.json();
        this.showModalMessage(
          errorData.error || 'Registration failed',
          'error'
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showModalMessage('Network error during registration', 'error');
    } finally {
      this.setState({ tokenLoading: false });
    }
  }

  async handleNmrxivSyncChange(event) {
    this.setState({ nmrxivSyncEnabled: event.target.checked });
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
          'X-CSRF-Token':
            document
              .querySelector('meta[name="csrf-token"]')
              ?.getAttribute('content') || '',
        },
        credentials: 'include',
      });

      if (response.ok) {
        this.showModalMessage(
          `Successfully deleted ${provider} token`,
          'success'
        );
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

  showModalMessage(message, type = 'info') {
    this.setState({ modalMessage: { text: message, type } });
    // Also surface it as a notification
    NotificationActions.add({
      message,
      level: type,
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
        const nmrxivSyncEnabled =
          profileData.data?.nmrxiv_sync_enabled || false;
        this.setState({ nmrxivSyncEnabled });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }

  clearModalMessage() {
    this.setState({ modalMessage: null });
  }

  render() {
    const { show } = this.props;
    const {
      externalTokens,
      nmrxivCredentials,
      isRegistering,
      tokenLoading,
      modalMessage,
    } = this.state;

    if (!show) {
      return null;
    }

    const nmrxivToken = externalTokens.find(
      token => token.provider === 'nmrxiv'
    );

    const styles = {
      grid2Col: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0 24px',
      },
      statusBadge: (valid) => ({
        display: 'inline-block',
        marginLeft: '10px',
        padding: '3px 12px',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '13px',
        backgroundColor: valid ? '#d4edda' : '#f8d7da',
        color: valid ? '#155724' : '#721c24',
      }),
      metaRow: {
        marginBottom: '10px',
      },
      actionRow: {
        marginTop: '18px',
      },
    };

    return (
      <Modal
        show={show}
        onHide={this.handleClose}
        size="xl"
        dialogClassName="external-tokens-modal"
        centered
      >
        <Modal.Header closeButton style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '12px' }}>
          <Modal.Title style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            Repository Integration
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ padding: '24px' }}>
          {modalMessage && (
            <div
              className={getAlertClass(modalMessage.type)}
              style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>{modalMessage.text}</span>
              <button
                type="button"
                className="close"
                onClick={this.clearModalMessage}
                style={{ fontSize: '18px', lineHeight: '1', marginLeft: '12px' }}
              >
                ×
              </button>
            </div>
          )}

          {/* NMRXiv Token Card */}
          <Card border="info" className="mb-3">
            <Card.Header style={{ backgroundColor: '#e8f4f8', fontWeight: 600 }}>
              <Card.Title style={{ marginBottom: 0 }}>NMRXiv Token</Card.Title>
            </Card.Header>
            <Card.Body style={{ padding: '20px 24px' }}>
              {nmrxivToken ? (
                <div>
                  <div style={styles.metaRow}>
                    <strong>Status:</strong>
                    <span style={styles.statusBadge(nmrxivToken.has_valid_token)}>
                      {nmrxivToken.has_valid_token ? '✓ Active' : '✗ Expired'}
                    </span>
                  </div>
                  {nmrxivToken.expires_at && (
                    <div style={styles.metaRow}>
                      <strong>Expires:</strong>{' '}
                      {new Date(nmrxivToken.expires_at).toLocaleString()}
                    </div>
                  )}
                  <div style={styles.metaRow}>
                    <strong>Last Updated:</strong>{' '}
                    {new Date(nmrxivToken.updated_at).toLocaleString()}
                  </div>
                  <div style={styles.actionRow}>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => this.deleteExternalToken('nmrxiv')}
                    >
                      Delete Token
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#6c757d', marginBottom: '16px' }}>
                    No NMRXiv token found. Please authenticate to get access to NMRXiv services.
                  </p>

                  {!isRegistering ? (
                    <div>
                      <h5 style={{ marginBottom: '16px' }}>Login to NMRXiv</h5>
                      <Form>
                        <div style={styles.grid2Col}>
                          <Form.Group className="mb-3">
                            <Form.Label>Registered Email</Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Enter your NMRXiv email"
                              value={nmrxivCredentials.email}
                              onChange={e =>
                                this.handleNmrxivCredentialsChange('email', e.target.value)
                              }
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                              type="password"
                              placeholder="Enter your NMRXiv password"
                              value={nmrxivCredentials.password}
                              onChange={e =>
                                this.handleNmrxivCredentialsChange('password', e.target.value)
                              }
                            />
                          </Form.Group>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Button
                            variant="primary"
                            onClick={this.handleNmrxivLogin}
                            disabled={tokenLoading}
                          >
                            {tokenLoading ? 'Authenticating…' : 'Login'}
                          </Button>
                          <Button
                            variant="link"
                            style={{ padding: 0 }}
                            onClick={() => this.setState({ isRegistering: true })}
                          >
                            Don&apos;t have an account? Register here
                          </Button>
                        </div>
                      </Form>
                    </div>
                  ) : (
                    <div>
                      <h5 style={{ marginBottom: '16px' }}>Register for NMRXiv</h5>
                      <Form>
                        <div style={styles.grid2Col}>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              First Name <span style={{ color: 'red' }}>*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Enter your first name"
                              value={nmrxivCredentials.firstName}
                              onChange={e =>
                                this.handleNmrxivCredentialsChange('firstName', e.target.value)
                              }
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Last Name <span style={{ color: 'red' }}>*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Enter your last name"
                              value={nmrxivCredentials.lastName}
                              onChange={e =>
                                this.handleNmrxivCredentialsChange('lastName', e.target.value)
                              }
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Username <span style={{ color: 'red' }}>*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              placeholder="Choose a username"
                              value={nmrxivCredentials.username}
                              onChange={e =>
                                this.handleNmrxivCredentialsChange('username', e.target.value)
                              }
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Email <span style={{ color: 'red' }}>*</span>
                            </Form.Label>
                            <Form.Control
                              type="email"
                              placeholder="Enter your email address"
                              value={nmrxivCredentials.email}
                              onChange={e =>
                                this.handleNmrxivCredentialsChange('email', e.target.value)
                              }
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Password <span style={{ color: 'red' }}>*</span>
                              <small className="text-muted" style={{ fontWeight: 'normal', marginLeft: '6px' }}>
                                (min. 8 characters)
                              </small>
                            </Form.Label>
                            <Form.Control
                              type="password"
                              placeholder="Enter a password"
                              value={nmrxivCredentials.password}
                              onChange={e =>
                                this.handleNmrxivCredentialsChange('password', e.target.value)
                              }
                            />
                          </Form.Group>
                          <Form.Group className="mb-3">
                            <Form.Label>
                              Confirm Password <span style={{ color: 'red' }}>*</span>
                            </Form.Label>
                            <Form.Control
                              type="password"
                              placeholder="Confirm your password"
                              value={nmrxivCredentials.confirmPassword}
                              onChange={e =>
                                this.handleNmrxivCredentialsChange('confirmPassword', e.target.value)
                              }
                            />
                          </Form.Group>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                          <Button
                            variant="success"
                            onClick={this.handleNmrxivRegister}
                            disabled={tokenLoading}
                          >
                            {tokenLoading ? 'Registering…' : 'Register'}
                          </Button>
                          <Button
                            variant="link"
                            style={{ padding: 0 }}
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
            </Card.Body>
          </Card>

          {/* Publication Sync Info (only when token is present) */}
          {nmrxivToken && (
            <Card border="info" className="mb-3">
              <Card.Header style={{ backgroundColor: '#e8f4f8', fontWeight: 600 }}>
                <Card.Title style={{ marginBottom: 0 }}>NMRXiv Publication Sync</Card.Title>
              </Card.Header>
              <Card.Body style={{ padding: '20px 24px' }}>
                <p style={{ marginBottom: 0 }}>
                  If you log in to NMRXiv and have an active token, your publication will be
                  transferred to NMRXiv automatically once it is published. This process is
                  automatic as long as your token is valid.
                </p>
              </Card.Body>
            </Card>
          )}

          {/* About Card */}
          <Card border="warning" className="mb-3">
            <Card.Header style={{ fontWeight: 600 }}>
              <Card.Title style={{ marginBottom: 0 }}>About External Tokens</Card.Title>
            </Card.Header>
            <Card.Body style={{ padding: '20px 24px' }}>
              <p>
                External tokens allow you to authenticate with third-party services like NMRXiv.
                These tokens are securely encrypted and stored in our system.
              </p>
              <ul style={{ marginBottom: 0 }}>
                <li>
                  <strong>NMRXiv:</strong> Access to NMR data repository and analysis tools
                </li>
                <li>Tokens are automatically refreshed when possible</li>
                <li>You can delete tokens at any time</li>
              </ul>
            </Card.Body>
          </Card>
        </Modal.Body>
      </Modal>
    );
  }
}

ExternalTokensModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
};
