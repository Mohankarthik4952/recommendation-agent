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
    '$2b$10$Rdp0hAa4tYTvjqSaXT81Re15CZ4AiXuS0j5ZboVCL9KliF6ao6rCi',
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
),

(
    'P111',
    'Ergo Laptop Stand',
    'Adjustable stand designed to keep workstations comfortable and organized.',
    'Office',
    'Dell',
    2499,
    11,
    4.4,
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    30,
    'All'
),

(
    'P112',
    'Cloud Office Chair',
    'Supportive ergonomic chair with premium cushioning for all-day comfort.',
    'Furniture',
    'Herman Miller',
    13999,
    18,
    4.8,
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    20,
    'All'
),

(
    'P113',
    'Power Blender',
    'High-speed blender optimized for smoothies, shakes and quick meals.',
    'Home',
    'Philips',
    4599,
    13,
    4.6,
    'https://unsplash.com/photos/a-blender-sitting-on-top-of-a-counter-next-to-a-bowl-of-fruit-and-tu5Wzl7fMi8',
    26,
    'All'
),

(
    'P114',
    'Bluetooth Speaker',
    'Portable speaker with rich bass, deep clarity, and wireless connectivity.',
    'Electronics',
    'JBL',
    3899,
    17,
    4.7,
    'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=800&q=80',
    24,
    'All'
),

(
    'P115',
    'Active Fitness Band',
    'Smart band for heart rate, sleep tracking and daily wellness insights.',
    'Wearables',
    'Fitbit',
    2999,
    14,
    4.5,
    'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80',
    42,
    'All'
),

(
    'P116',
    'Polarized Sunglasses',
    'UV-protected sunglasses with a lightweight and modern frame.',
    'Accessories',
    'Ray-Ban',
    3199,
    10,
    4.3,
    'https://images.unsplash.com/photo-1577803947579-9f7b0d2f59d1?auto=format&fit=crop&w=800&q=80',
    48,
    'Summer'
),

(
    'P117',
    'Compact Travel Camera',
    'Pocket-friendly camera for quick snapshots and everyday photography.',
    'Electronics',
    'Canon',
    7999,
    16,
    4.7,
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    18,
    'Travel'
),

(
    'P118',
    'Minimal Desk Lamp',
    'Soft ambient desk lamp with elegant design and adjustable brightness.',
    'Home',
    'IKEA',
    1899,
    12,
    4.2,
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    28,
    'All'
),

(
    'P119',
    'Trail Running Sneakers',
    'Flexible performance sneakers designed for daily movement and outdoor runs.',
    'Apparel',
    'Puma',
    3299,
    21,
    4.6,
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80',
    38,
    'All'
),

(
    'P120',
    'Everyday Hoodie',
    'Soft-touch hoodie built for comfort, layering, and casual everyday wear.',
    'Apparel',
    'Levi''s',
    2499,
    19,
    4.4,
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    52,
    'Winter'
),

(
    'P121',
    'Electric Kettle',
    'Quick-boil kettle with safe-touch body and a space-saving design.',
    'Kitchen',
    'Philips',
    2199,
    9,
    4.5,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    32,
    'All'
),

(
    'P122',
    'Wireless Earbuds',
    'Compact earbuds with premium sound, deep bass and all-day battery life.',
    'Electronics',
    'OnePlus',
    4999,
    15,
    4.7,
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
    46,
    'All'
),

(
    'P123',
    'Cordless Vacuum',
    'Compact vacuum cleaner for quick home cleaning with hassle-free charging.',
    'Home',
    'Dyson',
    18999,
    12,
    4.8,
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    14,
    'All'
),

(
    'P124',
    'Glow Ritual Kit',
    'Daily skin regimen for hydration, radiance and a soft healthy finish.',
    'Beauty',
    'The Body Shop',
    3599,
    18,
    4.6,
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    40,
    'All'
),

(
    'P125',
    'City Sling Bag',
    'Lightweight sling bag designed for quick daily carry and travel essentials.',
    'Accessories',
    'Herschel',
    2599,
    16,
    4.4,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    35,
    'Travel'
),

(
    'P126',
    'Yoga Exercise Mat',
    'Comfortable yoga mat for home workouts, stretching, and low-impact exercise.',
    'Fitness',
    'Nike',
    1999,
    12,
    4.3,
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
    55,
    'All'
),

(
    'P127',
    'Ceramic Coffee Mug',
    'Premium ceramic mug for hot beverages and daily desk routines.',
    'Kitchen',
    'Hario',
    899,
    8,
    4.2,
    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80',
    70,
    'All'
),

(
    'P128',
    'Classic Watch Strap',
    'Premium replacement strap that upgrades looks and comfort instantly.',
    'Accessories',
    'Apple',
    2499,
    10,
    4.5,
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80',
    22,
    'All'
),

(
    'P129',
    'Travel Adapter',
    'Universal power adapter built for international travel and everyday charging.',
    'Travel',
    'Belkin',
    1499,
    11,
    4.4,
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
    29,
    'Travel'
),

(
    'P130',
    'Air Purifier',
    'Compact air purifier that helps keep indoor spaces fresh and clean.',
    'Home',
    'Philips',
    8999,
    20,
    4.7,
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    21,
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

-- Remove any accidental duplicate product rows by name before final catalog images are assigned
WITH ranked_products AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS row_num
    FROM products
)
DELETE FROM products
WHERE id IN (
    SELECT id
    FROM ranked_products
    WHERE row_num > 1
);

UPDATE products
SET image_url = CASE id
    WHEN 'P101' THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
    WHEN 'P102' THEN 'https://images.unsplash.com/photo-1544117519-31a4b719223d?auto=format&fit=crop&w=800&q=80'
    WHEN 'P103' THEN 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80'
    WHEN 'P104' THEN 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80'
    WHEN 'P105' THEN 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80'
    WHEN 'P106' THEN 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80'
    WHEN 'P107' THEN 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80'
    WHEN 'P108' THEN 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80'
    WHEN 'P109' THEN 'https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=800&q=80'
    WHEN 'P110' THEN 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80'
    WHEN 'P111' THEN 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80'
    WHEN 'P112' THEN 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80'
    WHEN 'P113' THEN 'https://images.unsplash.com/photo-1577308856961-8e7b1f6c6d24?auto=format&fit=crop&w=800&q=80'
    WHEN 'P114' THEN 'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=800&q=80'
    WHEN 'P115' THEN 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=800&q=80'
    WHEN 'P116' THEN 'https://images.unsplash.com/photo-1577803947579-9f7b0d2f59d1?auto=format&fit=crop&w=800&q=80'
    WHEN 'P117' THEN 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'
    WHEN 'P118' THEN 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80'
    WHEN 'P119' THEN 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80'
    WHEN 'P120' THEN 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'
    WHEN 'P121' THEN 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
    WHEN 'P122' THEN 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80'
    WHEN 'P123' THEN 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
    WHEN 'P124' THEN 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80'
    WHEN 'P125' THEN 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80'
    WHEN 'P126' THEN 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80'
    WHEN 'P127' THEN 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80'
    WHEN 'P128' THEN 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80'
    WHEN 'P129' THEN 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80'
    WHEN 'P130' THEN 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80'
    ELSE image_url
END;