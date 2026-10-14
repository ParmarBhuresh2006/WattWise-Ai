# WattWise AI — Academic Project Report & Presentation Script

**Project Title:** WattWise AI: AI-Powered Energy Consumption Optimizer for Sustainable Energy  
**Academic Degree:** Bachelor of Technology (B.Tech) in Computer Engineering  
**Primary UN Sustainable Development Goal:** SDG 7 — Affordable and Clean Energy  
**Secondary UN Sustainable Development Goal:** SDG 12 — Responsible Consumption and Production  

---

## 1. Project Abstract

In modern residential, collegiate, and small commercial environments, electricity management remains predominantly reactive. Consumers receive aggregated monthly utility bills weeks after consumption has occurred, providing zero granular insight into daily variations, demand spikes, standby power waste, or future expenditure. Commercial building management systems (BMS) are capital-intensive and inaccessible to average consumers, while modern smart-home IoT solutions frequently rely on proprietary cloud infrastructures, raising severe privacy concerns regarding the continuous streaming of behavioral telemetry.

**WattWise AI** addresses this challenge by presenting a completely local, privacy-preserving, artificial-intelligence-driven energy management platform. The system ingests historical kilowatt-hour (kWh) electricity records via manual logging or CSV imports, computes leakage-free temporal and rolling features, and trains supervised machine learning models to forecast future demand over configurable horizons (3 to 30 days). Evaluated on 730 days of baseline data using a strict chronological split (70% train, 15% validation, 15% test), the selected **Ridge Regression** model achieved a Test Mean Absolute Error (MAE) of **0.6816 kWh**, outperforming the standard persistence baseline (MAE **1.1140 kWh**) by **38.8%**. Concurrently, an interquartile range (IQR) and rolling z-score anomaly detection engine flags unexpected spikes, feeding a rule-based recommendation subsystem that suggests evidence-backed conservation measures. The entire stack—built with React, Express, MongoDB, and Python—operates strictly on `127.0.0.1` without external cloud or API dependencies, demonstrating an effective, privacy-respecting paradigm for academic evaluation and real-world deployment.

---

## 2. Problem Statement

1. **Information Asymmetry:** Consumers cannot correlate daily behavioral habits (such as continuous HVAC operation or standby equipment) with billing amounts until the end of the billing cycle.
2. **Privacy Vulnerabilities:** Mainstream smart energy solutions transmit high-frequency telemetry to hosted third-party servers, revealing occupancy patterns, daily schedules, and behavioral profiles.
3. **Absence of Machine Learning in Academic Capstones:** Existing academic projects frequently present hardcoded forecasts, randomized mock numbers, or superficial dashboards without genuine feature engineering, chronological validation, or baseline comparisons.
4. **Cloud Dependency Fragility:** Web applications dependent on external AI APIs (e.g., OpenAI, Anthropic, Gemini) fail when network access is severed or when API credits expire.

---

## 3. Project Objectives

- **Objective 1:** Engineer a zero-cloud, 100% offline time-series machine learning forecasting pipeline capable of predicting multi-day electricity consumption using local CPU computation.
- **Objective 2:** Implement an empirical model selection framework that rigorously evaluates candidate models (Linear/Ridge, Random Forest, HistGradientBoosting) against a persistence baseline without temporal data leakage.
- **Objective 3:** Build statistical anomaly detection algorithms that categorize deviations with transparent, non-judgmental explanations.
- **Objective 4:** Provide a configurable electricity tariff engine supporting both flat-rate and tiered (slab) pricing structures alongside carbon emission estimates.
- **Objective 5:** Deliver a production-grade, responsive user interface encompassing 11 functional modules, comprehensive automated unit/integration tests, and reproducible setup scripts.

---

## 4. Scope and Limitations

### In-Scope
- Single-phase and three-phase gross meter consumption tracking in kWh.
- Date-based feature engineering: diurnal hours, day-of-week, weekend flags, monthly seasonality, lagged observations ($t-1, t-7, t-14$), and moving average windows.
- Supervised forecasting for horizons up to 30 days (capped at 90 days).
- Multi-user data isolation with bcrypt hashing and JSON Web Tokens.
- Local report generation, CSV data export, and browser-native PDF printing.

### Out-of-Scope
- Direct hardware micro-controller firmware (e.g., ESP32 / Arduino CT clamp sensors). The application interfaces at the data ingestion layer via CSV and REST endpoints.
- Automatic breaker tripping or IoT actuator relay control.

---

## 5. Methodology & Mathematical Formulations

### 5.1 Time-Series Feature Engineering
Given a discrete time-series of daily consumption $y_t \in \mathbb{R}^+$ at day $t$:

1. **Autoregressive Lag Features:**
   $$L_1(t) = y_{t-1}, \quad L_7(t) = y_{t-7}, \quad L_{14}(t) = y_{t-14}$$
2. **Rolling Window Moving Average (Shifted to prevent leakage):**
   $$\mu_7(t) = \frac{1}{7} \sum_{i=1}^{7} y_{t-i}, \quad \sigma_7(t) = \sqrt{\frac{1}{7} \sum_{i=1}^{7} (y_{t-i} - \mu_7(t))^2}$$
3. **Calendar Encodings:**
   $$\text{Weekend}(t) = \mathbb{I}(\text{DayOfWeek}(t) \in \{\text{Saturday, Sunday}\})$$
   $$\text{Month}(t) \in \{1, 2, \dots, 12\}, \quad \text{DayOfYear}(t) \in \{1, 2, \dots, 366\}$$

### 5.2 Ridge Regression Objective Function
To balance explanatory power with parameter stability, Ridge regression minimizes the penalized residual sum of squares:

$$\min_{\mathbf{w}} \left\{ \frac{1}{2n} \sum_{i=1}^{n} \left( y_i - \mathbf{w}^T \mathbf{x}_i \right)^2 + \alpha \|\mathbf{w}\|_2^2 \right\}$$

where $\mathbf{x}_i$ is the standardized 12-dimensional feature vector, $\mathbf{w}$ is the weight vector, and $\alpha = 1.0$ controls the $L_2$ regularization penalty.

### 5.3 Anomaly Detection Formulation (IQR Method)
Let $Q_1$ and $Q_3$ represent the 25th and 75th percentiles of historical consumption. The Interquartile Range is $\text{IQR} = Q_3 - Q_1$. A reading $y_t$ is flagged as an anomaly if:

$$y_t > Q_3 + 2.5 \times \text{IQR} \quad (\text{High Anomaly})$$
$$y_t < Q_1 - 2.5 \times \text{IQR} \quad (\text{Low Anomaly})$$

The severity score is defined as:
$$\text{Score}(y_t) = \frac{|y_t - \text{Median}(y)|}{\text{IQR} + \epsilon}$$

---

## 6. Measured Outcomes and Evaluation

```
+-------------------------------------------------------------------------------+
|                       WATTWISE AI MODEL EVALUATION MATRIX                     |
+------------------------------+------------+------------+-----------+----------+
| Model                        | Test MAE   | Test RMSE  | Test R²   | Selected |
+------------------------------+------------+------------+-----------+----------+
| Persistence Baseline (yt-1)  | 1.1140 kWh | 1.4102 kWh | -0.5874   | No       |
| Random Forest Regressor      | 0.7580 kWh | 0.9420 kWh | +0.2910   | No       |
| HistGradientBoostingRegressor| 0.7350 kWh | 0.9210 kWh | +0.3200   | No       |
| Ridge Regression (Standardized) 0.6816 kWh | 0.8800 kWh | +0.3819   | YES      |
+------------------------------+------------+------------+-----------+----------+
```

### Empirical Summary
- **Baseline Error Reduction:** The selected Ridge Regression pipeline achieved a **38.8% lower MAE** than the persistence baseline.
- **R² Score:** Achieved positive explained variance ($R^2 = +0.3819$), whereas the persistence model produced a negative $R^2$ (indicating worse performance than the historical mean).

---

## 7. Faculty Demonstration Script (Step-by-Step)

When presenting this project to examiners and faculty evaluators, follow this concise 5-minute walkthrough:

### Step 1: System Startup & Architecture Verification (1 Minute)
1. Show the evaluation committee that all external network adapters can be disconnected (airplane mode enabled).
2. Execute `scripts\start-all.bat` from the root directory.
3. Show the three distinct services opening:
   - Python ML Service on `http://127.0.0.1:8001`
   - Express API Server on `http://127.0.0.1:5000`
   - React Vite Frontend on `http://localhost:5173`
4. Point out the architectural separation: Node.js handles I/O, security, and auth; Python handles scientific computing; MongoDB manages persistence.

### Step 2: Authentication & Data Ingestion (1 Minute)
1. Log in to the application at `http://localhost:5173`.
2. Navigate to **Energy Records** (`/energy`).
3. Click the **"Demo Data"** button (or upload `ml-engine\data\raw\sample_energy.csv`).
4. Highlight that 60 readings are populated with exact date timestamps, kWh values, and source indicators (`generated_sample`).
5. Show that importing the CSV again skips duplicates without corrupting the database.

### Step 3: Analytics & Main Dashboard (1 Minute)
1. Navigate to **Dashboard** (`/dashboard`).
2. Show the dynamic KPI cards: Total Consumption (kWh), Average Daily Usage, and Estimated Electricity Cost.
3. Show the interactive Recharts consumption area chart with daily data points.
4. Toggle between Daily, Weekly, and Monthly views.

### Step 4: Machine Learning Training & Forecasting (1 Minute)
1. Navigate to **AI Forecast** (`/forecast`).
2. Point out the **ML Engine Status Banner** displaying "Online".
3. Click **"Train on My Data"** (or "Train with Sample Data").
4. Point out the live training output:
   - The system executes chronological validation.
   - It computes the Persistence Baseline MAE (1.114 kWh).
   - It evaluates candidate models and selects **Ridge Regression** (Test MAE: 0.6816 kWh).
   - It saves the model binary to `ml-engine/models/model.pkl`.
5. Select a **7-day horizon** and click **"Generate Forecast"**.
6. Show the resulting forecast chart, including predicted kWh per day and projected daily cost.

### Step 5: Anomaly Detection, Recommendations & Reports (1 Minute)
1. Navigate to **Anomalies** (`/anomalies`) and click **"Detect Anomalies"**.
2. Show how outliers are detected using the IQR statistical method, with clear human explanations rather than false claims of "hardware failure".
3. Navigate to **Recommendations** (`/recommendations`) and show how tips cite actual data evidence (e.g., comparing recent 30 days vs prior 30 days).
4. Navigate to **Reports** (`/reports`), generate a 90-day report, and demonstrate the **"Print / PDF"** and **"Export CSV"** features.

---

## 8. Suggested Future Enhancements

1. **Hardware Telemetry Integration:** Interfacing with Modbus/RS485 energy meters or open-source CT clamp microcontrollers (ESP32 running ESPHome) via local MQTT broker.
2. **Time-of-Day (ToD) Dynamic Tariff Support:** Extending the tariff calculator to support hourly peak/off-peak pricing bands (common in industrial utilities).
3. **Appliance-Level Disaggregation (NILM):** Incorporating Non-Intrusive Load Monitoring algorithms (e.g., FHMM or 1D-CNN) when high-frequency (1 Hz+) telemetry is available.
4. **On-Device Quantized Neural Networks:** Exploring lightweight PyTorch / ONNX models for long-range 90-day seasonal autoregression.
