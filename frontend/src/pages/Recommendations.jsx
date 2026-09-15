import { useEffect, useState } from "react";

import "../index.css";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";

import {
  getRecommendations,
  submitRecommendationFeedback,
} from "../services/recommendationService";

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

  const [currentSeason, setCurrentSeason] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // Stores feedback state for each recommendation.
  //
  // Example:
  // {
  //   "12": "helpful",
  //   "15": "not_helpful"
  // }
  const [feedbackState, setFeedbackState] = useState({});

  // Stores which recommendation is currently submitting feedback.
  const [feedbackLoading, setFeedbackLoading] = useState({});

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
        // Get personalized recommendations
        // ------------------------------------------------------

        const recommendationData = await getRecommendations(customer.id);

        const recommendationList = recommendationData?.recommendations || [];

        // ------------------------------------------------------
        // Current season
        // ------------------------------------------------------

        setCurrentSeason(recommendationData?.current_season || "");

        // ------------------------------------------------------
        // Prepare recommendation products
        // ------------------------------------------------------

        const enrichedRecommendations = recommendationList
          .map((recommendation) => {
            if (!recommendation?.product_id) {
              return null;
            }

            return {
              ...recommendation,

              id: recommendation.product_id,

              recommendationId: recommendation.id,

              recommendationScore: Number(recommendation.score ?? 0),

              recommendationReason:
                recommendation.reason ||
                "This product matches your interests and shopping activity.",

              discount: Number(recommendation.discount ?? 0),

              price: Number(recommendation.price ?? 0),

              seasonalRelevance: Number(recommendation.seasonal_relevance ?? 0),

              discountScore: Number(recommendation.discount_score ?? 0),

              predictedPurchaseProbability: Number(
                recommendation.predicted_purchase_probability ?? 0,
              ),
            };
          })
          .filter(Boolean);

        setRecommendations(enrichedRecommendations);
      } catch (err) {
        console.error("Failed to load recommendations:", err);

        if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else if (err.response?.status === 404) {
          setError("Recommendation service is currently unavailable.");
        } else {
          setError(
            "Unable to load recommendations. Please make sure the backend and ML service are running.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [customer, authLoading]);

  // ============================================================
  // SUBMIT RECOMMENDATION FEEDBACK
  // ============================================================

  const handleFeedback = async (product, feedback) => {
    if (!product?.id) {
      return;
    }

    const feedbackKey = product.recommendationId || product.id;

    // Prevent duplicate clicks while submitting.
    if (feedbackLoading[feedbackKey]) {
      return;
    }

    try {
      setFeedbackLoading((previous) => ({
        ...previous,
        [feedbackKey]: true,
      }));

      await submitRecommendationFeedback({
        recommendationId: product.recommendationId || null,

        productId: product.id,

        feedback,
      });

      // Update UI immediately.
      setFeedbackState((previous) => ({
        ...previous,
        [feedbackKey]: feedback,
      }));
    } catch (err) {
      console.error("Failed to submit recommendation feedback:", err);

      window.alert("Unable to save your feedback. Please try again.");
    } finally {
      setFeedbackLoading((previous) => ({
        ...previous,
        [feedbackKey]: false,
      }));
    }
  };

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
                Personalized recommendations based on your interests, shopping
                behavior, seasonal trends, and available offers.
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
              <p>
                Analyzing your shopping activity and generating personalized
                recommendations...
              </p>
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
                    We analyze your profile, browsing activity, interactions,
                    purchase patterns, product availability, seasonal relevance,
                    and current offers to select products for you.
                  </p>
                </div>
              </div>

              {/* ============================================
                    CURRENT SEASON
                ============================================ */}

              {currentSeason && (
                <div
                  className="explanation-card"
                  style={{
                    marginTop: "16px",
                  }}
                >
                  <div className="explanation-icon">🌦️</div>

                  <div>
                    <h3>Seasonal recommendations</h3>

                    <p>
                      Recommendations are currently being optimized for the{" "}
                      <strong>{currentSeason}</strong> season.
                    </p>
                  </div>
                </div>
              )}

              {/* ============================================
                    RECOMMENDED PRODUCTS
                ============================================ */}

              <div className="section-heading">
                <div>
                  <h2>Recommended for You</h2>

                  <p>Products selected especially for your shopping profile.</p>
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
                    RECOMMENDATION DETAILS
                ============================================ */}

              {recommendations.length > 0 && (
                <div className="recommendation-reasons">
                  <h2>Why These Products?</h2>

                  <div className="reason-list">
                    {recommendations.map((product) => {
                      const matchPercentage = Math.round(
                        product.recommendationScore * 100,
                      );

                      const discount = Number(product.discount || 0);

                      const seasonalRelevance = Number(
                        product.seasonalRelevance || 0,
                      );

                      const purchaseProbability = Number(
                        product.predictedPurchaseProbability || 0,
                      );

                      const feedbackKey =
                        product.recommendationId || product.id;

                      const selectedFeedback = feedbackState[feedbackKey];

                      const isSubmitting = Boolean(
                        feedbackLoading[feedbackKey],
                      );

                      return (
                        <div className="reason-item" key={product.id}>
                          {/* --------------------------------
                                  HEADER
                              -------------------------------- */}

                          <div className="reason-header">
                            <strong>{product.name}</strong>

                            <span>{matchPercentage}% Match</span>
                          </div>

                          {/* --------------------------------
                                  REASON
                              -------------------------------- */}

                          <p>{product.recommendationReason}</p>

                          {/* --------------------------------
                                  PRODUCT SIGNALS
                              -------------------------------- */}

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                              marginTop: "12px",
                            }}
                          >
                            {product.category && (
                              <span>📦 {product.category}</span>
                            )}

                            {product.brand && <span>🏷️ {product.brand}</span>}

                            {discount > 0 && <span>💰 {discount}% OFF</span>}

                            {seasonalRelevance >= 1 && (
                              <span>🌦️ Seasonal Match</span>
                            )}

                            {product.stock > 0 && <span>✓ In Stock</span>}
                          </div>

                          {/* --------------------------------
                                  SCORE DETAILS
                              -------------------------------- */}

                          <div
                            style={{
                              marginTop: "12px",
                              fontSize: "13px",
                              opacity: 0.8,
                            }}
                          >
                            <div>
                              Recommendation score:{" "}
                              <strong>{matchPercentage}%</strong>
                            </div>

                            {purchaseProbability > 0 && (
                              <div>
                                Predicted purchase propensity:{" "}
                                <strong>
                                  {Math.round(purchaseProbability * 100)}%
                                </strong>
                              </div>
                            )}
                          </div>

                          {/* --------------------------------
                                  FEEDBACK
                              -------------------------------- */}

                          <div
                            style={{
                              marginTop: "18px",
                              paddingTop: "14px",
                              borderTop: "1px solid var(--app-line)",
                            }}
                          >
                            <p
                              style={{
                                margin: "0 0 10px",
                                fontSize: "13px",
                                fontWeight: 600,
                              }}
                            >
                              Was this recommendation useful?
                            </p>

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "8px",
                              }}
                            >
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() =>
                                  handleFeedback(product, "helpful")
                                }
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "8px",
                                  border: "1px solid var(--app-line)",
                                  background:
                                    selectedFeedback === "helpful"
                                      ? "var(--app-soft)"
                                      : "var(--app-surface)",
                                  cursor: isSubmitting
                                    ? "not-allowed"
                                    : "pointer",
                                  opacity: isSubmitting ? 0.6 : 1,
                                }}
                              >
                                👍{" "}
                                {selectedFeedback === "helpful"
                                  ? "Helpful ✓"
                                  : "Helpful"}
                              </button>

                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() =>
                                  handleFeedback(product, "not_helpful")
                                }
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "8px",
                                  border: "1px solid var(--app-line)",
                                  background:
                                    selectedFeedback === "not_helpful"
                                      ? "var(--app-soft)"
                                      : "var(--app-surface)",
                                  cursor: isSubmitting
                                    ? "not-allowed"
                                    : "pointer",
                                  opacity: isSubmitting ? 0.6 : 1,
                                }}
                              >
                                👎{" "}
                                {selectedFeedback === "not_helpful"
                                  ? "Not Helpful ✓"
                                  : "Not Helpful"}
                              </button>
                            </div>

                            {selectedFeedback && (
                              <p
                                style={{
                                  margin: "8px 0 0",
                                  fontSize: "12px",
                                  opacity: 0.7,
                                }}
                              >
                                Thanks! Your feedback helps improve future
                                recommendations.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============================================
                    PERSONALIZED OFFER MESSAGE
                ============================================ */}

              {recommendations.some(
                (product) => Number(product.discount || 0) > 0,
              ) && (
                <div
                  className="explanation-card"
                  style={{
                    marginTop: "24px",
                  }}
                >
                  <div className="explanation-icon">🏷️</div>

                  <div>
                    <h3>Personalized offers available</h3>

                    <p>
                      Some of your recommended products currently have
                      discounts. These offers are highlighted because the
                      products also match your shopping interests.
                    </p>
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
