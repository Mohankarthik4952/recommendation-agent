import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    return psycopg2.connect(DATABASE_URL)


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
                    "rating": float(row[8]) if row[8] is not None else None,
                    "category": row[9],
                    "brand": row[10],
                }
                for row in rows
            ]

    finally:
        conn.close()
