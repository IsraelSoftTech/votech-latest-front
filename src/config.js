const LOCAL_IP = "192.168.56.1"; // Default desktop IP

const env = process.env.REACT_APP_NODE_ENV || "production";
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

const isDevelopment =
  env === "development" || hostname === "localhost" || hostname === "127.0.0.1";
const isDesktop = env === "desktop" || hostname === LOCAL_IP || hostname.includes("192.168");

// API URL configuration with fallbacks
// Production backend can be at:
// - https://votechs7academygroup.com/api (same domain - current default)
// - https://api.votechs7academygroup.com/api (subdomain - set REACT_APP_API_URL_PROD)
// - https://backend.votechs7academygroup.com/api (subdomain - set REACT_APP_API_URL_PROD)
// Override with REACT_APP_API_URL_PROD environment variable if backend is on subdomain
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

// Construct API URL - ensure no double slashes
const constructApiUrl = (base) => {
  const cleanBase = base.replace(/\/+$/, ""); // Remove trailing slashes
  return `${cleanBase}/api`;
};

const config = {
  API_URL: constructApiUrl(apiBase),
  FRONTEND_URL,
  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
  API_TIMEOUT: 10000,
  // Environment info for debugging
  ENV: env,
  HOSTNAME: hostname,
  IS_DEVELOPMENT: isDevelopment,
  IS_DESKTOP: isDesktop,
};

// Enhanced logging for debugging
if (process.env.NODE_ENV !== "production" || isDevelopment || isDesktop) {
  console.log("🔧 Configuration Loaded:");
  console.log("  Environment:", env);
  console.log("  Hostname:", hostname);
  console.log("  Mode:", isDevelopment ? "Development" : isDesktop ? "Desktop" : "Production");
  console.log("  API URL:", config.API_URL);
  console.log("  Frontend URL:", config.FRONTEND_URL);
}

export default config;
