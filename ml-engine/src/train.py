"""
train.py — Train, evaluate, and persist the WattWise ML forecasting model.

Design decisions:
- Chronological train/val/test split (no random shuffle for time-series).
- StandardScaler fitted ONLY on training fold.
- Candidate models: Persistence baseline, Ridge, RandomForest, HistGradientBoosting.
- Model selected by lowest validation MAE.
- All metrics computed on a held-out test set.
- Artifacts saved with joblib.
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

from data_loader import load_from_records, load_sample_data
from features import build_features, FEATURE_NAMES

MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
REPORTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'reports')
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)


def _compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2   = r2_score(y_true, y_pred)
    return {'mae': round(float(mae), 4), 'rmse': round(float(rmse), 4), 'r2': round(float(r2), 4)}


def _persistence_baseline(df_feat: pd.DataFrame, test_indices) -> np.ndarray:
    """Predict = lag_1 (yesterday's value). Simple but meaningful baseline."""
    return df_feat.loc[test_indices, 'lag_1'].values


def train(records=None, use_sample=False):
    """
    Train the model.
    records: list of {date, kWh} dicts or None.
    use_sample: if True, generate synthetic sample data.
    Returns dict with metadata and metrics.
    """
    print("[train] Starting training pipeline")

    # 1. Load data
    if use_sample or records is None:
        print("[train] Using sample data (not real measurements)")
        df_raw = load_sample_data(730)  # 2 years of samples
    else:
        df_raw = load_from_records(records)

    print(f"[train] Loaded {len(df_raw)} records from {df_raw['ds'].min()} to {df_raw['ds'].max()}")

    if len(df_raw) < 30:
        raise ValueError(f"Insufficient data for training: {len(df_raw)} records (need ≥30).")

    # 2. Feature engineering
    df_feat = build_features(df_raw, is_training=True)
    print(f"[train] After feature engineering: {len(df_feat)} usable rows")

    X = df_feat[FEATURE_NAMES].values
    y = df_feat['y'].values

    # 3. Chronological split: 70% train, 15% validation, 15% test
    n = len(X)
    train_end = int(n * 0.70)
    val_end   = int(n * 0.85)

    X_train, y_train = X[:train_end],  y[:train_end]
    X_val,   y_val   = X[train_end:val_end], y[train_end:val_end]
    X_test,  y_test  = X[val_end:],   y[val_end:]

    print(f"[train] Split: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")

    if len(X_val) < 5 or len(X_test) < 5:
        raise ValueError("Not enough data for proper train/val/test split.")

    # 4. Baseline — persistence on test set
    baseline_pred = df_feat['lag_1'].values[val_end:]
    baseline_metrics = _compute_metrics(y_test, baseline_pred)
    print(f"[train] Baseline (persistence) — MAE: {baseline_metrics['mae']}, RMSE: {baseline_metrics['rmse']}")

    # 5. Candidate models (fitted only on training data)
    candidates = {
        'Ridge': Pipeline([('scaler', StandardScaler()), ('model', Ridge(alpha=1.0))]),
        'RandomForest': RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1),
        'HistGradientBoosting': HistGradientBoostingRegressor(max_iter=200, max_depth=6, random_state=42),
    }

    best_model_name = None
    best_val_mae = float('inf')
    best_pipeline = None

    for name, model in candidates.items():
        model.fit(X_train, y_train)
        val_pred = model.predict(X_val)
        val_mae = mean_absolute_error(y_val, val_pred)
        print(f"[train]   {name} — val MAE: {val_mae:.4f}")
        if val_mae < best_val_mae:
            best_val_mae = val_mae
            best_model_name = name
            best_pipeline = model

    print(f"[train] Selected model: {best_model_name} (val MAE: {best_val_mae:.4f})")

    # 6. Evaluate selected model on test set
    test_pred = best_pipeline.predict(X_test)
    test_metrics = _compute_metrics(y_test, test_pred)
    print(f"[train] Test metrics — MAE: {test_metrics['mae']}, RMSE: {test_metrics['rmse']}, R²: {test_metrics['r2']}")

    # Compare with baseline
    if test_metrics['mae'] >= baseline_metrics['mae']:
        print(f"[train] WARNING: Selected model MAE ({test_metrics['mae']}) >= baseline ({baseline_metrics['mae']}). "
              "Model may not improve over naive prediction for this dataset.")

    # 7. Retrain on full dataset (train + val) before saving
    X_full = np.vstack([X_train, X_val])
    y_full = np.concatenate([y_train, y_val])
    best_pipeline.fit(X_full, y_full)

    # 8. Save artifacts
    version = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    model_path = os.path.join(MODELS_DIR, 'model.pkl')
    meta_path  = os.path.join(MODELS_DIR, 'model_meta.json')

    joblib.dump(best_pipeline, model_path)
    print(f"[train] Model saved to {model_path}")

    meta = {
        'version': version,
        'trainedAt': datetime.datetime.now().isoformat(),
        'algorithm': best_model_name,
        'features': FEATURE_NAMES,
        'trainingSamples': int(len(X_full)),
        'totalRecords': int(len(df_raw)),
        'metrics': {
            'mae':           test_metrics['mae'],
            'rmse':          test_metrics['rmse'],
            'r2':            test_metrics['r2'],
            'baselineMae':   baseline_metrics['mae'],
            'baselineRmse':  baseline_metrics['rmse'],
        },
        'modelPath': model_path,
        'usedSampleData': use_sample or records is None,
    }

    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"[train] Metadata saved to {meta_path}")

    # 9. Save evaluation report
    report_path = os.path.join(REPORTS_DIR, 'evaluation_report.json')
    report = {
        **meta,
        'testPredictions': [round(float(v), 4) for v in test_pred[:20]],
        'testActuals': [round(float(v), 4) for v in y_test[:20]],
        'baselineMetrics': baseline_metrics,
    }
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    return meta


if __name__ == '__main__':
    import sys
    use_sample = '--sample' in sys.argv
    result = train(use_sample=use_sample)
    print(json.dumps(result, indent=2))
