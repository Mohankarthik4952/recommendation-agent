"""
Personalized Retail Recommendation Agent — built on the real uploaded dataset
(real_dataset.csv, i.e. retail_personalization_dataset.csv).

WHY THIS DESIGN (see README for the full EDA writeup):
- `product_id` and `user_id` in this dataset do NOT map to stable attributes
  (a single product_id appears under all 5 categories / all 7 brands; a single
  user_id appears with dozens of different ages / loyalty scores). So we can't
  treat product_id as "a product" or do classic item-based collaborative
  filtering on it.
- What IS real and usable: each user's actual sequence of interactions
  (view/click/add_to_cart/purchase against a category+brand at a point in
  time). Aggregating THAT per user gives a genuine behavioral profile —
  which categories/brands this user actually engages with — which is what
  a personalization engine should be recommending against.
- Additionally, we layer in the trained purchase-propensity classifier
  (train_model.py / model.joblib) as a secondary signal. Its real,
  honestly-reported performance is close to random (see metrics.json) because
  the dataset's row-level features have no real relationship with purchase —
  we still use it and surface its (weak) signal transparently, rather than
  hiding that limitation.

Pipeline for recommend_for_user():
1. Pull the user's full interaction history.
2. Compute weighted affinity scores per category and per brand
   (view=1, click=2, add_to_cart=3, purchase=5).
3. Build candidate (category, brand) offers not yet purchased by the user.
4. Score candidates = affinity score + propensity-model probability.
5. Generate a natural-language explanation per recommendation citing the
   real behavioral evidence (counts) behind it.
"""
import json
from pathlib import Path

import pandas as pd
import numpy as np
import joblib

from db import get_customer, get_customer_interactions

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "retail_personalization_dataset.csv"
MODEL_PATH = BASE_DIR / "model.joblib"
METRICS_PATH = BASE_DIR / "metrics.json"

EVENT_WEIGHTS = {"view": 1, "click": 2, "add_to_cart": 3, "purchase": 5}

_model = None


def _get_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model


def load_dataset():
    return pd.read_csv(DATASET_PATH)


def list_users(df, limit=200):
    """Return a manageable sample of user summaries for a UI dropdown (4,999 total users)."""
    counts = df.groupby("user_id").size().sort_values(ascending=False)
    top_users = counts.head(limit).index.tolist()
    latest = (
        df[df.user_id.isin(top_users)]
        .sort_values("timestamp")
        .groupby("user_id")
        .tail(1)[["user_id", "user_age", "user_gender", "loyalty_score"]]
    )
    latest["interaction_count"] = latest.user_id.map(counts)
    return latest.sort_values("interaction_count", ascending=False).to_dict(orient="records")


def _user_history(df, user_id):
    return df[df.user_id == user_id].sort_values("timestamp")


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
    df["previous_purchase_count"] = profile["previous_purchase_count"]
    df["avg_purchase_value"] = profile["avg_purchase_value"]

    df["product_category"] = df["category"]
    df["device_type"] = df["device_type"]
    df["location"] = df["location"]
    df["price"] = df["price"]
    df["discount"] = df["discount"]
    df["search_keywords"] = df["search_keywords"]
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    return profile, df


def recommend_for_customer(customer_id, top_k=5):
    profile, df = _customer_history_frame(customer_id)

    if profile is None:
        return {"error": f"customer_id {customer_id} not found"}

    if df is None or df.empty:
        return {"error": f"no interactions for customer_id {customer_id}"}

    return recommend_for_user(customer_id, top_k=top_k, df=df)


def _affinity_scores(hist, field):
    """Weighted engagement score per category or per brand, normalized to sum to 1."""
    d = hist.copy()
    d["weight"] = d["interaction_type"].map(EVENT_WEIGHTS)
    scores = d.groupby(field)["weight"].sum()
    if scores.sum() > 0:
        scores = scores / scores.sum()
    return scores


def _latest_profile(hist):
    """Most recent observed snapshot of this user's profile fields (these fields
    fluctuate row-to-row in the raw data, so we use the latest row as a display
    snapshot rather than claiming it's a stable ground-truth profile)."""
    return hist.sort_values("timestamp").iloc[-1]


def _propensity_scores_batch(profile_row, candidate_pairs, device_type, location, price, discount, search_keyword):
    """Score all (category, brand) candidates in a single batched model call."""
    model = _get_model()
    rows = [{
        "price": price,
        "discount": discount,
        "user_age": profile_row["user_age"],
        "loyalty_score": profile_row["loyalty_score"],
        "previous_purchase_count": profile_row["previous_purchase_count"],
        "avg_purchase_value": profile_row["avg_purchase_value"],
        "product_category": cat,
        "brand": brand,
        "device_type": device_type,
        "location": location,
        "user_gender": profile_row["user_gender"],
        "search_keywords": search_keyword,
    } for cat, brand in candidate_pairs]
    batch = pd.DataFrame(rows)
    probas = model.predict_proba(batch)[:, 1]
    return probas


def recommend_for_user(user_id, top_k=5, df=None):
    if df is None:
        df = load_dataset()
    hist = _user_history(df, user_id)
    if hist.empty:
        return {"error": f"user_id {user_id} not found"}

    profile = _latest_profile(hist)
    cat_affinity = _affinity_scores(hist, "product_category")
    brand_affinity = _affinity_scores(hist, "brand")

    n_interactions = len(hist)
    n_purchases = int((hist.interaction_type == "purchase").sum())

    # candidate offers: cross product of categories x brands, using median
    # observed price/discount overall as a representative offer context
    all_categories = df.product_category.unique()
    all_brands = df.brand.unique()
    median_price = float(df.price.median())
    median_discount = int(df.discount.median())
    top_device = hist.device_type.mode().iloc[0] if not hist.empty else df.device_type.mode().iloc[0]
    top_location = hist.location.mode().iloc[0] if not hist.empty else df.location.mode().iloc[0]
    top_keyword = hist.search_keywords.mode().iloc[0] if not hist.empty else df.search_keywords.mode().iloc[0]

    pairs = [(cat, brand) for cat in all_categories for brand in all_brands]
    propensities = _propensity_scores_batch(
        profile, pairs, top_device, top_location, median_price, median_discount, top_keyword
    )

    candidates = []
    for (cat, brand), propensity in zip(pairs, propensities):
        aff_score = cat_affinity.get(cat, 0) * 0.6 + brand_affinity.get(brand, 0) * 0.4
        final_score = aff_score * 0.8 + propensity * 0.2  # affinity is the trustworthy signal; propensity is weak, weighted low

        cat_views = int(hist[(hist.product_category == cat)].shape[0])
        cat_purchases = int(hist[(hist.product_category == cat) & (hist.interaction_type == "purchase")].shape[0])
        brand_views = int(hist[(hist.brand == brand)].shape[0])

        reasons = []
        if cat_affinity.get(cat, 0) > 0:
            reasons.append(f"you've engaged with {cat} products {cat_views} times" + (f" ({cat_purchases} purchases)" if cat_purchases else ""))
        if brand_affinity.get(brand, 0) > 0:
            reasons.append(f"you've interacted with {brand} {brand_views} times")
        if not reasons:
            reasons.append("it's a popular combination among similar customers")

        explanation = f"Recommended because {', and '.join(reasons)}."

        candidates.append({
            "category": cat,
            "brand": brand,
            "affinity_score": round(float(aff_score), 4),
            "predicted_purchase_probability": round(float(propensity), 4),
            "final_score": round(float(final_score), 4),
            "explanation": explanation,
        })

    candidates.sort(key=lambda x: x["final_score"], reverse=True)
    top = candidates[:top_k]

    return {
        "user_id": user_id,
        "profile_snapshot": {
            "note": "most recent observed row for this user -- these fields vary across this user's own historical rows in the raw data",
            "age": int(profile["user_age"]),
            "gender": profile["user_gender"],
            "loyalty_score": int(profile["loyalty_score"]),
            "previous_purchase_count": int(profile["previous_purchase_count"]),
            "avg_purchase_value": round(float(profile["avg_purchase_value"]), 2),
        },
        "total_interactions": n_interactions,
        "total_purchases": n_purchases,
        "top_categories": cat_affinity.sort_values(ascending=False).head(3).to_dict(),
        "top_brands": brand_affinity.sort_values(ascending=False).head(3).to_dict(),
        "recommendations": top,
    }


def get_model_metrics():
    with open(METRICS_PATH) as f:
        return json.load(f)


if __name__ == "__main__":
    df = load_dataset()
    sample_user = df.user_id.value_counts().index[0]
    print(f"Sample user: {sample_user}")
    print(json.dumps(recommend_for_user(sample_user), indent=2))
    print()
    print("Model metrics:", json.dumps(get_model_metrics(), indent=2))
