// API utility functions for marks module
import axios from "axios";

// export const baseURL = "http://localhost:5000/api/v1/";
// export const subBaseURL = "http://localhost:5000/api";

// Environment-based API URLs
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
const apiBase = isDevelopment ? 'http://localhost:5000' : 'https://api.votechs7academygroup.com';

export const baseURL = `${apiBase}/api/v1/`;
export const subBaseURL = `${apiBase}/api`;

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const headers = () => {
  const token = sessionStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : undefined,
    "Content-Type": "application/json",
  };
};

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === "ECONNABORTED" && error.message.includes("timeout")) {
      if (!error.config._retry) {
        error.config._retry = true;
        return api(error.config);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
