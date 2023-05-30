import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface AuthState {
  name: string | null;
  email: string | null;
  initials: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const state: AuthState = {
  isAuthenticated: false,
  name: null,
  email: null,
  initials: null,
  isAdmin: false,
};

const getters: GetterTree<AuthState, any> = {
  isAuthenticated: (state) => state.isAuthenticated,
};

const actions: ActionTree<AuthState, any> = {
  async fetchSSO({ commit, dispatch }) {
    // Fetch or refresh the access token
    const response = await fetch('/ua/user');

    const data = await response.json();
    if (response.ok) {
      commit('setAuthenticated', true);
      commit('setName', data.userName);
      commit('email', data.email);
      commit('initials', data.initials);
      commit('isAdmin', data.admin);
    } else {
      dispatch('logout');
      throw new Error('Authentication Failed');
    }
  },
  logout({ commit }) {
    commit('setAuthenticated', false);
    commit('setName', null);
    commit('email', null);
    commit('initials', null);
    commit('isAdmin', false);
    window.location.assign('/logout');
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
  setInitials(state, value) {
    state.initials = value;
  },
  setAdmin(state, value) {
    state.isAdmin = value;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
