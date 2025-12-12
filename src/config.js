// =========================
// CONFIG.JS (CLEAN + FIXED)
// =========================

// Default desktop LAN IP
const LOCAL_IP = "192.168.56.1";

// Browser hostname
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

// Environment variable from .env file
const envFromVar = process.env.REACT_APP_NODE_ENV;

// Real production domains
const PRODUCTION_DOMAINS = [
  "votechs7academygroup.com",
  "www.votechs7academygroup.com",
  "api.votechs7academygroup.com",
];

// Detect if current hostname is a production domain
const isProductionDomain = PRODUCTION_DOMAINS.some(
  (domain) =>
    hostname === domain ||
    hostname.endsWith(`.${domain}`)
);

// ----------------------------
// DETERMINE ENVIRONMENT
// ----------------------------

// Force production when on live domain
const env = isProductionDomain
  ? "production"
  : envFromVar || "production";

// Mode logic
const isDevelopment =
  !isProductionDomain &&
  (env === "development" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1");

const isDesktop =
  !isProductionDomain &&
  (env === "desktop" ||
    hostname === LOCAL_IP ||
    hostname.includes("192.168"));

// ----------------------------
// BACKEND URL CONFIG
// ----------------------------
const apiBase = isDevelopment
  ? process.env.REACT_APP_API_URL_DEV || "http://localhost:5000"
  : isDesktop
  ? process.env.REACT_APP_API_URL_DESKTOP || `http://${LOCAL_IP}:5000`
  : process.env.REACT_APP_API_URL_PROD ||
    "https://api.votechs7academygroup.com";

// ----------------------------
// FRONTEND URL CONFIG
// ----------------------------
const FRONTEND_URL = isDevelopment
  ? "http://localhost:3000"
  : isDesktop
  ? `http://${LOCAL_IP}:3000`
  : "https://votechs7academygroup.com";

// Clean API URL to avoid double slashes
const constructApiUrl = (base) => {
  const cleanBase = base.replace(/\/+$/, "");
  return `${cleanBase}/api`;
};

// Final config object
const config = {
  API_URL: constructApiUrl(apiBase),
  FRONTEND_URL,
  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
  API_TIMEOUT: 10000,
  ENV: env,
  HOSTNAME: hostname,
  IS_DEVELOPMENT: isDevelopment,
  IS_DESKTOP: isDesktop,
};

// Debug logs
if (isDevelopment || isDesktop || isProductionDomain) {
  console.log("🔧 Configuration Loaded:");
  console.log(" Environment:", env);
  console.log(" Hostname:", hostname);
  console.log(
    " Mode:",
    isDevelopment ? "Development" : isDesktop ? "Desktop/LAN" : "Production"
  );
  console.log(" API URL:", config.API_URL);
  console.log(" Frontend URL:", config.FRONTEND_URL);

  if (isProductionDomain) {
    console.log(" ✅ Production domain detected — using production API");
  }
}

export default config;
