import axios from "axios";
import config from "../../../config";

const api = axios.create({
  baseURL: config.API_V1_URL,
  timeout: config.API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

export const baseURL = config.API_V1_URL;
export const subBaseURL = config.API_URL;

export const headers = () => {
  const token = sessionStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

api.interceptors.request.use((req) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    req.headers = {
      ...req.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return req;
});

export const API_URL = config.API_URL;
export const FTP_URL = config.FTP_URL;

export default api;
