const LOCAL_IP = "192.168.0.100";

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

const isDesktop = env === "desktop" || hostname === LOCAL_IP;

// Check if we're on production domain
const isProduction = hostname === "votechs7academygroup.com" || 
                     hostname === "www.votechs7academygroup.com" ||
                     hostname.includes("votechs7academygroup.com");

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
// Use production API only if we're actually on production domain
const safeApiBase = apiBase || (isDevelopment ? "http://localhost:5000" : (isProduction ? "https://api.votechs7academygroup.com" : "http://localhost:5000"));

const config = {
  API_URL: safeApiBase.endsWith("/") ? `${safeApiBase}api` : `${safeApiBase}/api`,
  FRONTEND_URL,
  FTP_URL: process.env.REACT_APP_FTP_PUBLIC_BASE_URL || "https://st60307.ispot.cc/votechs7academygroup",
};

console.log("Config loaded:", {
  env,
  hostname,
  isDevelopment,
  isProduction,
  apiBase: apiBase || "not set (using fallback)",
  safeApiBase,
  API_URL: config.API_URL,
  FRONTEND_URL: config.FRONTEND_URL,
  FTP_URL: config.FTP_URL,
});

export default config;