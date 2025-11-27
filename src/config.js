const LOCAL_IP = "192.168.1.201";

// First, read NODE_ENV
const env = process.env.NODE_ENV;

// Self-detect fallback based on hostname
const hostname = typeof window !== "undefined" ? window.location.hostname : "";

const isDevelopment =
  env === "development" || hostname === "localhost" || hostname === "127.0.0.1";

const isDesktop = env === "desktop" || hostname === LOCAL_IP;

const config = {
  API_URL: isDevelopment
    ? "http://localhost:5000/api"
    : isDesktop
    ? `http://${LOCAL_IP}:5000/api`
    : "https://api.votechs7academygroup.com/api",

  FRONTEND_URL: isDevelopment
    ? "http://localhost:3000"
    : isDesktop
    ? `http://${LOCAL_IP}:3000`
    : "https://votechs7academygroup.com",

  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
};

export default config;
