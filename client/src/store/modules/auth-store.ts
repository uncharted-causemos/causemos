import { GetterTree, MutationTree, ActionTree } from 'vuex';

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
  // const decodedToken = base64Decoder(infoToken);
  return JSON.parse(decodedToken);
};

let timer: NodeJS.Timeout;

interface AuthState {
  userId: string;
  userToken: string | null;
  expires: number | null;
  name: string | null;
  email: string | null;
}

const state: AuthState = {
  userId: '',
  userToken: null,
  expires: null,
  name: null,
  email: null,
};

const getters: GetterTree<AuthState, any> = {
  token: (state) => state.userToken,
  isAuthenticated: (state) => !!state.userToken,
};

const actions: ActionTree<AuthState, any> = {
  async fetchSSO({ commit, state, dispatch }) {
    // Fetch or refresh the access token
    const response =
      state.userToken !== null
        ? await fetch(
            `/app/redirect_uri?refresh=/silent-check-sso.html&access_token=${state.userToken}`
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

        commit('setName', tokenInfo.name);
        commit('setEmail', tokenInfo.email);
      } catch (error) {
        console.error('Unable to decode authentication token for additional user information');
        commit('setName', null);
        commit('setEmail', null);
      }

      // TODO: other info we can gather
      // preferred_username, given_name, family_name, realm_access.roles etc
    }

    const expiresIn = expirationTimestamp - new Date().getTime();
    timer = setTimeout(() => {
      dispatch('autoRenew');
    }, expiresIn);
  },
  logout({ commit }) {
    commit('setUserId', null);
    commit('setUserToken', null);
    commit('setName', null);
    commit('setEmail', null);
    window.location.assign('/logout');
  },
  autoRenew({ dispatch }) {
    console.log('RENEW SSO');
    clearTimeout(timer);
    dispatch('fetchSSO');
  },
};

const mutations: MutationTree<AuthState> = {
  setUserId(state, value) {
    state.userId = value;
  },
  setUserToken(state, value) {
    state.userToken = value;
  },
  setName(state, value) {
    state.name = value;
  },
  setEmail(state, value) {
    state.email = value;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
