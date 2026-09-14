import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../index.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";

import { getProducts } from "../services/productService";
import { getRecommendations } from "../services/recommendationService";

import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const navigate = useNavigate();

  const { customer, loading: authLoading } = useAuth();

  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [recommendationLoading, setRecommendationLoading] = useState(true);

  const [error, setError] = useState("");
  const [recommendationError, setRecommendationError] = useState("");

  // ============================================================
  // LOAD DASHBOARD DATA
  // ============================================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!customer?.id) {
      setLoading(false);
      setRecommendationLoading(false);
      setError("Unable to identify the logged-in customer.");
      return;
    }

    const loadDashboard = async () => {
      // --------------------------------------------------------
      // PRODUCTS
      // --------------------------------------------------------

      try {
        setLoading(true);
        setError("");

        const productResponse = await getProducts();

        setProducts(productResponse?.products || []);
      } catch (err) {
        console.error("Failed to load products:", err);

        setError(
          "Unable to load products. Please make sure the backend is running.",
        );
      } finally {
        setLoading(false);
      }

      // --------------------------------------------------------
      // RECOMMENDATIONS
      // --------------------------------------------------------

      try {
        setRecommendationLoading(true);
        setRecommendationError("");

        const recommendationResponse = await getRecommendations(customer.id);

        setRecommendations(recommendationResponse?.recommendations || []);
      } catch (err) {
        console.error("Failed to load recommendations:", err);

        setRecommendationError(
          "Personalized recommendations are currently unavailable.",
        );
      } finally {
        setRecommendationLoading(false);
      }
    };

    loadDashboard();
  }, [customer, authLoading]);

  // ============================================================
  // FIND RECOMMENDED PRODUCTS
  // ============================================================

  const recommendedProducts = recommendations
    .map((recommendation) => {
      const product = products.find(
        (item) => String(item.id) === String(recommendation.product_id),
      );

      if (!product) {
        return null;
      }

      return {
        ...product,

        recommendationScore: Number(recommendation.score || 0),

        recommendationReason:
          recommendation.reason ||
          "Recommended based on your shopping activity.",
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  // ============================================================
  // TRENDING PRODUCTS
  // ============================================================

  const trendingProducts = products
    .filter(
      (product) =>
        !recommendedProducts.some(
          (recommended) => String(recommended.id) === String(product.id),
        ),
    )
    .slice(0, 3);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (authLoading || loading) {
    return (
      <div className="app">
        <Navbar />

        <div className="app-body">
          <Sidebar />

          <main className="main-content">
            <div className="loading-state">
              <p>Loading your dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: "✨",
      label: "Match Score",
      value: `${Math.max(0, Math.min(100, Number(customer?.loyalty_score ?? 0)))}%`,
    },
    {
      icon: "🛍️",
      label: "Products Viewed",
      value: Number(customer?.products_viewed ?? 0),
    },
    {
      icon: "❤️",
      label: "Saved Items",
      value: Number(customer?.saved_items ?? 0),
    },
    {
      icon: "🛒",
      label: "Purchases",
      value: Number(customer?.previous_purchase_count ?? 0),
    },
  ];

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <div className="app">
      <Navbar />

      <div className="app-body">
        <Sidebar />

        <main className="main-content">
          {/* ==================================================
              WELCOME HEADER
          ================================================== */}

          <section className="dashboard-header">
            <div>
              <p className="dashboard-greeting">Welcome back,</p>

              <h1>{customer?.name || "Customer"} 👋</h1>

              <p className="dashboard-subtitle">
                Discover products picked for you.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/recommendations")}
            >
              ✨ View My Recommendations
            </button>
          </section>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && <div className="error-message">{error}</div>}

          {/* ==================================================
              STATS
          ================================================== */}

          <section className="stats-grid">
            {statCards.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <div className="stat-icon">{stat.icon}</div>

                <div>
                  <span>{stat.label}</span>

                  <strong>{stat.value}</strong>
                </div>
              </div>
            ))}
          </section>

          {/* ==================================================
              PERSONALIZED PICKS
          ================================================== */}

          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Personalized Picks</h2>

                <p>Products selected based on your preferences and activity.</p>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() => navigate("/recommendations")}
              >
                View all →
              </button>
            </div>

            {recommendationLoading ? (
              <div className="loading-state">
                <p>Finding products for you...</p>
              </div>
            ) : recommendationError ? (
              <div className="empty-state compact">
                <div className="empty-icon">✨</div>

                <p>{recommendationError}</p>
              </div>
            ) : recommendedProducts.length === 0 ? (
              <div className="empty-state compact">
                <div className="empty-icon">✨</div>

                <h3>Personalized recommendations are coming soon</h3>

                <p>
                  Browse products and make purchases to build your shopping
                  profile.
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate("/products")}
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="product-grid">
                {recommendedProducts.map((product) => (
                  <div key={product.id} className="recommendation-product">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ==================================================
              TRENDING PRODUCTS
          ================================================== */}

          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Explore Products</h2>

                <p>Discover more products from our catalog.</p>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() => navigate("/products")}
              >
                Browse all →
              </button>
            </div>

            {trendingProducts.length === 0 ? (
              <div className="empty-state compact">
                <div className="empty-icon">🛍️</div>

                <p>No products are available right now.</p>
              </div>
            ) : (
              <div className="product-grid">
                {trendingProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>

          {/* ==================================================
              HOW RECOMMENDATIONS WORK
          ================================================== */}

          <section className="explanation-card">
            <div className="explanation-icon">✨</div>

            <div>
              <h3>How your recommendations work</h3>

              <p>
                Your recommendations can use your profile, browsing activity,
                purchase history, product preferences, and other relevant
                shopping signals.
              </p>
            </div>

            <button
              type="button"
              className="text-button"
              onClick={() => navigate("/recommendations")}
            >
              Learn more →
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
