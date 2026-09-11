import { useEffect, useState } from "react";

import "../index.css";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";

import { getProducts } from "../services/productService";
import { getRecommendations } from "../services/recommendationService";

import { useAuth } from "../context/AuthContext";

function Recommendations() {
  // ============================================================
  // AUTHENTICATED CUSTOMER
  // ============================================================

  const { customer, loading: authLoading } = useAuth();

  // ============================================================
  // STATE
  // ============================================================

  const [recommendations, setRecommendations] = useState([]);

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ============================================================
  // LOAD RECOMMENDATIONS
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

    const loadRecommendations = async () => {
      try {
        setLoading(true);
        setError("");

        // ------------------------------------------------------
        // Get recommendations + products
        // ------------------------------------------------------

        const [recommendationData, productData] = await Promise.all([
          getRecommendations(customer.id),
          getProducts(),
        ]);

        const recommendationList = recommendationData?.recommendations || [];

        const productList = productData?.products || [];

        // ------------------------------------------------------
        // Combine recommendation data with product data
        // ------------------------------------------------------

        const enrichedRecommendations = recommendationList
          .map((recommendation) => {
            const product = productList.find(
              (item) => item.id === recommendation.product_id,
            );

            if (!product) {
              return null;
            }

            return {
              ...product,

              recommendationScore: Number(recommendation.score || 0),

              recommendationReason:
                recommendation.reason ||
                "This product matches your interests and shopping activity.",
            };
          })
          .filter(Boolean);

        setRecommendations(enrichedRecommendations);

        setProducts(productList);
      } catch (err) {
        console.error("Failed to load recommendations:", err);

        if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else {
          setError(
            "Unable to load recommendations. Please make sure the backend is running.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [customer, authLoading]);

  // ============================================================
  // LOADING AUTHENTICATION
  // ============================================================

  if (authLoading) {
    return (
      <div className="app">
        <Navbar />

        <div className="app-body">
          <Sidebar />

          <main className="main-content">
            <div className="loading-state">
              <p>Loading your account...</p>
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
              PAGE HEADER
          ================================================== */}

          <div className="page-header">
            <div>
              <h1>For You</h1>

              <p>
                Personalized recommendations based on your interests and
                shopping activity.
              </p>
            </div>
          </div>

          {/* ==================================================
              ERROR
          ================================================== */}

          {!loading && error && (
            <div className="error-state">
              <p>{error}</p>
            </div>
          )}

          {/* ==================================================
              LOADING
          ================================================== */}

          {loading && !error && (
            <div className="loading-state">
              <p>Generating your recommendations...</p>
            </div>
          )}

          {/* ==================================================
              CONTENT
          ================================================== */}

          {!loading && !error && (
            <>
              {/* ============================================
                    PERSONALIZATION EXPLANATION
                ============================================ */}

              <div className="explanation-card">
                <div className="explanation-icon">✨</div>

                <div>
                  <h3>Your recommendations are personalized</h3>

                  <p>
                    These products are selected based on your profile, browsing
                    activity and purchase patterns.
                  </p>
                </div>
              </div>

              {/* ============================================
                    RECOMMENDED PRODUCTS
                ============================================ */}

              <div className="section-heading">
                <div>
                  <h2>Recommended for You</h2>

                  <p>Products selected especially for you.</p>
                </div>
              </div>

              {/* ============================================
                    EMPTY STATE
                ============================================ */}

              {recommendations.length === 0 ? (
                <div className="empty-state">
                  <h3>No recommendations yet</h3>

                  <p>
                    Browse and purchase some products to receive personalized
                    recommendations.
                  </p>
                </div>
              ) : (
                <div className="product-grid">
                  {recommendations.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={{
                        ...product,

                        badge: `${Math.round(
                          product.recommendationScore * 100,
                        )}% Match`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* ============================================
                    RECOMMENDATION REASONS
                ============================================ */}

              {recommendations.length > 0 && (
                <div className="recommendation-reasons">
                  <h2>Understanding Your Recommendations</h2>

                  <div className="reason-list">
                    {recommendations.map((product) => (
                      <div className="reason-item" key={product.id}>
                        <div className="reason-header">
                          <strong>{product.name}</strong>

                          <span>
                            {Math.round(product.recommendationScore * 100)}%
                            Match
                          </span>
                        </div>

                        <p>{product.recommendationReason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Recommendations;
