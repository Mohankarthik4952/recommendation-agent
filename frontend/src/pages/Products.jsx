import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import "../index.css";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";

import { getProducts } from "../services/productService";

function Products() {
  // ============================================================
  // URL SEARCH PARAMETERS
  // ============================================================

  const [searchParams, setSearchParams] = useSearchParams();

  // ============================================================
  // STATE
  // ============================================================

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState(searchParams.get("search") || "");

  const [category, setCategory] = useState("All");

  const [sort, setSort] = useState("default");

  // ============================================================
  // LOAD PRODUCTS FROM BACKEND
  // ============================================================

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getProducts();

        setProducts(data.products || []);
      } catch (err) {
        console.error("Failed to load products:", err);

        setError(
          "Unable to load products. Please make sure the backend is running.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // ============================================================
  // CATEGORIES
  // ============================================================

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(products.map((product) => product.category).filter(Boolean)),
    ];

    return ["All", ...uniqueCategories];
  }, [products]);

  // ============================================================
  // FILTER + SEARCH + SORT
  // ============================================================

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // ----------------------------------------------------------
    // SEARCH
    // ----------------------------------------------------------

    const searchValue = search.trim().toLowerCase();

    if (searchValue) {
      result = result.filter((product) => {
        const name = product.name?.toLowerCase() || "";

        const description = product.description?.toLowerCase() || "";

        const productCategory = product.category?.toLowerCase() || "";

        return (
          name.includes(searchValue) ||
          description.includes(searchValue) ||
          productCategory.includes(searchValue)
        );
      });
    }

    // ----------------------------------------------------------
    // CATEGORY
    // ----------------------------------------------------------

    if (category !== "All") {
      result = result.filter((product) => product.category === category);
    }

    // ----------------------------------------------------------
    // SORT
    // ----------------------------------------------------------

    if (sort === "price-low") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    }

    if (sort === "price-high") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    if (sort === "rating") {
      result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    return result;
  }, [products, search, category, sort]);

  // ============================================================
  // SEARCH HANDLER
  // ============================================================

  const handleSearchChange = (value) => {
    setSearch(value);

    if (value.trim()) {
      setSearchParams({
        search: value,
      });
    } else {
      setSearchParams({});
    }
  };

  // ============================================================
  // PRICE FORMATTER
  // ============================================================

  const formatPrice = (price) => {
    const numericPrice = Number(price || 0);

    return numericPrice.toLocaleString("en-IN");
  };

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
              <h1>Products</h1>

              <p>Explore our complete product catalog.</p>
            </div>
          </div>

          {/* ==================================================
              SEARCH + FILTERS
          ================================================== */}

          <div className="product-filters">
            {/* Search */}

            <div className="products-search">
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Category */}

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="filter-select"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {/* Sort */}

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="filter-select"
            >
              <option value="default">Sort: Default</option>

              <option value="price-low">Price: Low to High</option>

              <option value="price-high">Price: High to Low</option>

              <option value="rating">Rating: High to Low</option>
            </select>
          </div>

          {/* ==================================================
              RESULT COUNT
          ================================================== */}

          {!loading && !error && (
            <div className="products-result-info">
              <p>
                Showing <strong>{filteredProducts.length}</strong> of{" "}
                <strong>{products.length}</strong> products
              </p>
            </div>
          )}

          {/* ==================================================
              LOADING
          ================================================== */}

          {loading && (
            <div className="loading-state">
              <p>Loading products...</p>
            </div>
          )}

          {/* ==================================================
              ERROR
          ================================================== */}

          {!loading && error && (
            <div className="error-state">
              <h3>Unable to load products</h3>

              <p>{error}</p>
            </div>
          )}

          {/* ==================================================
              PRODUCTS
          ================================================== */}

          {!loading && !error && (
            <>
              {filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>

                  <h3>No products found</h3>

                  <p>Try changing your search or category filter.</p>

                  <button
                    className="secondary-button"
                    onClick={() => {
                      setSearch("");
                      setCategory("All");
                      setSort("default");
                      setSearchParams({});
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="product-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={{
                        ...product,
                        price: Number(product.price || 0),
                        rating: Number(product.rating || 0),
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Products;
