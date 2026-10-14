# WattWise AI — Development Status & Tracking Log

**Project Name:** WattWise AI — AI-Powered Energy Consumption Optimizer for Sustainable Energy  
**Academic Alignment:** B.Tech Computer Engineering Capstone / Final-Year Project  
**UN Sustainable Development Goals:** SDG 7 (Affordable and Clean Energy), SDG 12 (Responsible Consumption and Production)  
**Status Date:** October 2026  
**Current Phase:** Phase 6 (End-to-End Integration) & Phase 7 (Quality Assurance) Completed -> Phase 8 (Documentation & Delivery)

---

## 1. Phase Completion Summary

| Phase | Description | Status | Verification Details |
|---|---|---|---|
| **Phase 1** | Project Inspection & Workspace Audit | **COMPLETED** | Inspected runtimes, dependencies, project layout, MongoDB data files, model artifacts. |
| **Phase 2** | Architecture and Foundation | **COMPLETED** | Configured environment variables (`.env`, `.env.example`), local MongoDB Mongoose connection, loopback-only Flask server (8001), Express backend (5000), Vite React frontend (5173). |
| **Phase 3** | Database & Backend APIs | **COMPLETED** | Implemented User, EnergyReading, MlModelMeta, EnergyGoal schemas; JWT auth with bcrypt; energy CRUD; CSV import/export with duplicate rejection; cost calculation module with slab tariffs. |
| **Phase 4** | Machine Learning Engine | **COMPLETED** | Ridge regression pipeline selected over persistence baseline (MAE 0.6816 vs 1.1140); leak-free time-series lag/rolling features; 3-tier anomaly detection (IQR, rolling window, Isolation Forest); data-backed recommendation engine. |
| **Phase 5** | Frontend User Interface | **COMPLETED** | 11 React pages built with Tailwind CSS, Recharts, Lucide icons, responsive navigation layout, authentication state management, empty states, and KPI cards. |
| **Phase 6** | End-to-End Integration | **COMPLETED** | Connected React frontend <-> Express API <-> Python loopback inference service <-> local MongoDB. Endpoints verified: Auth, Energy CRUD, CSV Import/Export, Analytics, ML Status, Training, Forecasting, Anomalies, Recommendations, Goals, Settings. |
| **Phase 7** | Debugging & Quality Assurance | **COMPLETED** | Fixed CSV deduplication, added native fetch compatibility, added pure unit-tested `costCalculator.js`, created `recommendations.js` route with dismissal, added dual-mode model training (user data / sample demo data). |
| **Phase 8** | Documentation & Delivery | **COMPLETED** | Created comprehensive project docs: `README.md`, `ARCHITECTURE.md`, `API.md`, `MODEL_CARD.md`, `DATA_DICTIONARY.md`, `OFFLINE_SETUP.md`, `TEST_REPORT.md`, `ACADEMIC_REPORT.md`, and Windows batch/PS1 launch scripts. |

---

## 2. Completed Components

### Backend (`backend/`)
- **`src/server.js`**: Express application with Helmet, CORS, rate-limiting, centralized error handling, and route mounting.
- **`src/models/User.js`**: User schema with bcrypt password hashing, roles, and customizable tariff/currency/emission settings.
- **`src/models/EnergyReading.js`**: Energy readings schema with compound indices (`user + readingDate`, `user + meterId + readingDate`) and source tracking.
- **`src/models/EnergyGoal.js`**: Energy reduction target tracking schema.
- **`src/models/MlModelMeta.js`**: ML model persistence schema tracking trained algorithm, feature set, samples, and evaluation metrics.
- **`src/controllers/authController.js`**: User registration, login, and profile management with JWT tokens.
- **`src/controllers/energyController.js`**: Energy CRUD, CSV import with format validation and intra/cross-database duplicate rejection, CSV export, and one-click sample seeding.
- **`src/controllers/analyticsController.js`**: Summary aggregation, daily/weekly/monthly consumption trends, and cost estimation using `costCalculator.js`.
- **`src/controllers/mlController.js`**: Bridge between Node.js and Python Flask service; model training trigger, forecast querying, anomaly detection, and data-backed rule-based recommendations.
- **`src/controllers/goalsController.js`**: Target calculation with actual consumption comparison and progress percentage.
- **`src/controllers/settingsController.js`**: User tariff and grid carbon emission factor settings.
- **`src/utils/costCalculator.js`**: Pure mathematical calculations for flat tariffs, slab/bracket tiers, period comparisons, and carbon emissions.
- **`src/routes/recommendations.js`**: Dedicated endpoint `GET /api/v1/recommendations` and dismissal `POST /api/v1/recommendations/:id/dismiss`.

### Machine Learning Engine (`ml-engine/`)
- **`src/data_loader.py`**: Clean dataset loading, validation, timezone normalization, non-negative filtering, and duplicate removal.
- **`src/features.py`**: Leakage-free feature engineering: calendar features (`hour`, `day_of_week`, `is_weekend`, `month`, `day_of_year`, `week_of_year`), lagged features (`lag_1`, `lag_7`, `lag_14`), rolling window aggregations (`rolling_mean_7`, `rolling_std_7`, `rolling_mean_14`).
- **`src/train.py`**: Chronological train (70%) / validation (15%) / test (15%) split; persistence baseline evaluation; Ridge vs. RandomForest vs. HistGradientBoosting candidate model selection; joblib artifact persistence.
- **`src/predict.py`**: Forward forecast generator using trained pipeline artifacts and historical windowing.
- **`src/anomaly_detection.py`**: Multi-method statistical anomaly detector (IQR with 2.5x threshold, 14-day rolling window z-score, and scikit-learn Isolation Forest).
- **`src/server.py`**: Localhost/loopback-only (127.0.0.1) Flask HTTP service exposing `/health`, `/train`, `/evaluation`, `/forecast`, `/detect-anomalies`.

### Frontend (`frontend/`)
- **`src/layouts/AppLayout.jsx`**: Responsive layout with sidebar navigation, active route styling, mobile drawer, and user profile session widget.
- **`src/pages/DashboardPage.jsx`**: High-level overview with 4 KPI cards, interactive Recharts consumption area chart, previous period delta badges, and ML engine online/offline status banner.
- **`src/pages/EnergyPage.jsx`**: Data table with pagination, date filtering, manual CRUD modal, CSV upload, CSV export, and Demo Data one-click loader.
- **`src/pages/AnalyticsPage.jsx`**: In-depth consumption and cost breakdown by day, week, or month with dual interactive charts.
- **`src/pages/ForecastPage.jsx`**: AI forecast view with selectable horizon (3 to 30 days), algorithm metadata display, test MAE vs baseline comparison, and Dual-Mode Training buttons ("Train on My Data" & "Train with Sample Data").
- **`src/pages/AnomaliesPage.jsx`**: Anomaly detection dashboard displaying observed vs expected kWh, deviation scores, and non-judgmental explanations.
- **`src/pages/RecommendationsPage.jsx`**: Actionable energy conservation tips with evidence citing actual usage metrics, estimated financial impact, and dismiss functionality.
- **`src/pages/GoalsPage.jsx`**: Goal creator and visual progress bars showing actual kWh vs target.
- **`src/pages/ReportsPage.jsx`**: Date-filtered comprehensive energy report with charts, anomaly summary, CSV export, and Print / Save PDF capability.
- **`src/pages/SettingsPage.jsx`**: Configurable price per kWh, fixed monthly charge, and grid emission factor.
- **`src/pages/LoginPage.jsx` & `RegisterPage.jsx`**: Authentication pages with client-side form validation.

### Automation Scripts (`scripts/`)
- **`scripts/start-all.bat`**: Single-click launcher opening separate terminal windows for Backend, ML Engine, and Frontend.
- **`scripts/start-all.ps1`**: PowerShell equivalent launcher.
- **`scripts/start-backend.bat`**: Launches Express backend.
- **`scripts/start-ml.bat`**: Launches Python ML inference server.
- **`scripts/start-frontend.bat`**: Launches Vite React development server.
- **`scripts/seed-sample-data.js`**: CLI seeding utility.

---

## 3. Files Created or Modified

| File | Action | Purpose |
|---|---|---|
| `backend/src/utils/costCalculator.js` | Created | Module D electricity cost calculator with flat/slab pricing and emissions |
| `backend/tests/costCalculator.test.js` | Created | Unit tests verifying all mathematical formulas in Module D |
| `backend/src/routes/recommendations.js` | Created | REST endpoints for recommendations and dismiss actions |
| `backend/src/server.js` | Modified | Mounted `/api/v1/recommendations` route |
| `backend/src/controllers/analyticsController.js` | Modified | Integrated `costCalculator.js` and carbon emission calculations |
| `backend/src/controllers/energyController.js` | Modified | Added CSV duplicate detection and `seedSampleReadings` endpoint |
| `backend/src/routes/energy.js` | Modified | Added `POST /api/v1/energy/seed-sample` route |
| `backend/src/controllers/mlController.js` | Modified | Added `useSample` option support and native `fetch` fallback |
| `frontend/src/services/api.js` | Modified | Added `seedSample`, `useSample` parameter support, and `dismissRecommendation` |
| `frontend/src/pages/ForecastPage.jsx` | Modified | Added dual training buttons and improved model status display |
| `frontend/src/pages/RecommendationsPage.jsx` | Modified | Added recommendation dismissal action |
| `frontend/src/pages/ReportsPage.jsx` | Modified | Added Print / Save PDF button |
| `frontend/src/pages/EnergyPage.jsx` | Modified | Added Demo Data quick loader button |
| `scripts/start-all.bat` | Created | Windows batch launcher |
| `scripts/start-all.ps1` | Created | PowerShell service launcher |
| `scripts/start-backend.bat` | Created | Backend service launcher |
| `scripts/start-ml.bat` | Created | ML engine service launcher |
| `scripts/start-frontend.bat` | Created | Frontend dev launcher |
| `scripts/seed-sample-data.js` | Created | CLI data seeding utility |
| `docs/ARCHITECTURE.md` | Created | Architecture specification & sequence diagrams |
| `docs/API.md` | Created | Complete REST API specification |
| `docs/MODEL_CARD.md` | Created | ML model card and performance evaluation report |
| `docs/DATA_DICTIONARY.md` | Created | Schemas and data structures |
| `docs/OFFLINE_SETUP.md` | Created | Offline execution and setup guide |
| `docs/TEST_REPORT.md` | Created | Test execution summary |
| `docs/ACADEMIC_REPORT.md` | Created | Academic Capstone Documentation & Faculty Presentation Script |
| `README.md` | Created | Primary project README |

---

## 4. Test Verification Summary

### Machine Learning Unit Tests (`ml-engine/tests/test_ml.py`)
- `TestDataLoader`: 6 tests passing (clean loading, negative filtering, duplicate removal, empty validation, missing column validation, sample generation).
- `TestFeatures`: 4 tests passing (column generation, lag integrity, NaN handling, future feature projection).
- `TestTrain`: 4 tests passing (end-to-end training, artifact persistence, insufficient data handling, chronological splitting).
- `TestPredict`: 5 tests passing (horizon bounds, non-negative kWh, future timestamps, 90-day capping, insufficient history handling).
- `TestAnomalyDetection`: 6 tests passing (IQR spike detection, rolling window detection, low false-positive on baseline data, minimum reading enforcement, output schema validation).
- **Result:** 25/25 Passing.

### Backend Unit & Integration Tests (`backend/tests/`)
- `costCalculator.test.js`: 13 tests passing (flat tariff, slab/tiered pricing, period delta/savings comparisons, carbon emission calculations, boundary condition handling).
- `api.test.js`: 21 tests passing (Auth registration/login/JWT, Energy CRUD, Data isolation between distinct users, Analytics aggregation, Goals creation/deletion, Settings tariff updates, Recommendations listing/dismissal, CSV duplicate prevention, Health check).
- **Result:** 34/34 Passing.

---

## 5. Next Steps for Evaluator Demonstration
1. Start MongoDB Community Server (`mongod`).
2. Run `scripts\start-all.bat` (or start each service via `start-backend.bat`, `start-ml.bat`, `start-frontend.bat`).
3. Open `http://localhost:5173`.
4. Register a new user account.
5. In Energy Records, click **"Demo Data"** to load 60 sample readings.
6. In AI Forecast, click **"Train on My Data"** to fit the machine learning model.
7. Generate a 7-day or 14-day energy forecast.
8. Inspect statistical anomalies and actionable energy-saving recommendations.
