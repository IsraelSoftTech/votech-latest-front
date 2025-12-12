const LOCAL_IP = "192.168.56.1"; // Default desktop IP

const hostname = typeof window !== "undefined" ? window.location.hostname : "";
const envFromVar = process.env.REACT_APP_NODE_ENV;

// Production domains - if hostname matches these, force production mode
const PRODUCTION_DOMAINS = [
  "votechs7academygroup.com",
  "www.votechs7academygroup.com",
];

// Detect if current hostname is a production domain
const isProductionDomain = PRODUCTION_DOMAINS.some(domain =>
  hostname === domain || hostname.endsWith(`.${domain}`)
);

// Determine environment
const env = isProductionDomain
  ? "production"      // Force production mode on real domain
  : envFromVar || "production";

// Mode checks
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

// API URL configuration (FORCE PRODUCTION URL)
const apiBase = isDevelopment
  ? process.env.REACT_APP_API_URL_DEV || "http://localhost:5000"
  : isDesktop
  ? process.env.REACT_APP_API_URL_DESKTOP || `http://${LOCAL_IP}:5000`
  : "https://api.votechs7academygroup.com"; // 🔥 forced backend URL

// FRONTEND URL
const FRONTEND_URL = isDevelopment
  ? "http://localhost:3000"
  : isDesktop
  ? `http://${LOCAL_IP}:3000`
  : "https://votechs7academygroup.com";

// Construct API URL - ensure no double slashes
const constructApiUrl = (base) => {
  const cleanBase = base.replace(/\/+$/, "");
  return `${cleanBase}/api`;
};

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

// Debug Logging
if (isDevelopment || isDesktop || isProductionDomain) {
  console.log("🔧 Configuration Loaded:");
  console.log("  Environment:", env);
  console.log("  Hostname:", hostname);
  console.log("  Mode:", isDevelopment ? "Development" : isDesktop ? "Desktop" : "Production");
  console.log("  API URL:", config.API_URL);
  console.log("  Frontend URL:", config.FRONTEND_URL);
  if (isProductionDomain) {
    console.log("  ✅ Production domain detected - using production API");
  }
}

export default config;
