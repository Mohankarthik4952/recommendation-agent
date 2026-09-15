"""
Personalized Retail Recommendation Engine

Recommendation signals:
1. Customer category affinity
2. Customer brand affinity
3. Purchase propensity from the trained Random Forest
4. Seasonal relevance
5. Discount / offer relevance
6. Stock availability

The recommendation engine uses category + brand behavioral affinity because
the source dataset does not provide stable product-level identity suitable
for classic item-based collaborative filtering.

The ML purchase-propensity model is treated as a secondary signal because
its predictive performance on the supplied dataset is weak.
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from db import get_customer, get_customer_interactions


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATASET_PATH = BASE_DIR / "retail_personalization_dataset.csv"
MODEL_PATH = BASE_DIR / "model.joblib"
METRICS_PATH = BASE_DIR / "metrics.json"


# ============================================================
# EVENT WEIGHTS
# ============================================================

EVENT_WEIGHTS = {
    "view": 1,
    "click": 2,
    "add_to_cart": 3,
    "purchase": 5,
}


# ============================================================
# RECOMMENDATION WEIGHTS
# ============================================================

AFFINITY_WEIGHT = 0.60
PROPENSITY_WEIGHT = 0.20
SEASON_WEIGHT = 0.10
DISCOUNT_WEIGHT = 0.10


# ============================================================
# MODEL CACHE
# ============================================================

_model = None


def _get_model():
    global _model

    if _model is None:
        _model = joblib.load(MODEL_PATH)

    return _model


# ============================================================
# DATASET
# ============================================================

def load_dataset():
    return pd.read_csv(DATASET_PATH)


# ============================================================
# USER LIST
# ============================================================

def list_users(df, limit=200):
    """
    Return a manageable sample of user summaries for a UI dropdown.
    """

    counts = df.groupby("user_id").size().sort_values(ascending=False)

    top_users = counts.head(limit).index.tolist()

    latest = (
        df[df.user_id.isin(top_users)]
        .sort_values("timestamp")
        .groupby("user_id")
        .tail(1)[
            [
                "user_id",
                "user_age",
                "user_gender",
                "loyalty_score",
            ]
        ]
    )

    latest["interaction_count"] = latest.user_id.map(counts)

    return (
        latest
        .sort_values("interaction_count", ascending=False)
        .to_dict(orient="records")
    )


# ============================================================
# USER HISTORY
# ============================================================

def _user_history(df, user_id):
    return (
        df[df.user_id == user_id]
        .sort_values("timestamp")
        .copy()
    )


# ============================================================
# CUSTOMER HISTORY FROM DATABASE
# ============================================================

def _customer_history_frame(customer_id):
    profile = get_customer(customer_id)

    if profile is None:
        return None, None

    rows = get_customer_interactions(customer_id)

    if not rows:
        return profile, pd.DataFrame()

    df = pd.DataFrame(rows)

    df["user_id"] = customer_id

    df["user_age"] = profile["user_age"]
    df["user_gender"] = profile["user_gender"]
    df["loyalty_score"] = profile["loyalty_score"]
    df["previous_purchase_count"] = profile[
        "previous_purchase_count"
    ]
    df["avg_purchase_value"] = profile[
        "avg_purchase_value"
    ]

    df["product_category"] = df["category"]

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce",
    )

    return profile, df


# ============================================================
# MAIN CUSTOMER RECOMMENDATION ENTRY POINT
# ============================================================

def recommend_for_customer(customer_id, top_k=5):
    profile, df = _customer_history_frame(customer_id)

    if profile is None:
        return {
            "error": f"customer_id {customer_id} not found"
        }

    if df is None or df.empty:
        return {
            "error": (
                f"no interactions for customer_id "
                f"{customer_id}"
            )
        }

    return recommend_for_user(
        customer_id,
        top_k=top_k,
        df=df,
    )


# ============================================================
# AFFINITY
# ============================================================

def _affinity_scores(hist, field):
    """
    Calculate weighted behavioral affinity.

    view        = 1
    click       = 2
    add_to_cart = 3
    purchase    = 5
    """

    d = hist.copy()

    d["weight"] = (
        d["interaction_type"]
        .map(EVENT_WEIGHTS)
        .fillna(0)
    )

    scores = d.groupby(field)["weight"].sum()

    if scores.sum() > 0:
        scores = scores / scores.sum()

    return scores


# ============================================================
# PROFILE SNAPSHOT
# ============================================================

def _latest_profile(hist):
    """
    Latest observed customer profile snapshot.
    """

    return (
        hist
        .sort_values("timestamp")
        .iloc[-1]
    )


# ============================================================
# SEASON DETECTION
# ============================================================

def _current_season():
    """
    Determine the current broad shopping season.

    India-oriented seasonal grouping:

    March-May       -> Summer
    June-September  -> Monsoon
    October-November-> Festive
    December-Feb    -> Winter
    """

    month = pd.Timestamp.now().month

    if month in [3, 4, 5]:
        return "Summer"

    if month in [6, 7, 8, 9]:
        return "Monsoon"

    if month in [10, 11]:
        return "Festive"

    return "Winter"


# ============================================================
# SEASONAL RELEVANCE
# ============================================================

def _season_relevance(product_season, current_season):
    """
    Return a normalized seasonal relevance score.
    """

    season = str(product_season or "").strip().lower()
    current = str(current_season or "").strip().lower()

    if not season:
        return 0.0

    if season == "all":
        return 0.70

    if season == current:
        return 1.0

    # Useful mappings for common product season labels.
    seasonal_groups = {
        "summer": {"summer", "travel"},
        "monsoon": {"monsoon", "rainy"},
        "festive": {"festive", "festival"},
        "winter": {"winter"},
    }

    for group_name, values in seasonal_groups.items():
        if current == group_name and season in values:
            return 1.0

    return 0.0


# ============================================================
# DISCOUNT SCORE
# ============================================================

def _discount_score(discount, max_discount):
    """
    Convert product discount into a normalized score.
    """

    try:
        discount = float(discount or 0)
        max_discount = float(max_discount or 0)
    except (TypeError, ValueError):
        return 0.0

    if discount <= 0 or max_discount <= 0:
        return 0.0

    return min(discount / max_discount, 1.0)


# ============================================================
# PROPENSITY MODEL
# ============================================================

def _propensity_score(
    profile_row,
    category,
    brand,
    device_type,
    location,
    price,
    discount,
    search_keyword,
):
    """
    Run the existing purchase-propensity model
    for one recommendation candidate.
    """

    model = _get_model()

    row = {
        "price": float(price or 0),
        "discount": float(discount or 0),
        "user_age": profile_row["user_age"],
        "loyalty_score": profile_row["loyalty_score"],
        "previous_purchase_count": profile_row[
            "previous_purchase_count"
        ],
        "avg_purchase_value": profile_row[
            "avg_purchase_value"
        ],
        "product_category": category,
        "brand": brand,
        "device_type": device_type,
        "location": location,
        "user_gender": profile_row["user_gender"],
        "search_keywords": search_keyword,
    }

    batch = pd.DataFrame([row])

    try:
        probability = model.predict_proba(batch)[0][1]
        return float(probability)

    except Exception:
        return 0.0


# ============================================================
# PRODUCT CANDIDATES
# ============================================================

def _build_candidate_pairs(df):
    """
    Build category + brand combinations from the real dataset.
    """

    categories = (
        df["product_category"]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )

    brands = (
        df["brand"]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )

    return [
        (category, brand)
        for category in categories
        for brand in brands
    ]


# ============================================================
# MAIN RECOMMENDATION ENGINE
# ============================================================

def recommend_for_user(user_id, top_k=5, df=None):

    if df is None:
        df = load_dataset()

    hist = _user_history(df, user_id)

    if hist.empty:
        return {
            "error": f"user_id {user_id} not found"
        }

    profile = _latest_profile(hist)

    # --------------------------------------------------------
    # Behavioral affinity
    # --------------------------------------------------------

    cat_affinity = _affinity_scores(
        hist,
        "product_category",
    )

    brand_affinity = _affinity_scores(
        hist,
        "brand",
    )

    # --------------------------------------------------------
    # Customer statistics
    # --------------------------------------------------------

    n_interactions = len(hist)

    n_purchases = int(
        (
            hist["interaction_type"]
            == "purchase"
        ).sum()
    )

    # --------------------------------------------------------
    # Current season
    # --------------------------------------------------------

    current_season = _current_season()

    # --------------------------------------------------------
    # User context
    # --------------------------------------------------------

    top_device = (
        hist["device_type"]
        .dropna()
        .mode()
    )

    top_location = (
        hist["location"]
        .dropna()
        .mode()
    )

    top_keyword = (
        hist["search_keywords"]
        .dropna()
        .mode()
    )

    device_type = (
        top_device.iloc[0]
        if len(top_device)
        else "unknown"
    )

    location = (
        top_location.iloc[0]
        if len(top_location)
        else "unknown"
    )

    search_keyword = (
        top_keyword.iloc[0]
        if len(top_keyword)
        else ""
    )

    # --------------------------------------------------------
    # Dataset statistics
    # --------------------------------------------------------

    max_discount = float(
        pd.to_numeric(
            df["discount"],
            errors="coerce",
        )
        .fillna(0)
        .max()
    )

    # --------------------------------------------------------
    # Purchased category/brand combinations
    # --------------------------------------------------------

    purchased = hist[
        hist["interaction_type"] == "purchase"
    ]

    purchased_pairs = set(
        zip(
            purchased["product_category"],
            purchased["brand"],
        )
    )

    # --------------------------------------------------------
    # Candidate combinations
    # --------------------------------------------------------

    pairs = _build_candidate_pairs(df)

    candidates = []

    for category, brand in pairs:

        # ----------------------------------------------------
        # Skip combinations already purchased
        # ----------------------------------------------------

        if (category, brand) in purchased_pairs:
            continue

        # ----------------------------------------------------
        # Affinity
        # ----------------------------------------------------

        category_affinity = float(
            cat_affinity.get(category, 0)
        )

        brand_affinity = float(
            brand_affinity.get(brand, 0)
        )

        affinity_score = (
            category_affinity * 0.60
            + brand_affinity * 0.40
        )

        # ----------------------------------------------------
        # Representative product context
        # ----------------------------------------------------

        matching_products = df[
            (df["product_category"] == category)
            & (df["brand"] == brand)
        ].copy()

        if matching_products.empty:
            continue

        # Only recommend combinations with
        # products that have stock.
        in_stock = matching_products[
            pd.to_numeric(
                matching_products["stock"],
                errors="coerce",
            ).fillna(0) > 0
        ]

        if in_stock.empty:
            continue

        # Prefer products with higher discount.
        in_stock = in_stock.copy()

        in_stock["discount_numeric"] = (
            pd.to_numeric(
                in_stock["discount"],
                errors="coerce",
            )
            .fillna(0)
        )

        in_stock = (
            in_stock
            .sort_values(
                [
                    "discount_numeric",
                    "rating",
                ],
                ascending=False,
            )
        )

        representative = in_stock.iloc[0]

        price = float(
            representative.get("price", 0)
            or 0
        )

        discount = float(
            representative.get(
                "discount",
                0,
            )
            or 0
        )

        product_season = representative.get(
            "season",
            "",
        )

        # ----------------------------------------------------
        # Seasonal score
        # ----------------------------------------------------

        season_score = _season_relevance(
            product_season,
            current_season,
        )

        # ----------------------------------------------------
        # Discount score
        # ----------------------------------------------------

        discount_score = _discount_score(
            discount,
            max_discount,
        )

        # ----------------------------------------------------
        # Purchase propensity
        # ----------------------------------------------------

        propensity = _propensity_score(
            profile,
            category,
            brand,
            device_type,
            location,
            price,
            discount,
            search_keyword,
        )

        # ----------------------------------------------------
        # Final recommendation score
        # ----------------------------------------------------

        final_score = (
            affinity_score
            * AFFINITY_WEIGHT
            + propensity
            * PROPENSITY_WEIGHT
            + season_score
            * SEASON_WEIGHT
            + discount_score
            * DISCOUNT_WEIGHT
        )

        # ----------------------------------------------------
        # Behavioral evidence
        # ----------------------------------------------------

        category_interactions = int(
            (
                hist["product_category"]
                == category
            ).sum()
        )

        category_purchases = int(
            (
                (hist["product_category"] == category)
                & (
                    hist["interaction_type"]
                    == "purchase"
                )
            ).sum()
        )

        brand_interactions = int(
            (
                hist["brand"]
                == brand
            ).sum()
        )

        # ----------------------------------------------------
        # Explanation
        # ----------------------------------------------------

        reasons = []

        if category_interactions > 0:
            category_reason = (
                f"you've engaged with "
                f"{category} products "
                f"{category_interactions} times"
            )

            if category_purchases > 0:
                category_reason += (
                    f" ({category_purchases} purchases)"
                )

            reasons.append(category_reason)

        if brand_interactions > 0:
            reasons.append(
                f"you've interacted with "
                f"{brand} {brand_interactions} times"
            )

        if season_score >= 1.0:
            reasons.append(
                f"it's relevant for the "
                f"current {current_season.lower()} season"
            )

        if discount > 0:
            reasons.append(
                f"it currently has a "
                f"{discount:g}% discount"
            )

        if not reasons:
            reasons.append(
                "it matches available products "
                "with current stock"
            )

        explanation = (
            "Recommended because "
            + ", and ".join(reasons)
            + "."
        )

        # ----------------------------------------------------
        # Candidate
        # ----------------------------------------------------

        candidates.append(
            {
                "category": category,
                "brand": brand,
                "price": round(price, 2),
                "discount": round(discount, 2),
                "season": product_season,
                "current_season": current_season,
                "affinity_score": round(
                    float(affinity_score),
                    4,
                ),
                "predicted_purchase_probability": round(
                    float(propensity),
                    4,
                ),
                "seasonal_relevance": round(
                    float(season_score),
                    4,
                ),
                "discount_score": round(
                    float(discount_score),
                    4,
                ),
                "final_score": round(
                    float(final_score),
                    4,
                ),
                "explanation": explanation,
            }
        )

    # ========================================================
    # RANK
    # ========================================================

    candidates.sort(
        key=lambda x: x["final_score"],
        reverse=True,
    )

    top = candidates[:top_k]

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "user_id": user_id,

        "profile_snapshot": {
            "note": (
                "most recent observed row for this user"
            ),
            "age": int(
                profile["user_age"]
            ),
            "gender": profile[
                "user_gender"
            ],
            "loyalty_score": float(
                profile["loyalty_score"]
            ),
            "previous_purchase_count": int(
                profile[
                    "previous_purchase_count"
                ]
            ),
            "avg_purchase_value": round(
                float(
                    profile[
                        "avg_purchase_value"
                    ]
                ),
                2,
            ),
        },

        "current_season": current_season,

        "total_interactions": n_interactions,

        "total_purchases": n_purchases,

        "top_categories": (
            cat_affinity
            .sort_values(ascending=False)
            .head(3)
            .to_dict()
        ),

        "top_brands": (
            brand_affinity
            .sort_values(ascending=False)
            .head(3)
            .to_dict()
        ),

        "recommendations": top,
    }


# ============================================================
# MODEL METRICS
# ============================================================

def get_model_metrics():

    with open(
        METRICS_PATH,
        encoding="utf-8",
    ) as f:
        return json.load(f)


# ============================================================
# LOCAL TEST
# ============================================================

if __name__ == "__main__":

    df = load_dataset()

    sample_user = (
        df.user_id
        .value_counts()
        .index[0]
    )

    result = recommend_for_user(
        sample_user,
        top_k=5,
        df=df,
    )

    print(
        json.dumps(
            result,
            indent=2,
            default=str,
        )
    )

    print()

    print(
        "Model metrics:",
        json.dumps(
            get_model_metrics(),
            indent=2,
        ),
    )