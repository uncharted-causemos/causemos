import axios from 'axios';
import store from '@/store/index';

const API = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Hook in bearer tokens
// See
// - https://medium.com/swlh/handling-access-and-refresh-tokens-using-axios-interceptors-3970b601a5da
API.interceptors.request.use(
  (config) => {
    const token = store.getters['auth/token'];

    if (config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      config.headers = { Authorization: `Bearer ${token}` };
    }
    config.headers.access_token = config.headers.Authorization;
    return config;
  },
  (error) => {
    console.error(error);
  }
);

export default API;
