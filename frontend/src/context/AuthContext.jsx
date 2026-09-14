import { createContext, useContext, useEffect, useState } from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==========================================================
  // RESTORE LOGIN AFTER PAGE REFRESH
  // ==========================================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    const loadCurrentCustomer = async () => {
      try {
        const response = await api.get("/api/auth/me");

        setCustomer(response.data.customer);
      } catch (error) {
        console.error("Authentication restore failed:", error);

        localStorage.removeItem("token");
        localStorage.removeItem("customer");

        setCustomer(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentCustomer();
  }, []);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = async (email, password) => {
    const response = await api.post("/api/auth/login", {
      email,
      password,
    });

    const { token, customer: loggedInCustomer } = response.data;

    localStorage.setItem("token", token);

    localStorage.setItem("customer", JSON.stringify(loggedInCustomer));

    setCustomer(loggedInCustomer);

    return response.data;
  };

  // ==========================================================
  // REGISTER
  // ==========================================================

  const register = async (userData) => {
    const response = await api.post("/api/auth/register", userData);

    const { token, customer: newCustomer } = response.data;

    localStorage.setItem("token", token);

    localStorage.setItem("customer", JSON.stringify(newCustomer));

    setCustomer(newCustomer);

    return response.data;
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("customer");

    setCustomer(null);
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        loading,
        login,
        register,
        logout,
        isAuthenticated: Boolean(customer),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
