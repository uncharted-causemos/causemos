const Keycloak = require('keycloak-connect');

let keycloak;

const keycloakConfig = {
  'auth-server-url': `${process.env.KC_SERVICE_PROTOCOL}://${process.env.KC_SERVICE_FQDN}${process.env.KC_SERVICE_PORT}`,
  'ssl-required': 'external',
  resource: process.env.KC_CLIENT_ID,
  'confidential-port': 0,
  'bearer-only': false,
  realm: process.env.KC_REALM,
  'verify-token-audience': true,
  credentials: {
    secret: process.env.KC_SECRET,
  },
  'policy-enforcer': {},
};

function initKeycloak(options) {
  if (keycloak) {
    return keycloak;
  } else {
    keycloak = new Keycloak(options || {}, keycloakConfig);
    return keycloak;
  }
}

function getKeycloak(options) {
  if (!keycloak) {
    return initKeycloak(options);
  }
  return keycloak;
}

module.exports = {
  initKeycloak,
  getKeycloak,
};
