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

Cold-start support:
- New customers with no interaction history receive
  non-personalized recommendations based on:
    * Product rating
    * Discount
    * Product popularity
    * Category diversity

Important architecture:
- The ML dataset is used for behavioral learning and popularity.
- PostgreSQL products table is the source of truth for:
    * Product ID
    * Product name
    * Category
    * Brand
    * Price
    * Discount
    * Rating
    * Stock
- Both cold-start and personalized recommendations
  use the real PostgreSQL product catalog.
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
    get_available_products,
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
# PERSONALIZED RECOMMENDATION WEIGHTS
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
# COLD-START SETTINGS
# ============================================================

COLD_START_RATING_WEIGHT = 0.60
COLD_START_DISCOUNT_WEIGHT = 0.25
COLD_START_POPULARITY_WEIGHT = 0.15

COLD_START_MAX_PER_CATEGORY = 2


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
    Return a manageable sample of user summaries.
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
    """
    Main production entry point.

    Existing customer:
        Personalized recommendation engine.

    New customer:
        Cold-start recommendation engine.
    """

    profile, customer_df = _customer_history_frame(
        customer_id
    )

    if profile is None:
        return {
            "error": f"customer_id {customer_id} not found"
        }

    # --------------------------------------------------------
    # NEW CUSTOMER / COLD START
    # --------------------------------------------------------

    if customer_df is None or customer_df.empty:

        return recommend_cold_start(
            customer_id=customer_id,
            profile=profile,
            top_k=top_k,
        )

    # --------------------------------------------------------
    # EXISTING CUSTOMER
    # --------------------------------------------------------

    return recommend_for_user(
        customer_id,
        top_k=top_k,
        df=customer_df,
    )


# ============================================================
# COLD-START RECOMMENDATIONS
# ============================================================

def recommend_cold_start(
    customer_id,
    profile,
    top_k=5,
):
    """
    Generate recommendations for a customer with no
    interaction history.

    Candidates come directly from the real PostgreSQL
    products table and only products with stock > 0
    are considered.
    """

    products = get_available_products()

    if not products:
        return {
            "error": "No available products found in the catalog."
        }

    catalog = pd.DataFrame(products)

    # --------------------------------------------------------
    # Normalize product columns
    # --------------------------------------------------------

    catalog["product_id"] = (
        catalog["product_id"]
        .astype(str)
    )

    catalog["rating"] = pd.to_numeric(
        catalog["rating"],
        errors="coerce",
    ).fillna(0)

    catalog["discount"] = pd.to_numeric(
        catalog["discount"],
        errors="coerce",
    ).fillna(0)

    catalog["price"] = pd.to_numeric(
        catalog["price"],
        errors="coerce",
    ).fillna(0)

    catalog["stock"] = pd.to_numeric(
        catalog["stock"],
        errors="coerce",
    ).fillna(0)

    # --------------------------------------------------------
    # Rating score
    # --------------------------------------------------------

    max_rating = catalog["rating"].max()

    if max_rating > 0:
        catalog["rating_score"] = (
            catalog["rating"] / max_rating
        )
    else:
        catalog["rating_score"] = 0.0

    # --------------------------------------------------------
    # Discount score
    # --------------------------------------------------------

    max_discount = catalog["discount"].max()

    if max_discount > 0:
        catalog["discount_score"] = (
            catalog["discount"] / max_discount
        )
    else:
        catalog["discount_score"] = 0.0

    # --------------------------------------------------------
    # Popularity from ML dataset
    # --------------------------------------------------------

    try:
        dataset = load_dataset()

        if "product_id" in dataset.columns:

            popularity = (
                dataset.groupby("product_id")
                .size()
                .rename("popularity_count")
                .reset_index()
            )

            popularity["product_id"] = (
                popularity["product_id"]
                .astype(str)
            )

            catalog = catalog.merge(
                popularity,
                on="product_id",
                how="left",
            )

        else:

            catalog["popularity_count"] = 0

    except Exception:

        catalog["popularity_count"] = 0

    catalog["popularity_count"] = (
        pd.to_numeric(
            catalog["popularity_count"],
            errors="coerce",
        )
        .fillna(0)
    )

    max_popularity = (
        catalog["popularity_count"].max()
    )

    if max_popularity > 0:
        catalog["popularity_score"] = (
            catalog["popularity_count"]
            / max_popularity
        )
    else:
        catalog["popularity_score"] = 0.0

    # --------------------------------------------------------
    # Cold-start score
    #
    # Rating       = 60%
    # Discount     = 25%
    # Popularity   = 15%
    # --------------------------------------------------------

    catalog["cold_start_score"] = (
        catalog["rating_score"]
        * COLD_START_RATING_WEIGHT

        + catalog["discount_score"]
        * COLD_START_DISCOUNT_WEIGHT

        + catalog["popularity_score"]
        * COLD_START_POPULARITY_WEIGHT
    )

    # --------------------------------------------------------
    # Sort highest score first
    # --------------------------------------------------------

    catalog = catalog.sort_values(
        [
            "cold_start_score",
            "rating",
            "discount",
        ],
        ascending=False,
    )

    # --------------------------------------------------------
    # Category diversity
    # --------------------------------------------------------

    selected = []
    category_counts = {}

    for _, row in catalog.iterrows():

        category = str(
            row.get("category", "")
        ).strip()

        count = category_counts.get(
            category,
            0,
        )

        if count >= COLD_START_MAX_PER_CATEGORY:
            continue

        selected.append(row)

        category_counts[category] = (
            count + 1
        )

        if len(selected) >= top_k:
            break

    # --------------------------------------------------------
    # Fill remaining slots
    # --------------------------------------------------------

    if len(selected) < top_k:

        selected_ids = {
            str(row["product_id"])
            for row in selected
        }

        for _, row in catalog.iterrows():

            product_id = str(
                row["product_id"]
            )

            if product_id in selected_ids:
                continue

            selected.append(row)

            if len(selected) >= top_k:
                break

    # --------------------------------------------------------
    # Build response
    # --------------------------------------------------------

    recommendations = []

    for row in selected:

        recommendations.append(
            {
                "product_id": str(
                    row["product_id"]
                ),

                "name": row.get(
                    "name"
                ),

                "category": row.get(
                    "category"
                ),

                "brand": row.get(
                    "brand"
                ),

                "price": round(
                    float(
                        row["price"]
                    ),
                    2,
                ),

                "discount": round(
                    float(
                        row["discount"]
                    ),
                    2,
                ),

                "rating": round(
                    float(
                        row["rating"]
                    ),
                    2,
                ),

                "stock": int(
                    row["stock"]
                ),

                "cold_start_score": round(
                    float(
                        row["cold_start_score"]
                    ),
                    4,
                ),

                "recommendation_type": (
                    "cold_start"
                ),

                "explanation": (
                    "Recommended for you as a new "
                    "customer because it is highly "
                    "rated, currently discounted, "
                    "and available in our catalog."
                ),
            }
        )

    # --------------------------------------------------------
    # Safe profile values
    # --------------------------------------------------------

    if profile is None:
        profile = {}

    age = profile.get(
        "user_age",
        0,
    )

    gender = profile.get(
        "user_gender",
        "",
    )

    # --------------------------------------------------------
    # Final response
    # --------------------------------------------------------

    return {
        "user_id": customer_id,

        "recommendation_type": (
            "cold_start"
        ),

        "message": (
            "These recommendations are based on "
            "highly rated, discounted and popular "
            "products because this customer has "
            "no interaction history yet."
        ),

        "profile_snapshot": {
            "age": int(age or 0),

            "gender": gender or "",

            "loyalty_score": 0.0,

            "previous_purchase_count": 0,

            "avg_purchase_value": 0.0,
        },

        "total_interactions": 0,

        "total_purchases": 0,

        "feedback_summary": {
            "total": 0,
            "helpful": 0,
            "not_helpful": 0,
        },

        "top_categories": {},

        "top_brands": {},

        "recommendations": recommendations,
    }


# ============================================================
# AFFINITY
# ============================================================

def _affinity_scores(
    hist,
    field,
):
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

    scores = d.groupby(
        field
    )["weight"].sum()

    if scores.sum() > 0:
        scores = (
            scores / scores.sum()
        )

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


def _build_feedback_profile(
    feedback_rows
):
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
        for key, values
        in product_values.items()
        if values
    }

    # --------------------------------------------------------
    # Average category feedback
    # --------------------------------------------------------

    category_scores = {
        key: float(
            np.mean(values)
        )
        for key, values
        in category_values.items()
        if values
    }

    # --------------------------------------------------------
    # Average brand feedback
    # --------------------------------------------------------

    brand_scores = {
        key: float(
            np.mean(values)
        )
        for key, values
        in brand_values.items()
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
    Calculate feedback relevance.

    Exact product -> 50%
    Category      -> 30%
    Brand         -> 20%
    """

    product_scores = (
        feedback_profile.get(
            "product",
            {},
        )
    )

    category_scores = (
        feedback_profile.get(
            "category",
            {},
        )
    )

    brand_scores = (
        feedback_profile.get(
            "brand",
            {},
        )
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
        min(
            score,
            1.0,
        ),
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

        "previous_purchase_count": (
            profile_row[
                "previous_purchase_count"
            ]
        ),

        "avg_purchase_value": (
            profile_row[
                "avg_purchase_value"
            ]
        ),

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

        return float(
            probability
        )

    except Exception:

        return 0.0


# ============================================================
# PRODUCT CANDIDATES
# ============================================================

def _build_candidate_pairs(
    products
):
    """
    Build category + brand combinations
    from the real PostgreSQL catalog.
    """

    pairs = set()

    for product in products:

        category = str(
            product.get(
                "category",
                "",
            )
        ).strip()

        brand = str(
            product.get(
                "brand",
                "",
            )
        ).strip()

        if not category or not brand:
            continue

        pairs.add(
            (
                category,
                brand,
            )
        )

    return list(pairs)


# ============================================================
# MAIN PERSONALIZED RECOMMENDATION ENGINE
# ============================================================

def recommend_for_user(
    user_id,
    top_k=5,
    df=None,
):
    """
    Personalized recommendation engine.

    Behavioral signals come from the customer's interaction
    history.

    Candidate products come from the real PostgreSQL catalog.
    """

    if df is None:
        df = load_dataset()

    hist = _user_history(
        df,
        user_id,
    )

    # --------------------------------------------------------
    # Safety fallback
    # --------------------------------------------------------

    if hist.empty:

        profile = get_customer(
            user_id
        )

        return recommend_cold_start(
            customer_id=user_id,
            profile=profile,
            top_k=top_k,
        )

    # --------------------------------------------------------
    # REAL WEBSITE PRODUCT CATALOG
    # --------------------------------------------------------

    catalog_products = (
        get_available_products()
    )

    if not catalog_products:

        return {
            "error": (
                "No available products found "
                "in the catalog."
            )
        }

    catalog_df = pd.DataFrame(
        catalog_products
    )

    # --------------------------------------------------------
    # Normalize catalog
    # --------------------------------------------------------

    catalog_df["product_id"] = (
        catalog_df["product_id"]
        .astype(str)
    )

    catalog_df["category"] = (
        catalog_df["category"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    catalog_df["brand"] = (
        catalog_df["brand"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    catalog_df["price"] = pd.to_numeric(
        catalog_df["price"],
        errors="coerce",
    ).fillna(0)

    catalog_df["discount"] = pd.to_numeric(
        catalog_df["discount"],
        errors="coerce",
    ).fillna(0)

    catalog_df["rating"] = pd.to_numeric(
        catalog_df["rating"],
        errors="coerce",
    ).fillna(0)

    catalog_df["stock"] = pd.to_numeric(
        catalog_df["stock"],
        errors="coerce",
    ).fillna(0)

    # --------------------------------------------------------
    # Behavioral affinity
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

    n_interactions = len(
        hist
    )

    n_purchases = int(
        (
            hist["interaction_type"]
            == "purchase"
        ).sum()
    )

    # --------------------------------------------------------
    # Current season
    # --------------------------------------------------------

    current_season = (
        _current_season()
    )

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
    # MAX DISCOUNT FROM REAL CATALOG
    # --------------------------------------------------------

    max_discount = float(
        catalog_df["discount"].max()
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
        if str(
            row.get(
                "action",
                "",
            )
        ).lower()
        == "helpful"
    )

    not_helpful_count = sum(
        1
        for row in feedback_rows
        if str(
            row.get(
                "action",
                "",
            )
        ).lower()
        == "not_helpful"
    )

    # --------------------------------------------------------
    # Purchased products
    # --------------------------------------------------------

    purchased_product_ids = set(
        hist.loc[
            hist["interaction_type"]
            == "purchase",
            "product_id",
        ]
        .astype(str)
        .tolist()
    )

    # --------------------------------------------------------
    # Candidate combinations
    # --------------------------------------------------------

    pairs = _build_candidate_pairs(
        catalog_products
    )

    candidates = []

    # ========================================================
    # SCORE EACH REAL CATALOG PRODUCT
    # ========================================================

    for product in catalog_products:

        product_id = str(
            product.get(
                "product_id",
                "",
            )
        )

        # ----------------------------------------------------
        # Skip invalid product
        # ----------------------------------------------------

        if not product_id:
            continue

        # ----------------------------------------------------
        # Skip out-of-stock
        # ----------------------------------------------------

        stock = int(
            product.get(
                "stock",
                0,
            )
            or 0
        )

        if stock <= 0:
            continue

        # ----------------------------------------------------
        # Skip products already purchased
        # ----------------------------------------------------

        if product_id in purchased_product_ids:
            continue

        # ----------------------------------------------------
        # Product information
        # ----------------------------------------------------

        category = str(
            product.get(
                "category",
                "",
            )
        ).strip()

        brand = str(
            product.get(
                "brand",
                "",
            )
        ).strip()

        product_name = product.get(
            "name",
            "",
        )

        price = float(
            product.get(
                "price",
                0,
            )
            or 0
        )

        discount = float(
            product.get(
                "discount",
                0,
            )
            or 0
        )

        rating = float(
            product.get(
                "rating",
                0,
            )
            or 0
        )

        # ----------------------------------------------------
        # Category affinity
        # ----------------------------------------------------

        category_affinity_value = float(
            category_affinity_scores.get(
                category,
                0,
            )
        )

        # ----------------------------------------------------
        # Brand affinity
        # ----------------------------------------------------

        brand_affinity_value = float(
            brand_affinity_scores.get(
                brand,
                0,
            )
        )

        # ----------------------------------------------------
        # Combined affinity
        # ----------------------------------------------------

        affinity_score = (
            category_affinity_value
            * 0.60
            +
            brand_affinity_value
            * 0.40
        )

        # ----------------------------------------------------
        # Seasonal score
        #
        # Production products currently do not necessarily
        # contain a season field, so this safely returns 0.
        # ----------------------------------------------------

        product_season = product.get(
            "season",
            "",
        )

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
            hist.iloc[-1],
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
        # Base score
        #
        # Affinity    = 60%
        # Propensity  = 20%
        # Season      = 10%
        # Discount    = 10%
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
                hist["product_category"]
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
                &
                (
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
                "it matches your available "
                "behavioral preferences"
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

                "name": product_name,

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

                "rating": round(
                    rating,
                    2,
                ),

                "stock": stock,

                "season": product_season,

                "current_season": (
                    current_season
                ),

                "affinity_score": round(
                    float(
                        affinity_score
                    ),
                    4,
                ),

                "predicted_purchase_probability": (
                    round(
                        float(
                            propensity
                        ),
                        4,
                    )
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

                "recommendation_type": (
                    "personalized"
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

    # --------------------------------------------------------
    # Category diversity for personalized recommendations
    # --------------------------------------------------------

    selected = []
    category_counts = {}

    for candidate in candidates:

        category = candidate.get(
            "category",
            "",
        )

        count = category_counts.get(
            category,
            0,
        )

        # Avoid showing too many products from one category
        # when enough alternatives are available.
        if count >= 2:
            continue

        selected.append(
            candidate
        )

        category_counts[category] = (
            count + 1
        )

        if len(selected) >= top_k:
            break

    # --------------------------------------------------------
    # Fill remaining slots
    # --------------------------------------------------------

    if len(selected) < top_k:

        selected_ids = {
            item["product_id"]
            for item in selected
        }

        for candidate in candidates:

            if (
                candidate["product_id"]
                in selected_ids
            ):
                continue

            selected.append(
                candidate
            )

            if len(selected) >= top_k:
                break

    top = selected[:top_k]

    # ========================================================
    # RESPONSE
    # ========================================================

    profile = hist.iloc[-1]

    return {
        "user_id": user_id,

        "recommendation_type": (
            "personalized"
        ),

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

        "total_interactions": (
            n_interactions
        ),

        "total_purchases": (
            n_purchases
        ),

        "feedback_summary": {
            "total": len(
                feedback_rows
            ),

            "helpful": (
                helpful_count
            ),

            "not_helpful": (
                not_helpful_count
            ),
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

    # ========================================================
    # EXISTING USER TEST
    # ========================================================

    sample_user = (
        df.user_id
        .value_counts()
        .index[0]
    )

    print(
        "\n============================================"
    )

    print(
        "EXISTING USER TEST"
    )

    print(
        "============================================\n"
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

    # ========================================================
    # COLD-START TEST
    # ========================================================

    print(
        "\n============================================"
    )

    print(
        "COLD-START TEST"
    )

    print(
        "============================================\n"
    )

    cold_start_result = (
        recommend_cold_start(
            customer_id="NEW_USER_TEST",
            profile={
                "user_age": 22,
                "user_gender": "Male",
                "loyalty_score": 0,
                "previous_purchase_count": 0,
                "avg_purchase_value": 0,
            },
            top_k=5,
        )
    )

    print(
        json.dumps(
            cold_start_result,
            indent=2,
            default=str,
        )
    )

    # ========================================================
    # MODEL METRICS
    # ========================================================

    print(
        "\n============================================"
    )

    print(
        "MODEL METRICS"
    )

    print(
        "============================================\n"
    )

    print(
        json.dumps(
            get_model_metrics(),
            indent=2,
        )
    )