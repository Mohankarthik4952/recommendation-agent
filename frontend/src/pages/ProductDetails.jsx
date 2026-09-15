import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import "../index.css";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { getProductById } from "../services/productService";
import {
  recordProductView,
  getSavedProductStatus,
  toggleSavedProduct,
} from "../services/historyService";

import { useAuth } from "../context/AuthContext";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { customer, loading: authLoading } = useAuth();

  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // ============================================================
  // LOAD PRODUCT
  // ============================================================

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");
        setProduct(null);

        const response = await getProductById(id);

        if (!response?.success || !response?.product) {
          setError("Product not found.");
          return;
        }

        setProduct(response.product);
      } catch (err) {
        console.error("Failed to load product:", err);

        if (err.response?.status === 404) {
          setError("Product not found.");
        } else if (!err.response) {
          setError("Unable to connect to the backend server.");
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load product. Please try again.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    } else {
      setError("Invalid product ID.");
      setLoading(false);
    }
  }, [id]);

  // ============================================================
  // RECORD PRODUCT VIEW
  // ============================================================

  useEffect(() => {
    if (authLoading || !customer?.id || !id) {
      return;
    }

    const recordView = async () => {
      try {
        await recordProductView({
          productId: id,
          duration: 0,
        });

        // Notify Dashboard that a new view was recorded.
        window.dispatchEvent(new Event("dashboardStatsUpdated"));
      } catch (err) {
        // Viewing a product should never break the page.
        console.error("Failed to record product view:", err);
      }
    };

    recordView();
  }, [customer?.id, authLoading, id]);

  // ============================================================
  // LOAD SAVED STATUS
  // ============================================================

  useEffect(() => {
    if (authLoading || !customer?.id || !id) {
      return;
    }

    const loadSavedStatus = async () => {
      try {
        const response = await getSavedProductStatus(id);

        setSaved(Boolean(response?.saved));
      } catch (err) {
        console.error("Failed to load saved status:", err);

        // If the status cannot be loaded,
        // keep the default unsaved state.
        setSaved(false);
      }
    };

    loadSavedStatus();
  }, [customer?.id, authLoading, id]);

  // ============================================================
  // SAVE / UNSAVE PRODUCT
  // ============================================================

  const handleSave = async () => {
    if (!product) {
      return;
    }

    // ----------------------------------------------------------
    // Require authentication
    // ----------------------------------------------------------

    if (!customer?.id) {
      navigate("/login", {
        state: {
          from: `/product/${id}`,
        },
      });

      return;
    }

    if (saveLoading) {
      return;
    }

    try {
      setSaveLoading(true);

      const response = await toggleSavedProduct(id);

      const newSavedState = Boolean(response?.saved);

      setSaved(newSavedState);

      // --------------------------------------------------------
      // Notify Dashboard
      // --------------------------------------------------------

      window.dispatchEvent(new Event("dashboardStatsUpdated"));
    } catch (err) {
      console.error("Failed to save product:", err);

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to update saved product.";

      alert(message);
    } finally {
      setSaveLoading(false);
    }
  };

  // ============================================================
  // ADD TO CART
  // ============================================================

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    alert(`${product.name} has been added to your cart.`);
  };

  // ============================================================
  // FORMAT PRICE
  // ============================================================

  const formatPrice = (price) => {
    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice)) {
      return "0";
    }

    return numericPrice.toLocaleString("en-IN");
  };

  // ============================================================
  // FORMAT RATING
  // ============================================================

  const formatRating = (rating) => {
    const numericRating = Number(rating);

    if (Number.isNaN(numericRating)) {
      return "0.0";
    }

    return numericRating.toFixed(1);
  };

  // ============================================================
  // STOCK STATUS
  // ============================================================

  const hasStockInformation =
    product?.stock !== undefined && product?.stock !== null;

  const isInStock = hasStockInformation && Number(product.stock) > 0;

  const isOutOfStock = hasStockInformation && Number(product.stock) <= 0;

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="app">
        <Navbar />

        <div className="app-body">
          <Sidebar />

          <main className="main-content">
            <div className="loading-state">
              <p>Loading product...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR / NOT FOUND STATE
  // ============================================================

  if (error || !product) {
    return (
      <div className="app">
        <Navbar />

        <div className="app-body">
          <Sidebar />

          <main className="main-content">
            <div className="empty-state">
              <div className="empty-icon">🛍️</div>

              <h2>{error || "Product not found"}</h2>

              <p>We couldn't find the product you're looking for.</p>

              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/products")}
              >
                Back to Products
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ============================================================
  // PRODUCT DETAILS PAGE
  // ============================================================

  return (
    <div className="app">
      <Navbar />

      <div className="app-body">
        <Sidebar />

        <main className="main-content">
          {/* ==================================================
              BACK BUTTON
          ================================================== */}

          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/products")}
          >
            ← Back to Products
          </button>

          {/* ==================================================
              PRODUCT DETAILS
          ================================================== */}

          <div className="product-details">
            {/* ==================================================
                PRODUCT IMAGE
            ================================================== */}

            <div className="product-details-image">
              {product.image || product.image_url ? (
                <img
                  src={product.image || product.image_url}
                  alt={product.name}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="product-image-placeholder">🛍️</div>
              )}
            </div>

            {/* ==================================================
                PRODUCT INFORMATION
            ================================================== */}

            <div className="product-details-info">
              {/* CATEGORY */}

              <span className="product-details-category">
                {product.category || "Product"}
              </span>

              {/* PRODUCT NAME */}

              <h1>{product.name}</h1>

              {/* RATING */}

              <div className="product-details-rating">
                <span>⭐ {formatRating(product.rating)}</span>

                <span>Customer Rating</span>
              </div>

              {/* PRICE */}

              <div className="product-details-price">
                ₹{formatPrice(product.price)}
              </div>

              {/* DESCRIPTION */}

              <div className="product-details-description">
                <h3>About this product</h3>

                <p>
                  {product.description ||
                    "No product description is available."}
                </p>
              </div>

              {/* STOCK */}

              {hasStockInformation && (
                <div className="product-stock">
                  {isInStock ? (
                    <>
                      <span className="stock-dot">●</span>
                      In Stock
                      {Number(product.stock) <= 10 && (
                        <span> — Only {product.stock} left</span>
                      )}
                    </>
                  ) : (
                    <span>Out of Stock</span>
                  )}
                </div>
              )}

              {/* SEASON */}

              {product.season && (
                <div className="product-season">
                  <span>Season:</span>

                  <strong>{product.season}</strong>
                </div>
              )}

              {/* ==================================================
                  ACTION BUTTONS
              ================================================== */}

              <div className="product-details-actions">
                {/* ADD TO CART */}

                <button
                  type="button"
                  className="primary-button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  🛒 Add to Cart
                </button>

                {/* SAVE */}

                <button
                  type="button"
                  className={saved ? "save-button saved" : "save-button"}
                  onClick={handleSave}
                  disabled={saveLoading}
                  aria-label={
                    saved ? "Remove from saved products" : "Save product"
                  }
                  title={saved ? "Remove from saved" : "Save product"}
                >
                  {saveLoading ? "…" : saved ? "♥" : "♡"}
                </button>
              </div>

              {/* ==================================================
                  PERSONALIZATION EXPLANATION
              ================================================== */}

              <div className="product-recommendation-box">
                <div className="explanation-icon">✨</div>

                <div>
                  <h3>Why you may like this</h3>

                  <p>
                    This product can be considered for your personalized
                    shopping experience based on your interests, browsing
                    activity, and purchase history.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================
              PRODUCT INFORMATION
          ================================================== */}

          <div className="product-extra-section">
            <h2>Product Information</h2>

            <div className="product-info-grid">
              {/* CATEGORY */}

              <div className="product-info-item">
                <span>Category</span>

                <strong>{product.category || "Not available"}</strong>
              </div>

              {/* PRICE */}

              <div className="product-info-item">
                <span>Price</span>

                <strong>₹{formatPrice(product.price)}</strong>
              </div>

              {/* RATING */}

              <div className="product-info-item">
                <span>Rating</span>

                <strong>⭐ {formatRating(product.rating)}</strong>
              </div>

              {/* STOCK */}

              {hasStockInformation && (
                <div className="product-info-item">
                  <span>Availability</span>

                  <strong>{isInStock ? "In Stock" : "Out of Stock"}</strong>
                </div>
              )}

              {/* SEASON */}

              {product.season && (
                <div className="product-info-item">
                  <span>Season</span>

                  <strong>{product.season}</strong>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductDetails;
