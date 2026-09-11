import { useNavigate } from "react-router-dom";

function ProductCard({ product }) {
  const navigate = useNavigate();

  if (!product) {
    return null;
  }

  const price = Number(product.price || 0);
  const rating = Number(product.rating || 0);

  return (
    <article
      className="product-card"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {product.badge && <span className="product-badge">{product.badge}</span>}

      <img
        src={
          product.image_url ||
          "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80"
        }
        alt={product.name}
        className="product-image"
      />

      <div className="product-info">
        <div className="product-meta-row">
          <span className="product-category">
            {product.category || "General"}
          </span>
          <span className="product-brand">{product.brand || "Featured"}</span>
        </div>

        <h3>{product.name}</h3>

        <p className="product-description">
          {product.description || "Popular product picked for you."}
        </p>

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
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/products/${product.id}`);
            }}
          >
            View
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
