import { GetterTree, MutationTree, ActionTree } from 'vuex';
import Keycloak from 'keycloak-js';
import { getKeycloakConfig, getKeycloakInitOptions } from '@/services/KeycloakConfigService';

interface AuthState {
  name: string | null;
  email: string | null;
  isAuthenticated: boolean;
  userToken: string | null;
  keycloak: Keycloak | null;
}

const state: AuthState = {
  isAuthenticated: false,
  name: null,
  email: null,
  userToken: null,
  keycloak: null,
};

const getters: GetterTree<AuthState, any> = {
  isAuthenticated: (state) => state.isAuthenticated,
  userToken: (state) => state.userToken,
  name: (state) => state.name,
  keycloak: (state) => state.keycloak,
};

const actions: ActionTree<AuthState, any> = {
  async initKeycloak({ commit, dispatch }) {
    const config = await getKeycloakConfig();
    const initOptions = await getKeycloakInitOptions();
    const keycloak = new Keycloak(config);

    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      ...initOptions,
    });

    commit('setKeycloak', keycloak);
    commit('setAuthenticated', authenticated);

    if (authenticated) {
      commit('setUserToken', keycloak.token);
      // @ts-ignore
      commit('setName', keycloak.tokenParsed?.name);
      // @ts-ignore
      commit('setEmail', keycloak.tokenParsed?.email);

      // Token refresh logic
      keycloak.onTokenExpired = () => {
        dispatch('updateToken');
      };
    }
  },
  async updateToken({ state, commit }) {
    if (state.keycloak) {
      const refreshed = await state.keycloak.updateToken(70);
      if (refreshed) {
        commit('setUserToken', state.keycloak.token);
      }
    }
  },
  logout({ state, commit }) {
    commit('setUserToken', null);
    commit('setAuthenticated', false);
    commit('setName', null);
    commit('setEmail', null);
    if (state.keycloak) {
      state.keycloak.logout();
    }
  },
};

const mutations: MutationTree<AuthState> = {
  setAuthenticated(state, value) {
    state.isAuthenticated = value;
  },
  setName(state, value) {
    state.name = value;
  },
  setEmail(state, value) {
    state.email = value;
  },
  setUserToken(state, value) {
    state.userToken = value;
  },
  setKeycloak(state, value) {
    state.keycloak = value;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
