const LOCAL_IP = "http://192.168.0.100";

const env = process.env.REACT_APP_NODE_ENV || "production";
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

const isDevelopment =
  env === "development" || hostname === "localhost" || hostname === "127.0.0.1";
const isDesktop = env === "desktop" || hostname === LOCAL_IP;

const apiBase = isDevelopment
  ? process.env.REACT_APP_API_URL_DEV
  : isDesktop
  ? process.env.REACT_APP_API_URL_DESKTOP
  : process.env.REACT_APP_API_URL_PROD;

const FRONTEND_URL = isDevelopment
  ? "http://localhost:3000"
  : isDesktop
  ? `http://${LOCAL_IP}:3000`
  : "https://votechs7academygroup.com";

// Ensure apiBase has a fallback value and is a string
const safeApiBase = apiBase || (isDevelopment ? "http://localhost:5000" : "https://votechs7academygroup.com");

const config = {
  API_URL: safeApiBase.endsWith("/") ? `${safeApiBase}api` : `${safeApiBase}/api`,
  FRONTEND_URL,
  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
};

console.log("API URL:", config.API_URL, env);

export default config;