// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

const config = {
  // API URL configuration - use local for development, production for live
  API_URL: isDevelopment ? "http://localhost:5000/api" : "https://api.votechs7academygroup.com/api",

  // Frontend URL
  FRONTEND_URL: isDevelopment ? "http://localhost:3000" : "https://api.votechs7academygroup.com/api",
   

  // FTP URL (for reference)
  FTP_URL: "https://st60307.ispot.cc/votechs7academygroup",
};

export default config;
