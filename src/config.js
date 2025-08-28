const config = {
  // API URL configuration - use local for development, production for live
  API_URL:
    process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:5000/api"
      : "https://api.votechs7academygroup.com/api"),

  API_URL: "https://api.votechs7academygroup.com/api",

  // Frontend URL
  FRONTEND_URL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://votechs7academygroup.com",

  // FTP URL (for reference)
  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
};

export default config;
