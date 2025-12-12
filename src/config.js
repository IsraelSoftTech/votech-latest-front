const LOCAL_IP = "192.168.56.1"; // Remove http:// prefix for hostname comparison

const env = process.env.REACT_APP_NODE_ENV || "production";
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

const isDevelopment =
  env === "development" || hostname === "localhost" || hostname === "127.0.0.1";
const isDesktop = env === "desktop" || hostname === LOCAL_IP || hostname.includes("192.168");

// API URL configuration with fallbacks
const apiBase = isDevelopment
  ? process.env.REACT_APP_API_URL_DEV || "http://localhost:5000"
  : isDesktop
  ? process.env.REACT_APP_API_URL_DESKTOP || `http://${LOCAL_IP}:5000`
  : process.env.REACT_APP_API_URL_PROD || "https://votechs7academygroup.com";

const FRONTEND_URL = isDevelopment
  ? "http://localhost:3000"
  : isDesktop
  ? `http://${LOCAL_IP}:3000`
  : "https://votechs7academygroup.com";

const config = {
  API_URL: apiBase.endsWith("/") ? `${apiBase}api` : `${apiBase}/api`,
  FRONTEND_URL,
  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
  // Add timeout and error handling info
  API_TIMEOUT: 10000,
};

console.log("API URL:", config.API_URL, env);
console.log("Environment:", env, "Hostname:", hostname, "IsDevelopment:", isDevelopment, "IsDesktop:", isDesktop);

export default config;
