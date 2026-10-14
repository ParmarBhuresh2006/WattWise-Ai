"""
predict.py — Load a trained model and generate forecasts.
Uses the SAME feature engineering as train.py to avoid training/inference skew.
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
import joblib

from data_loader import load_from_records
from features import build_future_features, FEATURE_NAMES

MODELS_DIR  = os.path.join(os.path.dirname(__file__), '..', 'models')
MODEL_PATH  = os.path.join(MODELS_DIR, 'model.pkl')
META_PATH   = os.path.join(MODELS_DIR, 'model_meta.json')


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            "No trained model found. Call /train first to train the model."
        )
    return joblib.load(MODEL_PATH)


def load_meta():
    if not os.path.exists(META_PATH):
        return {}
    with open(META_PATH) as f:
        return json.load(f)


def forecast(records: list, horizon: int = 7) -> dict:
    """
    Generate a horizon-day forecast from historical records.
    records: list of {date, kWh} dicts
    horizon: number of future days (1–90)
    Returns dict with forecast list and metadata.
    """
    horizon = max(1, min(int(horizon), 90))

    model = load_model()
    meta  = load_meta()

    df_hist = load_from_records(records)

    if len(df_hist) < 14:
        raise ValueError(f"Need at least 14 historical readings; got {len(df_hist)}.")

    # Build features for future dates
    df_future = build_future_features(df_hist, horizon)

    if df_future.empty:
        raise ValueError("Could not construct future features.")

    X_future = df_future[FEATURE_NAMES].values
    predictions = model.predict(X_future)
    predictions = np.maximum(predictions, 0.0)  # kWh cannot be negative

    tariff = 8.0  # default; caller can override
    results = []
    for i, row in enumerate(df_future.itertuples()):
        results.append({
            'date':  row.ds.strftime('%Y-%m-%d'),
            'kWh':   round(float(predictions[i]), 3),
            'estimatedCost': None,  # calculated on frontend with user tariff
        })

    avg_recent = float(df_hist['y'].tail(30).mean())
    avg_forecast = float(np.mean(predictions))

    return {
        'forecast':      results,
        'horizon':       horizon,
        'algorithm':     meta.get('algorithm', 'unknown'),
        'modelVersion':  meta.get('version', 'unknown'),
        'trainedAt':     meta.get('trainedAt', ''),
        'metrics':       meta.get('metrics', {}),
        'avgRecentKwh':  round(avg_recent, 3),
        'avgForecastKwh': round(avg_forecast, 3),
        'usedSampleData': meta.get('usedSampleData', False),
        'limitation': (
            'Forecast based on historical patterns only. '
            'Actual usage may vary with weather, occupancy, or appliance changes.'
        ),
    }


if __name__ == '__main__':
    import sys
    from data_loader import load_sample_data
    df = load_sample_data(60)
    records = [{'date': str(r['ds']), 'kWh': r['y']} for _, r in df.iterrows()]
    result = forecast(records, horizon=7)
    print(json.dumps(result, indent=2))
