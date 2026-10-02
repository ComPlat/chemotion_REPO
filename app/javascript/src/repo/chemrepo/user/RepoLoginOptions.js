import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Container, Row, Col } from 'react-bootstrap';
import UserStore from 'src/stores/alt/stores/UserStore';
import UserActions from 'src/stores/alt/actions/UserActions';

const providerLabel = (provider, key) => provider?.label || key;

const ProviderButton = ({ providerKey, provider }) => {
  const label = providerLabel(provider, providerKey);
  return (
    <a
      href={`/users/auth/${providerKey}`}
      className="repo-login-provider"
      title={`Continue with ${label}`}
    >
      <span className="repo-login-provider__icon">
        {provider?.icon ? (
          <img
            src={`/images/providers/${provider.icon}`}
            alt={label}
          />
        ) : (
          <i className="fa fa-sign-in" aria-hidden="true" />
        )}
      </span>
      <span className="repo-login-provider__label">
        Continue with <strong>{label}</strong>
      </span>
      <i
        className="fa fa-arrow-right repo-login-provider__arrow"
        aria-hidden="true"
      />
    </a>
  );
};

const RepoLoginOptions = () => {
  const [omniauthProviders, setOmniauthProviders] = useState({});

  const onChange = useCallback((state) => {
    if (state?.omniauthProviders) {
      setOmniauthProviders(state.omniauthProviders);
    }
  }, []);

  useEffect(() => {
    UserStore.listen(onChange);
    UserActions.fetchOmniauthProviders();
    return () => UserStore.unlisten(onChange);
  }, [onChange]);

  const keys = Object.keys(omniauthProviders || {});
  if (keys.length === 0) return null;

  return (
    <Container className="repo-login-options">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <div className="repo-login-options__header">
            <span className="repo-login-options__eyebrow">Single sign-on</span>
            <h4 className="repo-login-options__title">Sign in with your provider</h4>
            <p className="repo-login-options__subtitle">
              Use a trusted identity provider to access Chemotion Repository.
            </p>
          </div>
          <div className="repo-login-options__list">
            {keys.map((key) => (
              <ProviderButton
                key={key}
                providerKey={key}
                provider={omniauthProviders[key]}
              />
            ))}
          </div>
          <div className="repo-login-options__divider">
            <span>or use email &amp; password below</span>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default RepoLoginOptions;

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('LoginOptions');
  if (domElement) {
    ReactDOM.render(<RepoLoginOptions />, domElement);
  }
});
