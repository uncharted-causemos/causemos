import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const API = axios.create({
  baseURL: '/api',
});

// Hook in bearer tokens
API.interceptors.request.use(
  (config) => {
    const token = useAuthStore().userToken;

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
