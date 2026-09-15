# Personalized Retail Recommendation Agent

An agentic recommendation system for retail: it profiles a customer from their purchase history, browsing behavior, and interactions, then recommends relevant products/offers and **explains why** each one was picked — instead of generic, one-size-fits-all suggestions.

Built for the "Personalized Retail Recommendation Agent" problem statement (Recommendation / Agentic AI track).

## How it's organized

This repo contains two things:

| Folder | What it is |
|---|---|
| `backend/` + `frontend/` | The full product: a Node/Express + PostgreSQL API and a React (Vite) web app — auth, product catalog, browsing/purchase history, saved products, dashboards. |
| `retail-agent/` | The recommendation engine itself: a Python service that computes per-customer affinity scores, ranks products, and generates plain-language explanations. Also includes the EDA/model notebook behind the purchase-propensity classifier. |

The Node backend calls the Python recommendation service to produce results for `GET /api/recommendations/:customerId`.

```
 React frontend (Vite)
        |
        v
 Node/Express API  --------->  Python recommendation service (FastAPI)
        |                              |
        v                              v
   PostgreSQL                    model.joblib (RandomForest
 (customers, products,           purchase-propensity classifier)
  purchases, browsing,
  interactions, recs)
```

## Tech stack

- **Frontend:** React 19, Vite, React Router, Axios
- **Backend:** Node.js, Express 5, PostgreSQL (`pg`), JWT auth, bcrypt
- **Recommendation service:** Python, FastAPI, scikit-learn, pandas
- **Deployment:** Frontend on Vercel, backend on Render

## Getting started

### 1. Database (PostgreSQL)

```bash
createdb retail_recommendation_v2
psql -d retail_recommendation_v2 -f database/schema.sql
psql -d retail_recommendation_v2 -f database/seed.sql
```

### 2. Recommendation service (`retail-agent/`)

```bash
cd retail-agent
pip install -r requirements.txt

# train the model (only needed once — model.joblib is already included)
python3 train_model.py

uvicorn backend:app --reload --port 8000
```

### 3. API server (`backend/`)

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/retail_recommendation_v2
JWT_SECRET=replace-with-a-long-random-string
FRONTEND_URL=http://localhost:5174
ML_SERVICE_URL=http://localhost:8000
```

```bash
cd backend
npm install
npm run dev      # nodemon, http://localhost:5000
```

### 4. Web app (`frontend/`)

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

```bash
cd frontend
npm install
npm run dev       # http://localhost:5174
```

## API overview

All routes are prefixed with `/api`.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| POST | `/auth/register` | — | Create a customer account |
| POST | `/auth/login` | — | Log in, returns a JWT |
| GET | `/auth/me` | Yes | Current authenticated user |
| GET | `/products` | — | List products |
| GET | `/products/:id` | — | Product detail |
| GET | `/recommendations/:customerId` | Yes | Personalized recommendations + explanations |
| POST | `/recommendations/feedback` | Yes | Submit feedback on a recommendation |
| GET | `/customers/:id` | Yes | Customer profile |
| PUT | `/customers/:id` | Yes | Update customer profile |
| GET | `/history/:customerId/stats` | Yes | Dashboard stats |
| GET | `/history/:customerId/purchases` | Yes | Purchase history |
| GET | `/history/:customerId/browsing` | Yes | Browsing history |
| GET | `/history/:customerId/saved` | Yes | Saved products |
| GET | `/history/saved/status/:productId` | Yes | Whether a product is saved |
| POST | `/history/saved/toggle` | Yes | Save/unsave a product |
| POST | `/history/view` | Yes | Record a product view |

## How recommendations are generated

For a given customer, the recommendation service:

1. Pulls their full interaction history (views, clicks, add-to-cart, purchases).
2. Computes weighted affinity scores per category and brand from those events (`view=1, click=2, add_to_cart=3, purchase=5`).
3. Scores every category x brand combination as `0.8 x affinity + 0.2 x purchase-propensity`.
4. Returns ranked recommendations, each with a plain-language explanation citing the actual interaction counts behind it (e.g. *"you've engaged with Apparel 19 times (1 purchase), and interacted with Samsung 11 times"*).

The purchase-propensity model is a `RandomForestClassifier` trained on price, discount, demographics, category, brand, device, location, and search keywords. `retail-agent/README.md` documents the full EDA, including an honest evaluation of the model (precision/recall/F1/ROC-AUC alongside accuracy, since raw accuracy is misleading on this ~5%-purchase-rate dataset).

## Testing

```bash
cd backend
npm test
```

## Deployment

- **Frontend:** deployed to Vercel (`frontend/vercel.json` handles SPA rewrites). Set `VITE_API_URL` to the deployed backend URL.
- **Backend:** deployed to Render. Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, and `ML_SERVICE_URL` as environment variables.
- **Recommendation service:** deploy as its own service (e.g. Render/Railway) and point the backend's `ML_SERVICE_URL` at it.

## Roadmap

- Replace rule-based explanation text with an LLM call for richer, more natural explanations
- Add genuine item-based collaborative filtering once stable product/customer IDs are available
- Docker + CI/CD (GitHub Actions)
- Monitoring dashboard for recommendation quality drift
