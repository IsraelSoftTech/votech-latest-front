const LOCAL_IP = "192.168.0.100";

const ENV = process.env.REACT_APP_NODE_ENV || "production";

const isDevelopment = ENV === "development";
const isDesktop = ENV === "desktop";
const isProduction = ENV === "production";

// Default API base URLs if environment variables are not set
const DEFAULT_API_BASE_URL_DEV = "http://localhost:5000";
const DEFAULT_API_BASE_URL_DESKTOP = `http://${LOCAL_IP}:5000`;
const DEFAULT_API_BASE_URL_PROD = "https://api.votechs7academygroup.com";

const apiBase = isDevelopment
  ? process.env.REACT_APP_API_URL_DEV || DEFAULT_API_BASE_URL_DEV
  : isDesktop
  ? process.env.REACT_APP_API_URL_DESKTOP || DEFAULT_API_BASE_URL_DESKTOP
  : process.env.REACT_APP_API_URL_PROD || DEFAULT_API_BASE_URL_PROD;

// Ensure API_URL includes /api
const API_URL = apiBase?.endsWith("/api") 
  ? apiBase 
  : apiBase?.endsWith("/") 
  ? `${apiBase}api` 
  : `${apiBase}/api`;

const API_V1_URL = `${API_URL}/v1`;

const FRONTEND_URL = isDevelopment
  ? "http://localhost:3000"
  : isDesktop
  ? `http://${LOCAL_IP}:3000`
  : "https://votechs7academygroup.com";

const config = {
  ENV,
  API_URL,
  API_V1_URL,
  FRONTEND_URL,
  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
  API_TIMEOUT: 1000000,
};

console.log(`🔧 ${ENV.toUpperCase()} Mode`);
console.log("  API URL:", API_URL);
console.log("Config", config);

export default config;