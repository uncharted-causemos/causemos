import { ref } from 'vue';
import { defineStore } from 'pinia';
import Keycloak from 'keycloak-js';
import { getKeycloakConfig, getKeycloakInitOptions } from '@/services/KeycloakConfigService';

export const useAuthStore = defineStore('auth', () => {
  const name = ref<string | null>(null);
  const email = ref<string | null>(null);
  const isAuthenticated = ref(false);
  const userToken = ref<string | null>(null);
  const keycloak = ref<Keycloak | null>(null);

  async function initKeycloak() {
    const config = await getKeycloakConfig();
    const initOptions = await getKeycloakInitOptions();
    const kc = new Keycloak(config);

    const authenticated = await kc.init({
      onLoad: 'login-required',
      ...initOptions,
    });

    keycloak.value = kc;
    isAuthenticated.value = authenticated;

    if (authenticated) {
      userToken.value = kc.token ?? null;
      name.value = (kc.tokenParsed as any)?.name ?? null;
      email.value = (kc.tokenParsed as any)?.email ?? null;

      kc.onTokenExpired = () => {
        updateToken();
      };
    }
  }

  async function updateToken() {
    if (keycloak.value) {
      const refreshed = await keycloak.value.updateToken(70);
      if (refreshed) {
        userToken.value = keycloak.value.token ?? null;
      }
    }
  }

  function logout() {
    userToken.value = null;
    isAuthenticated.value = false;
    name.value = null;
    email.value = null;
    if (keycloak.value) {
      keycloak.value.logout();
    }
  }

  return {
    name,
    email,
    isAuthenticated,
    userToken,
    keycloak,
    initKeycloak,
    updateToken,
    logout,
  };
});
