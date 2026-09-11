import { useEffect, useState } from "react";

import "../index.css";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

import {
  getPurchaseHistory,
  getBrowsingHistory,
} from "../services/historyService";

import { useAuth } from "../context/AuthContext";

function History() {
  const { customer, loading: authLoading } = useAuth();

  const [purchases, setPurchases] = useState([]);
  const [browsingHistory, setBrowsingHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("purchases");

  // ============================================================
  // LOAD HISTORY
  // ============================================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!customer?.id) {
      setLoading(false);
      setError("Unable to identify the logged-in customer.");
      return;
    }

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const [purchaseResponse, browsingResponse] = await Promise.all([
          getPurchaseHistory(customer.id),
          getBrowsingHistory(customer.id),
        ]);

        setPurchases(purchaseResponse?.purchases || []);

        setBrowsingHistory(
          browsingResponse?.browsingHistory || browsingResponse?.history || [],
        );
      } catch (err) {
        console.error("Failed to load history:", err);

        if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError(
            "Unable to load your history. Please make sure the backend is running.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [customer, authLoading]);

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
      month: "short",
      year: "numeric",
    });
  };

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // FORMAT PRICE
  // ============================================================

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString("en-IN");
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
              <p>Loading your history...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="app">
      <Navbar />

      <div className="app-body">
        <Sidebar />

        <main className="main-content">
          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="page-header">
            <div>
              <h1>Your History</h1>

              <p>Track your purchases and browsing activity.</p>
            </div>
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && <div className="error-message">{error}</div>}

          {/* ==================================================
              TABS
          ================================================== */}

          <div className="history-tabs">
            <button
              type="button"
              className={
                activeTab === "purchases" ? "history-tab active" : "history-tab"
              }
              onClick={() => setActiveTab("purchases")}
            >
              🛒 Purchases
              <span>{purchases.length}</span>
            </button>

            <button
              type="button"
              className={
                activeTab === "browsing" ? "history-tab active" : "history-tab"
              }
              onClick={() => setActiveTab("browsing")}
            >
              👁 Browsing History
              <span>{browsingHistory.length}</span>
            </button>
          </div>

          {/* ==================================================
              PURCHASE HISTORY
          ================================================== */}

          {activeTab === "purchases" && (
            <section className="history-section">
              <div className="section-header">
                <div>
                  <h2>Purchase History</h2>

                  <p>Products you have purchased.</p>
                </div>
              </div>

              {purchases.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🛒</div>

                  <h2>No purchases yet</h2>

                  <p>Your purchased products will appear here.</p>
                </div>
              ) : (
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Product</th>

                        <th>Category</th>

                        <th>Quantity</th>

                        <th>Price</th>

                        <th>Total</th>

                        <th>Purchased</th>
                      </tr>
                    </thead>

                    <tbody>
                      {purchases.map((purchase, index) => {
                        const quantity = Number(purchase.quantity || 1);

                        const price = Number(purchase.price || 0);

                        return (
                          <tr key={purchase.id || index}>
                            <td>
                              <div className="history-product">
                                {purchase.image && (
                                  <img
                                    src={purchase.image}
                                    alt={purchase.name || "Product"}
                                  />
                                )}

                                <div>
                                  <strong>
                                    {purchase.name ||
                                      purchase.product_name ||
                                      "Unknown Product"}
                                  </strong>
                                </div>
                              </div>
                            </td>

                            <td>{purchase.category || "—"}</td>

                            <td>{quantity}</td>

                            <td>₹{formatPrice(price)}</td>

                            <td>
                              <strong>₹{formatPrice(price * quantity)}</strong>
                            </td>

                            <td>
                              <div>{formatDate(purchase.purchased_at)}</div>

                              <small>{formatTime(purchase.purchased_at)}</small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              BROWSING HISTORY
          ================================================== */}

          {activeTab === "browsing" && (
            <section className="history-section">
              <div className="section-header">
                <div>
                  <h2>Browsing History</h2>

                  <p>Products you have recently viewed.</p>
                </div>
              </div>

              {browsingHistory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👁</div>

                  <h2>No browsing history</h2>

                  <p>Products you view will appear here.</p>
                </div>
              ) : (
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Product</th>

                        <th>Category</th>

                        <th>Viewed</th>

                        <th>Duration</th>
                      </tr>
                    </thead>

                    <tbody>
                      {browsingHistory.map((item, index) => {
                        return (
                          <tr key={item.id || index}>
                            <td>
                              <div className="history-product">
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={item.name || "Product"}
                                  />
                                )}

                                <div>
                                  <strong>
                                    {item.name ||
                                      item.product_name ||
                                      "Unknown Product"}
                                  </strong>
                                </div>
                              </div>
                            </td>

                            <td>{item.category || "—"}</td>

                            <td>
                              <div>{formatDate(item.viewed_at)}</div>

                              <small>{formatTime(item.viewed_at)}</small>
                            </td>

                            <td>
                              {item.duration !== null &&
                              item.duration !== undefined
                                ? `${item.duration} sec`
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default History;
