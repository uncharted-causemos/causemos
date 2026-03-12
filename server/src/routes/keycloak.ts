import express from 'express';

const router = express.Router();

/**
 * Gets the keycloak configuration for the client. Should be used in the constructor of the keycloak-js adapter.
 * @return The keycloak configuration for the client.
 */
router.get('/config', (req, res) => {
  res.json({
    url: process.env.KC_FQDN,
    realm: process.env.KC_REALM,
    clientId: process.env.KC_CLIENT_ID,
  });
});

/**
 * Gets the keycloak configuration for the client. Should be used in the init function of the keycloak-js adapter.
 * These only provide the static values. Any callbacks should be handled in the client.
 * @return The keycloak init options for the client.
 */
router.get('/init-options', (req, res) => {
  res.json({
    // Standard init options for keycloak-js
    pkceMethod: 'S256',
    checkLoginIframe: false,
    // Use query string for OAuth redirect params so they don't get appended
    // after the hash fragment (which breaks hash-based routing)
    responseMode: 'query',
  });
});

export default router;
