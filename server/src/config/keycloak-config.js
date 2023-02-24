const Keycloak = require('keycloak-connect');

let keycloak;

const keycloakConfig = {
  authServerUrl: process.env.KC_URL,
  sslRequired: 'external',
  resource: process.env.KC_CLIENT_ID,
  confidentialPort: 0,
  bearerOnly: true,
  realm: process.env.KC_REALM,
  verifyTokenAudience: true,
  credentials: {
    secret: process.env.KC_SECRET,
  },
  policyEnforcer: {},
};

function initKeycloak() {
  if (keycloak) {
    return keycloak;
  } else {
    keycloak = new Keycloak({}, keycloakConfig);
    return keycloak;
  }
}

function getKeycloak() {
  if (!keycloak) {
    return initKeycloak();
  }
  return keycloak;
}

module.exports = {
  initKeycloak,
  getKeycloak,
};
