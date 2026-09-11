import { useEffect, useState } from "react";

import "../index.css";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

import { getCustomer } from "../services/customerService";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const { customer: authenticatedCustomer, loading: authLoading } = useAuth();

  const [customer, setCustomer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    location: "",
  });

  // ============================================================
  // LOAD CUSTOMER
  // ============================================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!authenticatedCustomer?.id) {
      setLoading(false);
      setError("Unable to identify the logged-in customer.");
      return;
    }

    const loadCustomer = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCustomer(authenticatedCustomer.id);

        if (!response?.success || !response?.customer) {
          setError("Unable to load your profile.");
          return;
        }

        const customerData = response.customer;

        setCustomer(customerData);

        setFormData({
          name: customerData.name || "",
          age: customerData.age ?? "",
          gender: customerData.gender || "",
          location: customerData.location || "",
        });
      } catch (err) {
        console.error("Failed to load customer:", err);

        if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else if (err.response?.status === 403) {
          setError("You are not authorized to view this profile.");
        } else {
          setError("Unable to load your profile.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [authenticatedCustomer, authLoading]);

  // ============================================================
  // HANDLE INPUT
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // CANCEL EDIT
  // ============================================================

  const handleCancel = () => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        age: customer.age ?? "",
        gender: customer.gender || "",
        location: customer.location || "",
      });
    }

    setEditing(false);
  };

  // ============================================================
  // SAVE PROFILE
  // ============================================================

  const handleSave = async () => {
    /*
      Profile editing is intentionally disabled here until
      the backend PUT /api/customers/:id endpoint is confirmed.

      This prevents the frontend from pretending that an
      update succeeded when the backend/database contract
      has not been verified.
    */

    alert(
      "Profile editing will be enabled after the profile update API is connected.",
    );

    setEditing(false);
  };

  // ============================================================
  // GET INITIALS
  // ============================================================

  const getInitials = (name) => {
    if (!name) {
      return "U";
    }

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (authLoading || loading) {
    return (
      <div className="app">
        <Navbar />

        <div className="app-body">
          <Sidebar />

          <main className="main-content">
            <div className="loading-state">
              <p>Loading your profile...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error || !customer) {
    return (
      <div className="app">
        <Navbar />

        <div className="app-body">
          <Sidebar />

          <main className="main-content">
            <div className="empty-state">
              <div className="empty-icon">👤</div>

              <h2>{error || "Profile unavailable"}</h2>

              <p>We couldn't load your profile information.</p>

              <button
                type="button"
                className="primary-button"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============================================================
  // PROFILE
  // ============================================================

  return (
    <div className="app">
      <Navbar />

      <div className="app-body">
        <Sidebar />

        <main className="main-content">
          {/* ==================================================
              PAGE HEADER
          ================================================== */}

          <div className="page-header">
            <div>
              <h1>My Profile</h1>

              <p>Manage your personal information and preferences.</p>
            </div>

            {!editing && (
              <button
                type="button"
                className="primary-button"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {/* ==================================================
              PROFILE HEADER CARD
          ================================================== */}

          <section className="profile-card">
            <div className="profile-avatar-large">
              {getInitials(customer.name)}
            </div>

            <div className="profile-main-info">
              <h2>{customer.name || "Customer"}</h2>

              <p>{customer.email}</p>

              <span className="profile-status">● Active Account</span>
            </div>
          </section>

          {/* ==================================================
              PROFILE INFORMATION
          ================================================== */}

          <section className="profile-section">
            <div className="section-header">
              <div>
                <h2>Personal Information</h2>

                <p>Information used to personalize your shopping experience.</p>
              </div>
            </div>

            <div className="profile-form">
              {/* NAME */}

              <div className="form-group">
                <label htmlFor="name">Full Name</label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>

              {/* EMAIL */}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={customer.email || ""}
                  disabled
                />

                <small>Email address cannot be changed here.</small>
              </div>

              {/* AGE */}

              <div className="form-group">
                <label htmlFor="age">Age</label>

                <input
                  id="age"
                  name="age"
                  type="number"
                  min="1"
                  max="120"
                  value={formData.age}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>

              {/* GENDER */}

              <div className="form-group">
                <label htmlFor="gender">Gender</label>

                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={!editing}
                >
                  <option value="">Select Gender</option>

                  <option value="Male">Male</option>

                  <option value="Female">Female</option>

                  <option value="Other">Other</option>
                </select>
              </div>

              {/* LOCATION */}

              <div className="form-group">
                <label htmlFor="location">Location</label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="City, Country"
                />
              </div>
            </div>

            {/* ==================================================
                EDIT ACTIONS
            ================================================== */}

            {editing && (
              <div className="profile-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSave}
                >
                  Save Changes
                </button>
              </div>
            )}
          </section>

          {/* ==================================================
              ACCOUNT INFORMATION
          ================================================== */}

          <section className="profile-section">
            <div className="section-header">
              <div>
                <h2>Account Information</h2>
              </div>
            </div>

            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span>Customer ID</span>

                <strong>{customer.id}</strong>
              </div>

              <div className="profile-info-item">
                <span>Email</span>

                <strong>{customer.email}</strong>
              </div>

              <div className="profile-info-item">
                <span>Account Created</span>

                <strong>{formatDate(customer.created_at)}</strong>
              </div>
            </div>
          </section>

          {/* ==================================================
              PERSONALIZATION INFO
          ================================================== */}

          <section className="explanation-card">
            <div className="explanation-icon">✨</div>

            <div>
              <h3>Your profile helps personalize recommendations</h3>

              <p>
                Information such as your profile, browsing activity, and
                purchase history can help the recommendation system understand
                your preferences.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Profile;
