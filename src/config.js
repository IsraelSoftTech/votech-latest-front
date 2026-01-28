const LOCAL_IP = "192.168.0.100";

const ENV = process.env.REACT_APP_NODE_ENV || "production";

const isDevelopment = ENV === "development";
const isDesktop = ENV === "desktop";

// Default API base URLs if environment variables are not set
const DEFAULT_API_BASE_URL_DEV = "http://localhost:5000";
const DEFAULT_API_BASE_URL_DESKTOP = `http://${LOCAL_IP}:5000`;
const DEFAULT_API_BASE_URL_PROD = "https://api.votechs7academygroup.com";

const API_BASE_URL = isDevelopment
  ? process.env.REACT_APP_API_URL_DEV || DEFAULT_API_BASE_URL_DEV
  : isDesktop
  ? process.env.REACT_APP_API_URL_DESKTOP || DEFAULT_API_BASE_URL_DESKTOP
  : process.env.REACT_APP_API_URL_PROD || DEFAULT_API_BASE_URL_PROD;

const config = {
  API_BASE_URL,
};

export default config;
