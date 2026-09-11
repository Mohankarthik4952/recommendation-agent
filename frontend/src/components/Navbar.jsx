import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const { customer } = useAuth();

  const [search, setSearch] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();

    if (!search.trim()) return;

    navigate(`/products?search=${encodeURIComponent(search)}`);
  };

  return (
    <header className="navbar">
      {/* Logo */}

      <div className="logo" onClick={() => navigate("/dashboard")}>
        <div className="logo-icon">🛍</div>

        <span>RetailAI</span>
      </div>

      {/* Search */}

      <form className="search-container" onSubmit={handleSearch}>
        <span className="search-icon">🔍</span>

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {/* Right actions */}

      <div className="navbar-actions">
        <button className="notification-button" type="button">
          🔔
        </button>

        <button
          className="profile-button"
          onClick={() => navigate("/profile")}
          type="button"
        >
          <span className="profile-avatar">
            {(customer?.name || "A").charAt(0).toUpperCase()}
          </span>

          <span className="profile-name">{customer?.name || "Account"}</span>

          <span>▾</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
