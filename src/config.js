const LOCAL_IP = "192.168.0.100";

const env = process.env.REACT_APP_NODE_ENV || "production";
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

const isDevelopment =
  env === "development" || hostname === "localhost" || hostname === "127.0.0.1";
const isDesktop = env === "desktop" || hostname === LOCAL_IP;

const apiBase = isDevelopment
  ? process.env.REACT_APP_API_URL_DEV || "http://localhost:5000"
  : isDesktop
  ? process.env.REACT_APP_API_URL_DESKTOP || `http://${LOCAL_IP}:5000`
  : process.env.REACT_APP_API_URL_PROD || "https://api.votechs7academygroup.com";

const FRONTEND_URL = isDevelopment
  ? "http://localhost:3000"
  : isDesktop
  ? `http://${LOCAL_IP}:3000`
  : "https://votechs7academygroup.com";

const config = {
  API_URL: apiBase.endsWith("/")
    ? `${apiBase}api`
    : `${apiBase}/api`,
  FRONTEND_URL,
  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
};

export default config;
