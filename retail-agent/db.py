import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    return psycopg2.connect(DATABASE_URL)


# ============================================================
# GET CUSTOMER
# ============================================================

def get_customer(customer_id):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    age,
                    gender,
                    location,
                    loyalty_score,
                    previous_purchase_count,
                    avg_purchase_value
                FROM customers
                WHERE id = %s
                """,
                (customer_id,),
            )

            row = cur.fetchone()

            if not row:
                return None

            return {
                "user_id": row[0],
                "user_age": row[1],
                "user_gender": row[2],
                "location": row[3],
                "loyalty_score": float(row[4] or 0),
                "previous_purchase_count": int(row[5] or 0),
                "avg_purchase_value": float(row[6] or 0),
            }

    finally:
        conn.close()


# ============================================================
# GET CUSTOMER INTERACTIONS
# ============================================================

def get_customer_interactions(customer_id):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    ci.product_id,
                    ci.timestamp,
                    ci.interaction_type,
                    ci.device_type,
                    ci.location,
                    ci.price,
                    ci.discount,
                    ci.search_keywords,
                    ci.rating,
                    p.category,
                    p.brand
                FROM customer_interactions ci
                JOIN products p
                    ON ci.product_id = p.id
                WHERE ci.customer_id = %s
                ORDER BY ci.timestamp
                """,
                (customer_id,),
            )

            rows = cur.fetchall()

            return [
                {
                    "product_id": row[0],
                    "timestamp": row[1],
                    "interaction_type": row[2],
                    "device_type": row[3],
                    "location": row[4],
                    "price": float(row[5] or 0),
                    "discount": float(row[6] or 0),
                    "search_keywords": row[7],
                    "rating": (
                        float(row[8])
                        if row[8] is not None
                        else None
                    ),
                    "category": row[9],
                    "brand": row[10],
                }
                for row in rows
            ]

    finally:
        conn.close()


# ============================================================
# GET AVAILABLE PRODUCTS
# ============================================================

def get_available_products():
    """
    Retrieve products that actually exist in the website
    PostgreSQL catalog and currently have stock available.

    These products are used for cold-start recommendations
    so the ML service never recommends a product ID that
    the frontend cannot display.
    """

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    name,
                    category,
                    brand,
                    price,
                    discount,
                    rating,
                    stock
                FROM products
                WHERE stock > 0
                ORDER BY rating DESC, discount DESC
                """
            )

            rows = cur.fetchall()

            return [
                {
                    "product_id": row[0],
                    "name": row[1],
                    "category": row[2],
                    "brand": row[3],
                    "price": float(row[4] or 0),
                    "discount": float(row[5] or 0),
                    "rating": float(row[6] or 0),
                    "stock": int(row[7] or 0),
                }
                for row in rows
            ]

    finally:
        conn.close()


# ============================================================
# GET CUSTOMER RECOMMENDATION FEEDBACK
# ============================================================

def get_customer_recommendation_feedback(customer_id):
    """
    Retrieve recommendation feedback submitted by a customer.

    The feedback table contains:
        customer_id
        recommendation_id
        product_id
        action
        created_at
    """

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    rf.recommendation_id,
                    rf.product_id,
                    rf.action,
                    rf.created_at,
                    p.category,
                    p.brand
                FROM recommendation_feedback rf
                LEFT JOIN products p
                    ON rf.product_id = p.id
                WHERE rf.customer_id = %s
                ORDER BY rf.created_at
                """,
                (customer_id,),
            )

            rows = cur.fetchall()

            return [
                {
                    "recommendation_id": row[0],
                    "product_id": row[1],
                    "action": row[2],
                    "created_at": row[3],
                    "category": row[4],
                    "brand": row[5],
                }
                for row in rows
            ]

    finally:
        conn.close()