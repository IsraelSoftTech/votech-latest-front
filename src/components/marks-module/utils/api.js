import axios from "axios";

const env = process.env.REACT_APP_NODE_ENV || "production";
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

// Detect environment based on hostname first (most reliable), then env variable
const isDevelopment =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("10.") ||
  hostname.startsWith("172.") ||
  env === "development";

// Check if we're on production domain
const isProduction = hostname === "votechs7academygroup.com" || 
                     hostname === "www.votechs7academygroup.com" ||
                     hostname.includes("votechs7academygroup.com");

const apiBase =
  isDevelopment
    ? process.env.REACT_APP_API_URL_DEV
    : env === "desktop"
    ? process.env.REACT_APP_API_URL_DESKTOP
    : process.env.REACT_APP_API_URL_PROD;

// Ensure apiBase has a fallback value
// Use production API only if we're actually on production domain
const safeApiBase = apiBase || (isDevelopment ? "http://localhost:5000" : (isProduction ? "https://api.votechs7academygroup.com" : "http://localhost:5000"));

export const baseURL = `${safeApiBase}/api/v1/`;
export const subBaseURL = `${safeApiBase}/api`;

console.log("Marks Module API loaded:", {
  env,
  hostname,
  isDevelopment,
  isProduction,
  apiBase: apiBase || "not set (using fallback)",
  safeApiBase,
  baseURL,
  subBaseURL,
});

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
