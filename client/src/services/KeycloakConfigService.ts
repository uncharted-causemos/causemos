import axios from 'axios';

const KeycloakAPI = axios.create({
  baseURL: '/api/keycloak',
});

/**
 * Fetches the keycloak configuration from the server that should be passed to the Keycloak constructor.
 */
async function getKeycloakConfig() {
  const response = await KeycloakAPI.get('/config');
  return response.data;
}

/**
 * Fetches the keycloak configuration from the server that should be passed to the Keycloak init function
 */
async function getKeycloakInitOptions() {
  const response = await KeycloakAPI.get('/init-options');
  return response.data;
}

export { getKeycloakConfig, getKeycloakInitOptions };
