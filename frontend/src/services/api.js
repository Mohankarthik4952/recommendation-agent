import axios from "axios";

// ============================================================
// API CONFIGURATION
// ============================================================

// Vercel:
// VITE_API_URL=https://recommendation-agent-backend.onrender.com
//
// Local fallback:
// http://localhost:5000
//
// The /api prefix is added automatically below.
const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Remove trailing slash(es)
const CLEAN_API_URL = RAW_API_URL.replace(/\/+$/, "");

// Avoid duplicate /api if VITE_API_URL already contains it
const API_BASE_URL = CLEAN_API_URL.endsWith("/api")
  ? CLEAN_API_URL
  : `${CLEAN_API_URL}/api`;

// ============================================================
// AXIOS INSTANCE
// ============================================================

const api = axios.create({
  baseURL: API_BASE_URL,

  headers: {
    "Content-Type": "application/json",
  },

  timeout: 15000,
});

// ============================================================
// REQUEST INTERCEPTOR
// Automatically attach JWT token
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};

      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  },
);

// ============================================================
// RESPONSE INTERCEPTOR
// Handle authentication and API errors
// ============================================================

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status = error.response?.status;

    // --------------------------------------------------------
    // Unauthorized
    // --------------------------------------------------------

    if (status === 401) {
      console.warn("Authentication failed or session expired.");

      localStorage.removeItem("token");
      localStorage.removeItem("customer");
    }

    // --------------------------------------------------------
    // Forbidden
    // --------------------------------------------------------

    if (status === 403) {
      console.warn("You are not authorized to access this resource.");
    }

    // --------------------------------------------------------
    // Not Found
    // --------------------------------------------------------

    if (status === 404) {
      console.warn("Requested API resource was not found:", error.config?.url);
    }

    // --------------------------------------------------------
    // Bad Request
    // --------------------------------------------------------

    if (status === 400) {
      console.warn(
        "Bad API request:",
        error.response?.data?.message || "Invalid request.",
      );
    }

    // --------------------------------------------------------
    // Server Error
    // --------------------------------------------------------

    if (status >= 500) {
      console.error(
        "Backend server error:",
        error.response?.data?.message || "Internal server error.",
      );
    }

    // --------------------------------------------------------
    // Network Error
    // --------------------------------------------------------

    if (!error.response) {
      console.error("Unable to connect to the backend server.");
    }

    return Promise.reject(error);
  },
);

// ============================================================
// DEVELOPMENT DEBUGGING
// ============================================================

if (import.meta.env.DEV) {
  console.log("API Base URL:", API_BASE_URL);
}

// ============================================================
// EXPORT
// ============================================================

export default api;
