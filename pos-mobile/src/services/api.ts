import axios from "axios";
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_URL ||
  "http://192.168.1.12:4000";

// The restaurant_POS Express app mounts all routes under /api/v1
const API_ROOT = API_BASE_URL.endsWith("/api/v1")
  ? API_BASE_URL
  : API_BASE_URL.endsWith("/api")
  ? `${API_BASE_URL}/v1`
  : `${API_BASE_URL}/api/v1`;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export const api = axios.create({
  baseURL: API_ROOT,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "An error occurred";
    console.error("API Error:", message);
    return Promise.reject(error);
  }
);