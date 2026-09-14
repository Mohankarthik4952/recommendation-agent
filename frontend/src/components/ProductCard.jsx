import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Direct image URL used when a product image is missing or unavailable.
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1632247541401-3d4a8d516595?auto=format&fit=crop&w=800&q=80";

function ProductCard({ product }) {
  const navigate = useNavigate();

  if (!product) {
    return null;
  }

  const price = Number(product.price || 0);
  const rating = Number(product.rating || 0);

  // Use image_url from PostgreSQL first, then image if available.
  const initialImage = product.image_url || product.image || FALLBACK_IMAGE;

  const [imageSrc, setImageSrc] = useState(initialImage);

  // If the image URL fails, use the fallback image.
  const handleImageError = () => {
    if (imageSrc !== FALLBACK_IMAGE) {
      setImageSrc(FALLBACK_IMAGE);
    }
  };

  // Open product details page.
  const handleCardClick = () => {
    navigate(`/products/${product.id}`);
  };

  // Open product details without triggering the card click.
  const handleViewClick = (event) => {
    event.stopPropagation();
    navigate(`/products/${product.id}`);
  };

  return (
    <article className="product-card" onClick={handleCardClick}>
      {/* Product badge */}
      {product.badge && <span className="product-badge">{product.badge}</span>}

      {/* Product image */}
      <img
        src={imageSrc}
        alt={product.name || "Product"}
        className="product-image"
        onError={handleImageError}
        loading="lazy"
      />

      {/* Product information */}
      <div className="product-info">
        {/* Category and brand */}
        <div className="product-meta-row">
          <span className="product-category">
            {product.category || "General"}
          </span>

          <span className="product-brand">{product.brand || "Featured"}</span>
        </div>

        {/* Product name */}
        <h3>{product.name || "Unnamed Product"}</h3>

        {/* Product description */}
        <p className="product-description">
          {product.description || "Popular product picked for you."}
        </p>

        {/* Price, rating and View button */}
        <div className="product-footer">
          <div>
            <span className="product-price">
              ₹{price.toLocaleString("en-IN")}
            </span>

            <span className="product-rating">⭐ {rating.toFixed(1)}</span>
          </div>

          <button
            type="button"
            className="primary-button small"
            onClick={handleViewClick}
          >
            View
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
