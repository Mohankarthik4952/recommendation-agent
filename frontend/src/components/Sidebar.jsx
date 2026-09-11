import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function Sidebar() {
  const navigate = useNavigate();

  const { logout } = useAuth();

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    logout();

    navigate("/", {
      replace: true,
    });
  };

  return (
    <aside className="sidebar">
      {/* ======================================================
          MENU
      ====================================================== */}

      <div className="sidebar-menu">
        <p className="sidebar-label">MENU</p>

        {/* ====================================================
            DASHBOARD
        ==================================================== */}

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-icon">🏠</span>

          <span>Dashboard</span>
        </NavLink>

        {/* ====================================================
            PRODUCTS
        ==================================================== */}

        <NavLink
          to="/products"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-icon">🛍</span>

          <span>Products</span>
        </NavLink>

        {/* ====================================================
            RECOMMENDATIONS
        ==================================================== */}

        <NavLink
          to="/recommendations"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-icon">✨</span>

          <span>For You</span>
        </NavLink>

        {/* ====================================================
            HISTORY
        ==================================================== */}

        <NavLink
          to="/history"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-icon">📜</span>

          <span>History</span>
        </NavLink>

        {/* ====================================================
            ACCOUNT
        ==================================================== */}

        <p className="sidebar-label sidebar-label-second">ACCOUNT</p>

        {/* ====================================================
            PROFILE
        ==================================================== */}

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? "sidebar-link active" : "sidebar-link"
          }
        >
          <span className="sidebar-icon">👤</span>

          <span>Profile</span>
        </NavLink>
      </div>

      {/* ======================================================
          SIDEBAR BOTTOM
      ====================================================== */}

      <div className="sidebar-bottom">
        {/* ====================================================
            HELP CARD
        ==================================================== */}

        <div className="help-card">
          <div className="help-icon">?</div>

          <div>
            <strong>Need help?</strong>

            <p>We're here for you.</p>
          </div>
        </div>

        {/* ====================================================
            LOGOUT
        ==================================================== */}

        <button type="button" className="logout-button" onClick={handleLogout}>
          <span className="logout-icon">↪</span>

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
