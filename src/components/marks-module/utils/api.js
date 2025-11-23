import axios from "axios";

const env = process.env.REACT_APP_NODE_ENV || "production";

const apiBase =
  env === "development"
    ? process.env.REACT_APP_API_URL_DEV
    : env === "desktop"
    ? process.env.REACT_APP_API_URL_DESKTOP
    : process.env.REACT_APP_API_URL_PROD;

export const baseURL = `${apiBase}api/v1/`;
export const subBaseURL = `${apiBase}api`;

console.log("API URL: ", env, apiBase);

const api = axios.create({
  baseURL,
  timeout: 300000,
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
    if (token) config.headers.Authorization = `Bearer ${token}`;
    else delete config.headers.Authorization;
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
