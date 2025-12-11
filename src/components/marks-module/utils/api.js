import axios from "axios";

const LOCAL_IP = "http://192.168.0.100";

const env = process.env.REACT_APP_NODE_ENV || "production";
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

const LOCAL_IP_HOST = LOCAL_IP.replace(/^https?:\/\//, "").split(":")[0];

const isDevelopment =
  env === "development" ||
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("10.") ||
  hostname.startsWith("172.");

const isDesktop = env === "desktop" || hostname === LOCAL_IP_HOST;

const envApiDev = process.env.REACT_APP_API_URL_DEV;
const envApiDesktop = process.env.REACT_APP_API_URL_DESKTOP;
const envApiProd = process.env.REACT_APP_API_URL_PROD;

const rawApiBase = isDevelopment
  ? envApiDev
  : isDesktop
  ? envApiDesktop
  : envApiProd;

const fallbackDev = "http://localhost:5000";
const fallbackDesktop = LOCAL_IP; // e.g. "http://192.168.0.100"
const fallbackProd = "https://api.votechs7academygroup.com";

const safeApiBase =
  rawApiBase ||
  (isDevelopment ? fallbackDev : isDesktop ? fallbackDesktop : fallbackProd);

// normalize base so it does NOT end with a trailing slash
const normalize = (u) => (u ? u.replace(/\/+$/, "") : u);
const normalizedApiBase = normalize(safeApiBase);

/* --- build API and frontend URLs --- */
const API_URL = `${normalizedApiBase}/api`; // e.g. https://.../api
const FRONTEND_URL = isDevelopment
  ? "http://localhost:3000"
  : isDesktop
  ? `http://${LOCAL_IP_HOST.replace(/\/+$/, "")}:3000`
  : "https://votechs7academygroup.com";

/* extra endpoints you used previously */
const FTP_URL = "https://st60307.ispot.cc/votechs7academygroup";

export const baseURL = `${API_URL}/v1/`; // your axios instance base (matches previous /api/v1)
export const subBaseURL = `${API_URL}`;

/* --- axios instance configured similarly to your original api --- */
const api = axios.create({
  baseURL,
  timeout: 300000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* header helper */
export const headers = () => {
  const token =
    typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
  return {
    Authorization: token ? `Bearer ${token}` : undefined,
    "Content-Type": "application/json",
  };
};

/* request interceptor to attach bearer token */
api.interceptors.request.use(
  (config) => {
    try {
      const token = sessionStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      else delete config.headers.Authorization;
    } catch (err) {
      // safe fallback for SSR or non-browser envs
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* response interceptor with retry-on-timeout (single retry) */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const configRequest = error.config || {};
    // retry once on timeout/ECONNABORTED
    if (
      !configRequest._retry &&
      (error.code === "ECONNABORTED" ||
        (error.message && error.message.includes("timeout")))
    ) {
      configRequest._retry = true;
      try {
        return await api(configRequest);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
