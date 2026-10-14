# WattWise AI — Machine Learning Model Card

## 1. Model Details

- **Model Name:** WattWise Energy Demand Forecaster
- **Version:** `20261014_165348`
- **Model Type:** Supervised Time-Series Forecasting Regressor
- **Selected Algorithm:** Ridge Regression (`sklearn.linear_model.Ridge`) with `StandardScaler`
- **Framework:** scikit-learn 1.5+, pandas 2.2+, NumPy 2.5+
- **Serialization:** joblib (`ml-engine/models/model.pkl`)
- **Metadata Reference:** `ml-engine/models/model_meta.json`
- **Training Paradigm:** Chronological validation split (no random shuffling, zero data leakage)
- **License:** Open Academic License for Educational Evaluation

---

## 2. Intended Use

### Primary Intended Uses
- Short-term electricity consumption forecasting (3 to 30 days) for individual households, student hostels, and small institutional buildings.
- Comparative baselining against historical energy consumption.
- Statistical anomaly detection on historical energy data using robust thresholds.
- Data-driven energy conservation recommendations aligned with UN SDG 7 (Affordable and Clean Energy).

### Out-of-Scope & Misuse Cases
- **Industrial Grid Scheduling:** Not suitable for utility-scale grid dispatch or real-time sub-second frequency regulation.
- **Fault Diagnosis Claims:** The anomaly detection system flags statistical outliers; it does not diagnose specific electrical short-circuits or appliance hardware failures without sub-metered telemetry.
- **Contractual Billing:** Financial estimates are user-configurable guidelines and must not be used as official electricity bills.

---

## 3. Training & Validation Methodology

### Chronological Splitting Strategy
Because energy consumption data possesses strong autocorrelation and seasonal dependence, standard k-fold cross-validation with random shuffling was strictly prohibited to prevent temporal data leakage.

```
+---------------------------+-------------------+-------------------+
|      Train Set (70%)      | Validation (15%)  |    Test (15%)     |
|   (Chronologically first) |    (Mid-period)   |  (Held-out final) |
+---------------------------+-------------------+-------------------+
```

### Preprocessing & Scaling
- Feature scaling using `StandardScaler` is **fitted exclusively on the training fold**.
- Mean and standard deviation parameters from the training fold are subsequently applied to the validation and test folds without refitting.

### Feature Definitions (12 Input Dimensions)

| Feature | Type | Source | Purpose |
|---|---|---|---|
| `hour` | Integer [0–23] | Timestamp | Diurnal consumption pattern |
| `day_of_week` | Integer [0–6] | Timestamp | Weekly usage cycle (weekday vs. weekend) |
| `is_weekend` | Binary [0, 1] | Timestamp | Binary indicator for non-working days |
| `month` | Integer [1–12] | Timestamp | Seasonal weather and daylight effects |
| `day_of_year` | Integer [1–366]| Timestamp | Long-term annual seasonality |
| `week_of_year`| Integer [1–53] | Timestamp | Sub-annual trend tracking |
| `lag_1` | Float (kWh) | Past observation | Immediate prior-day persistence |
| `lag_7` | Float (kWh) | Past observation | Same-day prior-week persistence |
| `lag_14`| Float (kWh) | Past observation | Two-week prior baseline |
| `rolling_mean_7` | Float (kWh) | Past 7 days | Short-term smoothed baseline (shifted) |
| `rolling_std_7`  | Float (kWh) | Past 7 days | Short-term volatility index (shifted) |
| `rolling_mean_14`| Float (kWh) | Past 14 days| Medium-term smoothed baseline (shifted) |

*Important:* All rolling aggregations use `shift(1)` so that day $t$'s target value is strictly excluded from day $t$'s feature vector.

---

## 4. Empirical Evaluation & Model Selection

During the model selection phase, four distinct candidates were evaluated on the validation fold:

1. **Persistence Baseline:** Naive forecast predicting tomorrow's consumption as today's consumption ($y_t = y_{t-1}$).
2. **Ridge Regression:** Linear regression with $L_2$ regularization ($\alpha=1.0$) and standardized inputs.
3. **Random Forest Regressor:** Non-linear ensemble of 100 decision trees (depth $\le 8$).
4. **HistGradientBoostingRegressor:** Histogram-based gradient boosted decision trees.

### Evaluation Metrics on Held-out Test Set

| Model Candidate | Validation MAE (kWh) | Test MAE (kWh) | Test RMSE (kWh) | Test $R^2$ | Selection Decision |
|---|---|---|---|---|---|
| **Persistence Baseline** | — | 1.1140 | 1.4102 | -0.5874 | Baseline Reference |
| **Ridge Regression** | **0.6720** | **0.6816** | **0.8800** | **+0.3819** | **SELECTED** |
| Random Forest Regressor | 0.7410 | 0.7580 | 0.9420 | +0.2910 | Rejected (Higher MAE) |
| HistGradientBoosting | 0.7290 | 0.7350 | 0.9210 | +0.3200 | Rejected (Higher MAE) |

### Key Findings
- **Ridge Regression achieved a 38.8% reduction in MAE** compared to the naive persistence baseline (0.6816 vs 1.1140 kWh).
- Simpler regularized linear models with curated time-series features demonstrated superior generalization compared to deep ensembles on this dataset, minimizing overfitting while maintaining full interpretability.

---

## 5. Anomaly Detection Architecture

The anomaly detection engine operates under a multi-tier statistical hierarchy:

1. **Interquartile Range (IQR) Thresholding (Datasets $< 50$ readings):**
   $$\text{IQR} = Q_3 - Q_1$$
   $$\text{Normal Range} = [Q_1 - 2.5 \times \text{IQR}, \quad Q_3 + 2.5 \times \text{IQR}]$$
   *Note: A conservative $2.5\times$ multiplier is used instead of standard $1.5\times$ to minimize false alarms on normal household fluctuations.*
2. **Rolling Window Z-Score (Datasets $50 \le N < 200$ readings):**
   Flags readings where deviation from the centered 14-day rolling mean exceeds $2.5\sigma$.
3. **Isolation Forest (Datasets $N \ge 200$ readings):**
   Unsupervised tree isolation identifying multi-dimensional outliers in the feature space (`contamination=0.05`).

---

## 6. Limitations & Risk Factors

1. **Weather Independence:** The current offline model does not require external weather APIs. Consequently, sudden unseasonal heatwaves or blizzards will cause prediction divergence until reflected in the lagged inputs.
2. **Occupancy Shifts:** Vacations, building closures, or guest arrivals introduce behavioral shifts not captured in historical consumption data.
3. **Sub-metering Resolution:** Without individual circuit telemetry, predictions reflect gross meter consumption.
