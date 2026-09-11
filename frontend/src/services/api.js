import axios from "axios";

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
    // --------------------------------------------------------
    // Unauthorized
    // --------------------------------------------------------

    if (error.response?.status === 401) {
      console.warn("Authentication failed or session expired.");

      localStorage.removeItem("token");
      localStorage.removeItem("customer");
    }

    // --------------------------------------------------------
    // Forbidden
    // --------------------------------------------------------

    if (error.response?.status === 403) {
      console.warn("You are not authorized to access this resource.");
    }

    // --------------------------------------------------------
    // Not Found
    // --------------------------------------------------------

    if (error.response?.status === 404) {
      console.warn("Requested API resource was not found:", error.config?.url);
    }

    // --------------------------------------------------------
    // Server Error
    // --------------------------------------------------------

    if (error.response?.status >= 500) {
      console.error(
        "Backend server error:",
        error.response?.data?.message || "Internal server error",
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

export default api;
