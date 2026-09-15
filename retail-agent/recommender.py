"""
Personalized Retail Recommendation Engine

Recommendation signals:
1. Customer category affinity
2. Customer brand affinity
3. Purchase propensity from the trained Random Forest
4. Seasonal relevance
5. Discount / offer relevance
6. Stock availability
7. Recommendation feedback

The recommendation engine uses category + brand behavioral affinity because
the source dataset does not provide stable product-level identity suitable
for classic item-based collaborative filtering.

The ML purchase-propensity model is treated as a secondary signal because
its predictive performance on the supplied dataset is weak.

Recommendation feedback is used as a real-time personalization signal.
Helpful feedback increases the relevance of related products/categories/brands,
while not-helpful feedback decreases their relevance.

Important:
The ML dataset does not contain a stock column. Real stock availability is
handled by the Node.js backend against the PostgreSQL products table.
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from db import (
    get_customer,
    get_customer_interactions,
    get_customer_recommendation_feedback,
)


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
# FEEDBACK SETTINGS
# ============================================================

FEEDBACK_ADJUSTMENT_WEIGHT = 0.05

HELPFUL_VALUE = 1.0
NOT_HELPFUL_VALUE = -1.0


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

    counts = (
        df.groupby("user_id")
        .size()
        .sort_values(ascending=False)
    )

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

    latest["interaction_count"] = latest.user_id.map(
        counts
    )

    return (
        latest
        .sort_values(
            "interaction_count",
            ascending=False,
        )
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
    profile, df = _customer_history_frame(
        customer_id
    )

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
    India-oriented seasonal grouping:

    March-May        -> Summer
    June-September   -> Monsoon
    October-November -> Festive
    December-Feb     -> Winter
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

def _season_relevance(
    product_season,
    current_season,
):
    """
    Return a normalized seasonal relevance score.
    """

    season = str(
        product_season or ""
    ).strip().lower()

    current = str(
        current_season or ""
    ).strip().lower()

    if not season:
        return 0.0

    if season == "all":
        return 0.70

    if season == current:
        return 1.0

    seasonal_groups = {
        "summer": {
            "summer",
            "travel",
        },
        "monsoon": {
            "monsoon",
            "rainy",
        },
        "festive": {
            "festive",
            "festival",
        },
        "winter": {
            "winter",
        },
    }

    for group_name, values in seasonal_groups.items():
        if (
            current == group_name
            and season in values
        ):
            return 1.0

    return 0.0


# ============================================================
# DISCOUNT SCORE
# ============================================================

def _discount_score(
    discount,
    max_discount,
):
    """
    Convert product discount into a normalized score.
    """

    try:
        discount = float(
            discount or 0
        )

        max_discount = float(
            max_discount or 0
        )

    except (
        TypeError,
        ValueError,
    ):
        return 0.0

    if (
        discount <= 0
        or max_discount <= 0
    ):
        return 0.0

    return min(
        discount / max_discount,
        1.0,
    )


# ============================================================
# FEEDBACK HELPERS
# ============================================================

def _feedback_value(action):
    """
    Convert feedback action into a numeric signal.

    helpful     -> +1
    not_helpful -> -1
    """

    action = str(
        action or ""
    ).strip().lower()

    if action == "helpful":
        return HELPFUL_VALUE

    if action == "not_helpful":
        return NOT_HELPFUL_VALUE

    return 0.0


def _build_feedback_profile(feedback_rows):
    """
    Build normalized feedback signals for:

    1. Exact product
    2. Category
    3. Brand

    Repeated feedback for the same entity is averaged.
    """

    product_values = {}
    category_values = {}
    brand_values = {}

    for row in feedback_rows:

        value = _feedback_value(
            row.get("action")
        )

        if value == 0:
            continue

        product_id = row.get(
            "product_id"
        )

        category = row.get(
            "category"
        )

        brand = row.get(
            "brand"
        )

        # ----------------------------------------------------
        # Product feedback
        # ----------------------------------------------------

        if product_id:
            product_values.setdefault(
                str(product_id),
                [],
            ).append(value)

        # ----------------------------------------------------
        # Category feedback
        # ----------------------------------------------------

        if category:
            category_values.setdefault(
                str(category),
                [],
            ).append(value)

        # ----------------------------------------------------
        # Brand feedback
        # ----------------------------------------------------

        if brand:
            brand_values.setdefault(
                str(brand),
                [],
            ).append(value)

    # --------------------------------------------------------
    # Average product feedback
    # --------------------------------------------------------

    product_scores = {
        key: float(
            np.mean(values)
        )
        for key, values in product_values.items()
        if values
    }

    # --------------------------------------------------------
    # Average category feedback
    # --------------------------------------------------------

    category_scores = {
        key: float(
            np.mean(values)
        )
        for key, values in category_values.items()
        if values
    }

    # --------------------------------------------------------
    # Average brand feedback
    # --------------------------------------------------------

    brand_scores = {
        key: float(
            np.mean(values)
        )
        for key, values in brand_values.items()
        if values
    }

    return {
        "product": product_scores,
        "category": category_scores,
        "brand": brand_scores,
    }


def _feedback_score(
    product_id,
    category,
    brand,
    feedback_profile,
):
    """
    Calculate feedback relevance for a candidate.

    Exact product  -> 50%
    Category       -> 30%
    Brand          -> 20%
    """

    product_scores = feedback_profile.get(
        "product",
        {},
    )

    category_scores = feedback_profile.get(
        "category",
        {},
    )

    brand_scores = feedback_profile.get(
        "brand",
        {},
    )

    product_signal = float(
        product_scores.get(
            str(product_id),
            0.0,
        )
    )

    category_signal = float(
        category_scores.get(
            str(category),
            0.0,
        )
    )

    brand_signal = float(
        brand_scores.get(
            str(brand),
            0.0,
        )
    )

    score = (
        product_signal * 0.50
        + category_signal * 0.30
        + brand_signal * 0.20
    )

    return max(
        -1.0,
        min(score, 1.0),
    )


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
    Run the existing purchase-propensity model.
    """

    model = _get_model()

    row = {
        "price": float(
            price or 0
        ),

        "discount": float(
            discount or 0
        ),

        "user_age": profile_row[
            "user_age"
        ],

        "loyalty_score": profile_row[
            "loyalty_score"
        ],

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

        "user_gender": profile_row[
            "user_gender"
        ],

        "search_keywords": search_keyword,
    }

    batch = pd.DataFrame([row])

    try:
        probability = model.predict_proba(
            batch
        )[0][1]

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

def recommend_for_user(
    user_id,
    top_k=5,
    df=None,
):

    if df is None:
        df = load_dataset()

    hist = _user_history(
        df,
        user_id,
    )

    if hist.empty:
        return {
            "error": (
                f"user_id {user_id} not found"
            )
        }

    profile = _latest_profile(hist)

    # --------------------------------------------------------
    # Behavioral affinity
    #
    # IMPORTANT:
    # Keep these Series unchanged.
    # --------------------------------------------------------

    category_affinity_scores = (
        _affinity_scores(
            hist,
            "product_category",
        )
    )

    brand_affinity_scores = (
        _affinity_scores(
            hist,
            "brand",
        )
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
    # Customer feedback
    # --------------------------------------------------------

    feedback_rows = (
        get_customer_recommendation_feedback(
            user_id
        )
    )

    feedback_profile = (
        _build_feedback_profile(
            feedback_rows
        )
    )

    # --------------------------------------------------------
    # Feedback statistics
    # --------------------------------------------------------

    helpful_count = sum(
        1
        for row in feedback_rows
        if row.get("action") == "helpful"
    )

    not_helpful_count = sum(
        1
        for row in feedback_rows
        if row.get("action") == "not_helpful"
    )

    # --------------------------------------------------------
    # Purchased category/brand combinations
    # --------------------------------------------------------

    purchased = hist[
        hist["interaction_type"]
        == "purchase"
    ]

    purchased_pairs = set(
        zip(
            purchased[
                "product_category"
            ],
            purchased["brand"],
        )
    )

    # --------------------------------------------------------
    # Candidate combinations
    # --------------------------------------------------------

    pairs = _build_candidate_pairs(
        df
    )

    candidates = []

    for category, brand in pairs:

        # ----------------------------------------------------
        # Skip combinations already purchased
        # ----------------------------------------------------

        if (
            category,
            brand,
        ) in purchased_pairs:
            continue

        # ----------------------------------------------------
        # Affinity
        #
        # IMPORTANT:
        # Use separate local variables so we don't overwrite
        # the original Pandas Series.
        # ----------------------------------------------------

        category_affinity_value = float(
            category_affinity_scores.get(
                category,
                0,
            )
        )

        brand_affinity_value = float(
            brand_affinity_scores.get(
                brand,
                0,
            )
        )

        affinity_score = (
            category_affinity_value * 0.60
            + brand_affinity_value * 0.40
        )

        # ----------------------------------------------------
        # Representative product context
        # ----------------------------------------------------

        matching_products = df[
            (
                df["product_category"]
                == category
            )
            & (
                df["brand"]
                == brand
            )
        ].copy()

        if matching_products.empty:
            continue

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # The ML CSV does not contain stock.
        #
        # Stock is checked later by the Node.js backend
        # against the PostgreSQL products table.
        # ----------------------------------------------------

        available_products = (
            matching_products.copy()
        )

        if available_products.empty:
            continue

        # ----------------------------------------------------
        # Prefer products with higher discounts and ratings.
        # ----------------------------------------------------

        available_products[
            "discount_numeric"
        ] = (
            pd.to_numeric(
                available_products[
                    "discount"
                ],
                errors="coerce",
            )
            .fillna(0)
        )

        if "rating" in available_products.columns:

            available_products[
                "rating_numeric"
            ] = (
                pd.to_numeric(
                    available_products[
                        "rating"
                    ],
                    errors="coerce",
                )
                .fillna(0)
            )

            sort_columns = [
                "discount_numeric",
                "rating_numeric",
            ]

        else:

            sort_columns = [
                "discount_numeric",
            ]

        available_products = (
            available_products
            .sort_values(
                sort_columns,
                ascending=False,
            )
        )

        representative = (
            available_products.iloc[0]
        )

        # ----------------------------------------------------
        # Representative product values
        # ----------------------------------------------------

        product_id = representative.get(
            "product_id",
            None,
        )

        price = float(
            representative.get(
                "price",
                0,
            )
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
        # Feedback signal
        # ----------------------------------------------------

        feedback_score = _feedback_score(
            product_id,
            category,
            brand,
            feedback_profile,
        )

        # ----------------------------------------------------
        # Existing recommendation score
        # ----------------------------------------------------

        base_score = (
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
        # Feedback adjustment
        # ----------------------------------------------------

        feedback_adjustment = (
            feedback_score
            * FEEDBACK_ADJUSTMENT_WEIGHT
        )

        # ----------------------------------------------------
        # Final score
        # ----------------------------------------------------

        final_score = (
            base_score
            + feedback_adjustment
        )

        final_score = max(
            0.0,
            min(
                final_score,
                1.0,
            ),
        )

        # ----------------------------------------------------
        # Behavioral evidence
        # ----------------------------------------------------

        category_interactions = int(
            (
                hist[
                    "product_category"
                ]
                == category
            ).sum()
        )

        category_purchases = int(
            (
                (
                    hist[
                        "product_category"
                    ]
                    == category
                )
                & (
                    hist[
                        "interaction_type"
                    ]
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

            reasons.append(
                category_reason
            )

        if brand_interactions > 0:

            reasons.append(
                f"you've interacted with "
                f"{brand} "
                f"{brand_interactions} times"
            )

        if season_score >= 1.0:

            reasons.append(
                f"it's relevant for the "
                f"current "
                f"{current_season.lower()} "
                f"season"
            )

        if discount > 0:

            reasons.append(
                f"it currently has a "
                f"{discount:g}% discount"
            )

        if feedback_score > 0:

            reasons.append(
                "your previous feedback "
                "indicates you prefer "
                "similar products"
            )

        elif feedback_score < 0:

            reasons.append(
                "your previous feedback "
                "reduced its relevance"
            )

        if not reasons:

            reasons.append(
                "it matches available products "
                "with current stock"
            )

        explanation = (
            "Recommended because "
            + ", ".join(reasons)
            + "."
        )

        # ----------------------------------------------------
        # Candidate
        # ----------------------------------------------------

        candidates.append(
            {
                "product_id": product_id,

                "category": category,

                "brand": brand,

                "price": round(
                    price,
                    2,
                ),

                "discount": round(
                    discount,
                    2,
                ),

                "season": product_season,

                "current_season": current_season,

                "affinity_score": round(
                    float(
                        affinity_score
                    ),
                    4,
                ),

                "predicted_purchase_probability": round(
                    float(
                        propensity
                    ),
                    4,
                ),

                "seasonal_relevance": round(
                    float(
                        season_score
                    ),
                    4,
                ),

                "discount_score": round(
                    float(
                        discount_score
                    ),
                    4,
                ),

                "feedback_score": round(
                    float(
                        feedback_score
                    ),
                    4,
                ),

                "feedback_adjustment": round(
                    float(
                        feedback_adjustment
                    ),
                    4,
                ),

                "base_score": round(
                    float(
                        base_score
                    ),
                    4,
                ),

                "final_score": round(
                    float(
                        final_score
                    ),
                    4,
                ),

                "explanation": explanation,
            }
        )

    # ========================================================
    # RANK
    # ========================================================

    candidates.sort(
        key=lambda x: x[
            "final_score"
        ],
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
                "most recent observed row "
                "for this user"
            ),

            "age": int(
                profile["user_age"]
            ),

            "gender": profile[
                "user_gender"
            ],

            "loyalty_score": float(
                profile[
                    "loyalty_score"
                ]
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

        # ----------------------------------------------------
        # Feedback summary
        # ----------------------------------------------------

        "feedback_summary": {
            "total": len(
                feedback_rows
            ),

            "helpful": helpful_count,

            "not_helpful": not_helpful_count,
        },

        "top_categories": (
            category_affinity_scores
            .sort_values(
                ascending=False
            )
            .head(3)
            .to_dict()
        ),

        "top_brands": (
            brand_affinity_scores
            .sort_values(
                ascending=False
            )
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