import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface AuthState {
  name: string | null;
  email: string | null;
  isAuthenticated: boolean;
  userToken: string | null;
}

const state: AuthState = {
  isAuthenticated: false,
  name: null,
  email: null,
  userToken: null,
};

/**
 * Decode the OIDC token for additional information
 * @param token the OIDC token
 * @returns decoded JSON object representing the token
 * @throws an Error if token is not formatted as expected
 */
const decode = (token: string) => {
  // split the string up based on delimiter '.'
  const tokens = token.split('.');

  // retrieve only the 2nd one
  if (tokens.length !== 3) {
    throw new Error('Failed to Decode OIDC Token');
  }
  const infoToken = tokens[1];

  // decode the token
  const decodedToken = window.atob(infoToken);
  return JSON.parse(decodedToken);
};

let timer: NodeJS.Timeout;

const getters: GetterTree<AuthState, any> = {
  isAuthenticated: (state) => state.isAuthenticated,
  userToken: (state) => state.userToken,
};

const actions: ActionTree<AuthState, any> = {
  async fetchSSO({ commit, dispatch, getters }) {
    // Fetch or refresh the access token
    const response =
      getters.userToken !== null
        ? await fetch(
            `/app/redirect_uri?refresh=/silent-check-sso.html&access_token=${getters.userToken}`
          )
        : await fetch('/silent-check-sso.html');

    if (!response.ok) {
      dispatch('logout');
      throw new Error('Authentication Failed');
    }

    const accessToken = response.headers.get('OIDC_access_token');
    const expirationTimestamp = +(response?.headers?.get('OIDC_access_token_expires') ?? 0) * 1000;

    commit('setUserToken', accessToken);

    if (accessToken) {
      try {
        const tokenInfo = decode(accessToken);

        commit('setAuthenticated', true);
        commit('setName', tokenInfo.name);
        commit('setEmail', tokenInfo.email);
      } catch (error) {
        console.error('Unable to decode authentication token for additional user information');
        commit('setAuthenticated', false);
        commit('setName', null);
        commit('setEmail', null);
      }
    }

    const expiresIn = expirationTimestamp - new Date().getTime();
    timer = setTimeout(() => {
      dispatch('autoRenew');
    }, expiresIn);
  },
  logout({ commit }) {
    commit('setUserToken', null);
    commit('setAuthenticated', false);
    commit('setName', null);
    commit('setEmail', null);
    window.location.assign('/logout');
  },
  autoRenew({ dispatch }) {
    clearTimeout(timer);
    dispatch('fetchSSO');
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
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
