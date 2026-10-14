# WattWise AI — Sustainable Energy Optimizer

> **AI-Powered Energy Consumption Forecasting, Anomaly Detection & Cost Optimization for Sustainable Living**  
> *Aligned with UN Sustainable Development Goals: SDG 7 (Affordable and Clean Energy) & SDG 12 (Responsible Consumption and Production)*

---

## 🌿 Overview

**WattWise AI** is a complete, production-style academic capstone project designed for B.Tech Computer Engineering evaluations. It enables households, student hostels, university laboratories, and small offices to monitor electricity consumption, predict future demand using real supervised machine learning, detect unusual usage spikes, and discover actionable energy conservation opportunities.

### Non-Negotiable Core Principle: 100% Offline & Private
- **Zero Cloud Services:** No Firebase, Supabase, AWS, or cloud databases.
- **Zero External AI APIs:** No OpenAI, Google Gemini, or Anthropic Claude API dependencies.
- **Genuine Machine Learning:** Real feature engineering, leak-free chronological validation, and model evaluation against a persistence baseline.
- **Zero Data Leakage:** All data, models, and analytics remain strictly on `127.0.0.1`.

---

## ⚡ Key Modules & Features

| Module | Feature | Implementation Details |
|---|---|---|
| **Module A** | Authentication & Security | JWT auth, salted bcrypt hashing (cost 12), strict multi-tenant isolation, role authorization |
| **Module B** | Dynamic Dashboard | Period KPIs (total kWh, cost, daily avg, change %), Recharts trends, ML online status |
| **Module C** | Energy Records Management | Paginated CRUD, manual entries, CSV upload with duplicate rejection, CSV export |
| **Module D** | Electricity Cost Estimator | Configurable rate per kWh, fixed monthly fee, tiered slab tariffs, carbon emissions |
| **Module E** | Machine Learning Forecaster | Ridge Regression (MAE 0.6816 vs Baseline 1.1140), 12 leak-free features, 3-30 day horizon |
| **Module F** | Anomaly Detection | Multi-tier statistical detection: IQR (2.5x threshold), rolling z-score, Isolation Forest |
| **Module G** | Intelligent Recommendations | Evidence-based conservation tips with estimated savings and session dismissal |
| **Module H** | Goals & Sustainability | Monthly/weekly kWh targets with real-time visual progress bars and alerts |
| **Module I** | Reports & Data Export | Date-filtered analytics, anomaly summaries, CSV export, and native Print / PDF support |
| **Module J** | Settings & Customization | Configurable electricity tariff, currency selection, and grid emission factor |

---

## 🏗️ System Architecture

```
+-------------------------------------------------------------------------+
|                        React 19 + Vite Frontend                         |
|                     (http://localhost:5173 - Client)                    |
+------------------------------------+------------------------------------+
                                     |  HTTP REST (JSON / Bearer JWT)
                                     v
+-------------------------------------------------------------------------+
|                       Node.js + Express.js Backend                      |
|                   (http://127.0.0.1:5000 - Port 5000)                   |
|   - Helmet Security, Rate Limiter, Express-Validator, Error Handler    |
|   - Cost & Slab Tariff Calculator (pure utility)                       |
+--------------------+-------------------------------+--------------------+
                     |                               | Loopback HTTP (JSON)
                     v                               v (127.0.0.1:8001 only)
+------------------------------------+  +---------------------------------+
|      Local MongoDB Community       |  |      Python 3.10+ ML Engine     |
|   (mongodb://127.0.0.1:27017)      |  |   - Ridge Regressor Pipeline    |
|   - Users (bcrypt credentials)     |  |   - Leak-free Lag & Rolling Feat|
|   - EnergyReadings (indexed)       |  |   - IQR / Rolling / IsoForest   |
|   - EnergyGoals & MlModelMetas     |  |   - Joblib Serialized Artifacts |
+------------------------------------+  +---------------------------------+
```

---

## 🚀 How to Run This Project (Windows)

> 💡 **Prefer plain text?** See [HOW_TO_RUN.txt](file:///d:/Github/WattWise%20Ai/HOW_TO_RUN.txt) for instructions you can open directly in Notepad.

### Prerequisites
Ensure the following are installed and running locally:
- **Node.js:** v18.0.0 or higher (`node --version`)
- **Python:** v3.10 or higher (`python --version`)
- **MongoDB:** Community Edition running on default port `27017`
  ```cmd
  net start MongoDB
  ```

---

### Step 1: Initial Setup (Run Once)

```cmd
:: 1. Copy environment files
copy .env.example .env
copy .env.example backend\.env

:: 2. Install Backend Dependencies
cd backend
npm install
cd ..

:: 3. Install Frontend Dependencies
cd frontend
npm install
cd ..

:: 4. Install Python ML Dependencies
cd ml-engine
pip install -r requirements.txt
cd ..

:: 5. Seed Default Admin Account
cd backend
npm run seed:admin
cd ..
```

**Default Admin Credentials:**
- **Email:** `admin@wattwise.local`
- **Password:** `Admin@WattWise2024`

---

### Step 2: Launch the Project

#### Option A: One-Click Startup (Recommended)
Double-click `scripts\start-all.bat` or run in terminal:
```cmd
scripts\start-all.bat
```
*(PowerShell users can run: `.\scripts\start-all.ps1`)*

This launches three dedicated processes in separate windows:
1. **Python ML Engine:** `http://127.0.0.1:8001`
2. **Node.js Express Backend:** `http://127.0.0.1:5000`
3. **React Vite UI:** `http://localhost:5173`

#### Option B: Manual Startup (Three Terminals)
- **Terminal 1 (ML Engine):**
  ```cmd
  cd ml-engine\src && python server.py
  ```
- **Terminal 2 (Backend):**
  ```cmd
  cd backend && npm run dev
  ```
- **Terminal 3 (Frontend):**
  ```cmd
  cd frontend && npm run dev
  ```

---

### Step 3: Access & Test the Application

1. Open your browser at **[http://localhost:5173](http://localhost:5173)**.
2. Sign in with `admin@wattwise.local` / `Admin@WattWise2024` (or click "Create one" to register).
3. **Energy Records:** Click the **"Demo Data"** button to load 60 days of synthetic baseline readings.
4. **Dashboard:** Observe dynamic total kWh, monthly cost estimates, and the 30-day area trend chart.
5. **AI Forecast:** Click **"Train on My Data"** (or "Train with Sample Data") to fit the model, then select a horizon and click **"Generate Forecast"**.
6. **Anomalies:** Click **"Detect Anomalies"** to identify statistical usage spikes.
7. **Recommendations:** Review data-backed conservation tips with estimated monetary savings.
8. **Reports:** Generate date-filtered reports and test the **"Print / PDF"** and **"Export CSV"** features.

## 🧪 Automated Testing

### 1. Run Machine Learning Tests (`pytest`)
```cmd
cd "D:\Github\WattWise Ai\ml-engine"
python -m pytest tests/ -v
```
*Result: 25/25 passing tests.*

### 2. Run Cost Calculator & Backend Integration Tests (`jest`)
```cmd
cd "D:\Github\WattWise Ai\backend"
npm test
```
*Result: 34/34 passing tests.*

---

## 📊 Measured Machine Learning Performance

Evaluated on 730 days of daily consumption data using strict chronological splitting (70% train, 15% validation, 15% test):

| Model | Test MAE (kWh) | Test RMSE (kWh) | Test $R^2$ | Outcome |
|---|---|---|---|---|
| **Persistence Baseline** | 1.1140 | 1.4102 | -0.5874 | Baseline Reference |
| **Ridge Regression** | **0.6816** | **0.8800** | **+0.3819** | **SELECTED (38.8% lower MAE)** |
| Random Forest Regressor | 0.7580 | 0.9420 | +0.2910 | Rejected (Higher error) |
| HistGradientBoosting | 0.7350 | 0.9210 | +0.3200 | Rejected (Higher error) |

---

## 📑 Detailed Documentation Roadmap

- [System Architecture Specification](file:///d:/Github/WattWise%20Ai/docs/ARCHITECTURE.md)
- [REST API Reference](file:///d:/Github/WattWise%20Ai/docs/API.md)
- [Machine Learning Model Card](file:///d:/Github/WattWise%20Ai/docs/MODEL_CARD.md)
- [Data Dictionary & Schemas](file:///d:/Github/WattWise%20Ai/docs/DATA_DICTIONARY.md)
- [Offline Windows Setup Guide](file:///d:/Github/WattWise%20Ai/docs/OFFLINE_SETUP.md)
- [Test Report & Acceptance Criteria](file:///d:/Github/WattWise%20Ai/docs/TEST_REPORT.md)
- [Academic Capstone Report & Presentation Script](file:///d:/Github/WattWise%20Ai/docs/ACADEMIC_REPORT.md)
- [Development Status Log](file:///d:/Github/WattWise%20Ai/DEVELOPMENT_STATUS.md)

---

## 👥 Academic Credits & SDG Impact

- **Primary SDG:** [Goal 7: Affordable and Clean Energy](https://sdgs.un.org/goals/goal7) — Target 7.3 (Double the global rate of improvement in energy efficiency).
- **Secondary SDG:** [Goal 12: Responsible Consumption and Production](https://sdgs.un.org/goals/goal12) — Target 12.2 (Sustainable management and efficient use of natural resources).
- **Project Type:** B.Tech Computer Engineering Final-Year Capstone Project.
