import axios from "axios";

export const baseURL = "http://localhost:5000/api/v1/";
export const subBaseURL = "http://localhost:5000/api";
const token = sessionStorage.getItem("token");

//TODO: convert to production base url on push, dont forget.🙏🏿

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

// Add the token dynamically before every request
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization; // Just to be safe
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
