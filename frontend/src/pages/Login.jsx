import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "../index.css";

import { useAuth } from "../context/AuthContext";
function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Side - Branding */}
      <div className="login-brand-section">
        <div className="brand-content">
          <div className="brand-logo">
            <div className="brand-logo-icon">🛍</div>

            <span>RetailAI</span>
          </div>

          <div className="brand-message">
            <h1>
              Shopping that
              <br />
              understands you.
            </h1>

            <p>
              Discover personalized products and offers selected specially for
              your interests, preferences, and shopping behavior.
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">✨</div>

              <div>
                <h3>Personalized Recommendations</h3>

                <p>Products selected based on your shopping behavior.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🎯</div>

              <div>
                <h3>Smarter Shopping</h3>

                <p>Find products that match your interests and needs.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">🔍</div>

              <div>
                <h3>Explainable Recommendations</h3>

                <p>Understand why a product is recommended to you.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-form-section">
        <div className="login-card">
          <div className="mobile-logo">
            <div className="brand-logo-icon">🛍</div>

            <span>RetailAI</span>
          </div>

          <div className="login-header">
            <h2>Welcome back</h2>

            <p>Sign in to continue to your personalized shopping experience.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Email address</label>

              <div className="input-wrapper">
                <span className="input-icon">✉</span>

                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="password-label-row">
                <label htmlFor="password">Password</label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => {
                    alert("Password recovery will be connected later.");
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <div className="input-wrapper">
                <span className="input-icon">🔒</span>

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && <div className="login-error">⚠ {error}</div>}

            {/* Remember me */}
            <div className="remember-row">
              <label className="remember-label">
                <input type="checkbox" />

                <span>Remember me</span>
              </label>
            </div>

            {/* Login button */}
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              <span>→</span>
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          {/* Demo login */}
          <button
            type="button"
            className="demo-login-button"
            onClick={async () => {
              const demoEmail = "karthik@example.com";
              const demoPassword = "demo123";
              setEmail(demoEmail);
              setPassword(demoPassword);
              try {
                setLoading(true);
                setError("");
                await login(demoEmail, demoPassword);
                navigate("/dashboard");
              } catch (err) {
                console.error("Demo login failed:", err);
                setError(
                  err.response?.data?.message ||
                    "Demo login failed. Please try the seeded credentials.",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            Try Demo Account
          </button>

          <p className="login-footer">
            Don't have an account?
            <button
              type="button"
              onClick={() => alert("Registration will be connected later.")}
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
