"""
FastAPI backend for the Personalized Retail Recommendation Agent.
Data source: real_dataset.csv (the uploaded retail_personalization_dataset.csv)
Model: model.joblib (trained by train_model.py)

Run:
    pip install fastapi uvicorn pandas numpy scikit-learn joblib
    python3 train_model.py          # only needed once, trains + saves model.joblib
    uvicorn backend:app --reload --port 8000

Then open http://localhost:8000/docs for interactive API docs,
or open frontend/index.html in your browser (it calls this API).
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import recommender

app = FastAPI(title="Personalized Retail Recommendation Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load once at startup instead of per-request -- the dataset is 150k rows
# and the model is a Random Forest, both are expensive to reload every call.
_df_cache = None


@app.on_event("startup")
def _startup():
    global _df_cache
    _df_cache = recommender.load_dataset()
    recommender._get_model()  # warm the model cache too


@app.get("/")
def root():
    return {"status": "ok", "service": "retail-recommendation-agent", "dataset": "real_dataset.csv"}


@app.get("/users")
def users(limit: int = 200):
    return recommender.list_users(_df_cache, limit=limit)


@app.get("/recommend/{customer_id}")
def recommend(customer_id: str, top_k: int = 5):
    result = recommender.recommend_for_customer(customer_id, top_k=top_k)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.get("/metrics")
def metrics():
    return recommender.get_model_metrics()
