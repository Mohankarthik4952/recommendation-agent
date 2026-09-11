-- ============================================
-- Personalized Retail Recommendation Database
-- ============================================

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT,
    age INTEGER,
    gender VARCHAR(30),
    location VARCHAR(100),
    loyalty_score DECIMAL(5, 2) DEFAULT 0,
    previous_purchase_count INTEGER DEFAULT 0,
    avg_purchase_value DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(5, 2) DEFAULT 0,
    rating DECIMAL(2, 1),
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    season VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_purchase_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_purchase_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

-- Browsing History
CREATE TABLE IF NOT EXISTS browsing_history (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER DEFAULT 0,

    CONSTRAINT fk_browsing_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_browsing_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

-- Interaction events used by the recommendation model
CREATE TABLE IF NOT EXISTS customer_interactions (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100),
    interaction_type VARCHAR(30) NOT NULL
        CHECK (interaction_type IN ('view', 'click', 'add_to_cart', 'purchase')),
    device_type VARCHAR(50),
    location VARCHAR(100),
    price DECIMAL(10, 2),
    discount DECIMAL(5, 2) DEFAULT 0,
    search_keywords TEXT,
    rating DECIMAL(2, 1),

    CONSTRAINT fk_interaction_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_interaction_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    score DECIMAL(5, 4),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recommendation_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_recommendation_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_purchases_customer
ON purchases(customer_id);

CREATE INDEX IF NOT EXISTS idx_browsing_customer
ON browsing_history(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer
ON customer_interactions(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_interactions_type
ON customer_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_recommendations_customer
ON recommendations(customer_id);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_brand
ON products(brand);