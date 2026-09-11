# Personalized Retail Recommendation Agent — Prototype (built on your dataset)

An end-to-end working prototype built on your uploaded dataset:
**retail_personalization_dataset.csv → EDA → Recommendation Agent + Purchase-Propensity Model → FastAPI backend → HTML/JS frontend**

## Problem
Retailers show generic, one-size-fits-all recommendations, reducing customer engagement.
This agent profiles each customer from their real interaction history and returns
personalized category/brand recommendations **with a plain-language explanation of why**.

## The Dataset

150,000 rows, 19 columns: `user_id, product_id, timestamp, session_id, interaction_type,
device_type, location, price, discount, product_category, brand, user_age, user_gender,
loyalty_score, previous_purchase_count, avg_purchase_value, search_keywords, rating, purchase`

- 4,999 unique users, 1,999 unique products
- `interaction_type`: view (75,215) / click (44,989) / add_to_cart (22,217) / purchase (7,579)
- `product_category`: Beauty, Electronics, Apparel, Home, Sports (5)
- `brand`: Apple, LG, Puma, Nike, Samsung, Adidas, Sony (7)

## Important EDA finding — read this before presenting

We ran the numbers before building anything, and found two things that shape the whole design:

1. **`product_id` and `user_id` are not stable entities in this data.** The same `product_id`
   appears under all 5 categories and all 7 brands; the same `user_id` appears with dozens of
   different ages and loyalty scores across its rows. So classic item-based collaborative
   filtering on `product_id` (recommend "similar products to what you bought") isn't meaningful
   here — there's no consistent product behind each ID to be similar to.
2. **No feature correlates with the `purchase` label.** Correlation of every numeric feature
   with `purchase` is under 0.003; every category/brand/device/location/gender/search-keyword
   group shows the same ~5% purchase rate. This means the dataset (as generated) does not encode
   a learnable relationship between customer/product attributes and conversion.

**What this means for the build, and why it's still a legitimate, working prototype:**
What IS real and meaningful in this data is each user's **actual sequence of interactions**
— which categories and brands they view/click/cart/buy, and how often. That behavioral signal
is genuine and per-user, so the recommendation engine is built on it (see below). We also train
and honestly evaluate a supervised classifier on the given features — its near-random
performance is the correct, expected result of the correlation analysis above, and we report
it transparently rather than hiding it.

## Architecture

```
 real_dataset.csv (your uploaded data)
        |
        v
 recommender.py
   - per-user category/brand affinity scores, from real interaction counts
     (view=1, click=2, add_to_cart=3, purchase=5)
   - agent: combine affinity + propensity-model score -> rank candidates -> explain
        |                                    |
        v                                    v
 backend.py (FastAPI)                model.joblib (train_model.py)
   /users                             RandomForestClassifier predicting
   /recommend/{user_id}               `purchase` from price/discount/
   /metrics                           demographics/category/brand/device/location
        |
        v
 frontend/index.html (HTML/JS)
   - pick a customer, view recommendations + "why" explanations
   - shows the honest model evaluation panel
```

## The Model(s)

### 1. Recommendation engine — `recommender.py`
For a given user:
1. Pull their full interaction history
2. Compute weighted affinity scores per category and per brand from real event counts
3. Score every (category × brand) combination = `0.8 × affinity + 0.2 × propensity`
4. Generate an explanation citing the actual counts behind the recommendation
   (e.g. *"you've engaged with Apparel products 19 times (1 purchase), and you've
   interacted with Samsung 11 times"*)

### 2. Purchase-propensity classifier — `train_model.py` → `model.joblib`
A `RandomForestClassifier` (class-balanced, 200 trees) trained on price, discount,
age, loyalty score, previous purchase count, avg purchase value, category, brand,
device, location, gender, search keyword → predicts `purchase` (0/1).
`interaction_type` and `rating` were deliberately excluded as features — including
`interaction_type` would be label leakage (`purchase==1` iff `interaction_type=='purchase'`,
a 1:1 relationship confirmed during EDA), not a genuine predictive signal.

## Evaluation (honest numbers, from `metrics.json`)

| Metric | Value |
|---|---|
| Accuracy | 0.813 |
| Precision | 0.050 |
| Recall | 0.148 |
| F1 score | 0.074 |
| ROC-AUC | 0.486 |
| Majority-class baseline accuracy | 0.950 |

**How to explain this to judges**: ROC-AUC of ~0.49 is statistically equivalent to a coin
flip — this is the *expected and correct* result given the EDA finding that no feature
correlates with purchase in this dataset. We report precision/recall/F1/ROC-AUC alongside
accuracy specifically because accuracy alone is misleading here (always predicting
"no purchase" would already score 95% accuracy, since purchases are only ~5% of rows).
This is presented as a properly-built, properly-evaluated model on the data provided —
with real transactional data with genuine behavioral signal, the same pipeline would be
expected to perform meaningfully better.

## Setup & Run

```bash
pip install fastapi uvicorn pandas numpy scikit-learn joblib

# 1. Place your dataset at real_dataset.csv in this folder (already included)
# 2. Train the model (only needed once)
python3 train_model.py

# 3. Start the backend
uvicorn backend:app --reload --port 8000

# 4. Open the frontend
# Open frontend/index.html directly in your browser
# (it calls http://localhost:8000 -- change API_BASE in index.html if needed)
```

API docs (auto-generated): http://localhost:8000/docs

## What's next (not built here, for time reasons)
- Swap the rule-based explanation phrasing for a real LLM call for richer, more natural text
- If real transactional data (with stable product/customer IDs) becomes available, add
  genuine item-based collaborative filtering alongside the affinity-based approach
- Deploy via Docker + CI/CD (GitHub Actions → cloud)
- Real-time monitoring dashboard for recommendation quality drift

## Files
- `real_dataset.csv` — your uploaded dataset
- `train_model.py` — trains and evaluates the purchase-propensity classifier
- `model.joblib` / `metrics.json` — the trained model and its evaluation results
- `recommender.py` — the recommendation agent (affinity scoring + explanation)
- `backend.py` — FastAPI app
- `frontend/index.html` — demo UI
