import axios from "axios";

const LOCAL_IP = "192.168.56.1"; // hostname only

const env = process.env.REACT_APP_NODE_ENV || "production";
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

const isDevelopment =
  env === "development" || hostname === "localhost" || hostname === "127.0.0.1";

const isDesktop =
  env === "desktop" || hostname === LOCAL_IP || hostname.includes("192.168");

const apiBase = isDevelopment
  ? process.env.REACT_APP_API_URL_DEV
  : isDesktop
  ? process.env.REACT_APP_API_URL_DESKTOP
  : process.env.REACT_APP_API_URL_PROD;

// Build base URLs exactly like config
export const API_URL = apiBase.endsWith("/")
  ? `${apiBase}api`
  : `${apiBase}/api`;

export const baseURL = `${API_URL}/v1/`;
export const subBaseURL = API_URL;

// extra endpoints
export const FTP_URL = "https://st60307.ispot.cc/votechs7academygroup";

// axios instance
const api = axios.create({
  baseURL,
  timeout: 10000, // mirrors config.API_TIMEOUT
  headers: {
    "Content-Type": "application/json",
  },
});

// simple auth header helper
export const headers = () => {
  const token = sessionStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : undefined,
    "Content-Type": "application/json",
  };
};

// token injector (only thing needed)
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// no retry logic, no extra handlers
export default api;

// Debugging (just like your config)
console.log("API URL:", API_URL, env);
