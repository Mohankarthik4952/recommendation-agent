-- ============================================
-- Seed Customers
-- ============================================

INSERT INTO customers
(id, name, email, password_hash, age, gender, location, loyalty_score, previous_purchase_count, avg_purchase_value)
VALUES
(
    'CUST001',
    'Karthik',
    'karthik@example.com',
    '$2a$10$QY9g2o0Y5QwK9Y7v8hu9g.4cH6lY/0lM7xE5plEd3Jw5u5Mtt1Q6S',
    22,
    'Male',
    'Bengaluru, India',
    0.72,
    4,
    2489.50
)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- Seed Products
-- ============================================

INSERT INTO products
(id, name, description, category, brand, price, discount, rating, image_url, stock, season)
VALUES

(
    'P101',
    'Noise Cancelling Headphones',
    'Premium wireless headphones with immersive sound and comfortable ear cushions.',
    'Electronics',
    'Sony',
    2999,
    10,
    4.5,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    50,
    'All'
),

(
    'P102',
    'Smart Watch',
    'Smart watch with fitness tracking, notifications and health monitoring features.',
    'Electronics',
    'Samsung',
    4999,
    12,
    4.6,
    'https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=800&q=80',
    35,
    'All'
),

(
    'P103',
    'Velocity Running Shoes',
    'Lightweight running shoes designed for comfort, grip and everyday workouts.',
    'Apparel',
    'Nike',
    2499,
    15,
    4.3,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    40,
    'All'
),

(
    'P104',
    'Urban Travel Backpack',
    'Durable travel backpack with multiple compartments for work and travel.',
    'Sports',
    'Puma',
    1899,
    8,
    4.4,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    25,
    'Travel'
),

(
    'P105',
    'Mechanical Keyboard',
    'Mechanical keyboard with tactile switches and a comfortable typing experience.',
    'Electronics',
    'LG',
    3499,
    18,
    4.7,
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    30,
    'All'
),

(
    'P106',
    'Performance Sports Jacket',
    'Stylish sports jacket suitable for outdoor activities and casual wear.',
    'Sports',
    'Adidas',
    2799,
    20,
    4.2,
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
    20,
    'Winter'
),

(
    'P107',
    'Core Cotton T-Shirt',
    'Comfortable cotton T-shirt suitable for everyday casual wear.',
    'Apparel',
    'Nike',
    899,
    10,
    4.1,
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    80,
    'Summer'
),

(
    'P108',
    'Coffee Maker',
    'Compact coffee maker for preparing fresh coffee at home.',
    'Home',
    'Samsung',
    3299,
    12,
    4.4,
    'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80',
    15,
    'All'
),

(
    'P109',
    'Gaming Mouse',
    'High-precision gaming mouse designed for responsive gaming performance.',
    'Electronics',
    'Apple',
    1499,
    9,
    4.6,
    'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=800&q=80',
    45,
    'All'
),

(
    'P110',
    'Glow Serum',
    'Hydrating beauty serum for daily skincare and glow enhancement.',
    'Beauty',
    'LG',
    1299,
    14,
    4.5,
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    60,
    'All'
)

ON CONFLICT (id) DO NOTHING;


-- ============================================
-- Seed Purchase History
-- ============================================

INSERT INTO purchases
(customer_id, product_id, quantity, price, purchased_at)
VALUES

(
    'CUST001',
    'P109',
    1,
    1499,
    '2026-09-05 10:00:00'
),

(
    'CUST001',
    'P105',
    1,
    3499,
    '2026-09-02 15:30:00'
),

(
    'CUST001',
    'P103',
    1,
    2499,
    '2026-08-28 12:15:00'
),

(
    'CUST001',
    'P104',
    1,
    1899,
    '2026-08-19 18:00:00'
);


-- ============================================
-- Seed Browsing History
-- ============================================

INSERT INTO browsing_history
(customer_id, product_id, viewed_at, duration)
VALUES

(
    'CUST001',
    'P101',
    '2026-09-10 09:15:00',
    120
),

(
    'CUST001',
    'P102',
    '2026-09-09 19:40:00',
    90
),

(
    'CUST001',
    'P106',
    '2026-09-08 14:30:00',
    60
),

(
    'CUST001',
    'P109',
    '2026-09-07 16:20:00',
    150
),

(
    'CUST001',
    'P108',
    '2026-09-05 11:00:00',
    75
);


-- ============================================
-- Seed Model Interaction Data
-- ============================================

INSERT INTO customer_interactions
(customer_id, product_id, timestamp, session_id, interaction_type, device_type, location, price, discount, search_keywords, rating)
VALUES
(
    'CUST001',
    'P101',
    '2026-09-10 09:15:00',
    'sess_001',
    'view',
    'mobile',
    'Bengaluru, India',
    2999,
    10,
    'wireless headphones, bluetooth audio',
    4.5
),

(
    'CUST001',
    'P102',
    '2026-09-09 19:40:00',
    'sess_002',
    'click',
    'mobile',
    'Bengaluru, India',
    4999,
    12,
    'smartwatch fitness tracking',
    4.6
),

(
    'CUST001',
    'P103',
    '2026-09-08 14:30:00',
    'sess_003',
    'add_to_cart',
    'desktop',
    'Bengaluru, India',
    2499,
    15,
    'running shoes men',
    4.3
),

(
    'CUST001',
    'P109',
    '2026-09-05 10:00:00',
    'sess_004',
    'purchase',
    'desktop',
    'Bengaluru, India',
    1499,
    9,
    'gaming mouse wireless',
    4.6
);