import numpy as np
import pandas as pd
from typing import List, Dict, Any

from data_loader import load_from_records

def detect_anomalies(records: List[Dict[str, Any]], method: str = 'auto') -> dict:
    df = load_from_records(records)

    n = len(df)
    if n < 7:
        raise ValueError(f"Need at least 7 readings; got {n}.")

    if method == 'auto':
        if n < 50:
            method = 'iqr'
        elif n < 200:
            method = 'rolling'
        else:
            method = 'isolation_forest'

    print(f"[anomaly] Using method '{method}' on {n} readings")

    if method == 'iqr':
        anomalies = _iqr_method(df)
    elif method == 'rolling':
        anomalies = _rolling_method(df)
    elif method == 'isolation_forest':
        anomalies = _isolation_forest_method(df)
    else:
        raise ValueError(f"Unknown method: {method}")

    return {
        'anomalies': anomalies,
        'method': method,
        'totalReadings': n,
        'anomalyCount': len(anomalies),
        'description': _method_description(method),
    }

def _iqr_method(df: pd.DataFrame) -> list:
    y = df['y'].values
    q1, q3 = np.percentile(y, 25), np.percentile(y, 75)
    iqr = q3 - q1
    lower = q1 - 2.5 * iqr
    upper = q3 + 2.5 * iqr
    median = np.median(y)

    anomalies = []
    for _, row in df.iterrows():
        if row['y'] > upper or row['y'] < lower:
            direction = 'high' if row['y'] > upper else 'low'
            deviation = abs(row['y'] - median)
            anomalies.append({
                'date': row['ds'].strftime('%Y-%m-%dT%H:%M:%S'),
                'observedKwh': round(float(row['y']), 3),
                'expectedKwh': round(float(median), 3),
                'deviationKwh': round(float(deviation), 3),
                'direction': direction,
                'score': round(float(deviation / (iqr + 1e-9)), 3),
                'method': 'iqr',
                'explanation': (
                    f"Reading of {row['y']:.2f} kWh is {'above' if direction=='high' else 'below'} "
                    f"the expected range ({lower:.2f}–{upper:.2f} kWh) based on your historical data. "
                    "This may warrant investigation but is not confirmed as a fault."
                ),
            })

    return sorted(anomalies, key=lambda x: x['score'], reverse=True)

def _rolling_method(df: pd.DataFrame, window: int = 14, sigma: float = 2.5) -> list:
    df = df.copy()
    df['rolling_mean'] = df['y'].rolling(window, min_periods=5, center=True).mean()
    df['rolling_std']  = df['y'].rolling(window, min_periods=5, center=True).std()
    df = df.dropna(subset=['rolling_mean', 'rolling_std'])

    anomalies = []
    for _, row in df.iterrows():
        std = row['rolling_std'] if row['rolling_std'] > 0 else 1e-9
        z_score = abs(row['y'] - row['rolling_mean']) / std
        if z_score > sigma:
            direction = 'high' if row['y'] > row['rolling_mean'] else 'low'
            anomalies.append({
                'date': row['ds'].strftime('%Y-%m-%dT%H:%M:%S'),
                'observedKwh': round(float(row['y']), 3),
                'expectedKwh': round(float(row['rolling_mean']), 3),
                'deviationKwh': round(float(abs(row['y'] - row['rolling_mean'])), 3),
                'direction': direction,
                'score': round(float(z_score), 3),
                'method': 'rolling_window',
                'explanation': (
                    f"Reading of {row['y']:.2f} kWh deviates {z_score:.1f}σ from the "
                    f"{window}-day rolling average ({row['rolling_mean']:.2f} kWh). "
                    "This pattern is statistically unusual but requires human investigation."
                ),
            })

    return sorted(anomalies, key=lambda x: x['score'], reverse=True)

def _isolation_forest_method(df: pd.DataFrame) -> list:
    from sklearn.ensemble import IsolationForest

    y = df['y'].values.reshape(-1, 1)
    median = float(np.median(y))

    clf = IsolationForest(contamination=0.05, random_state=42)
    labels = clf.fit_predict(y)
    scores = clf.score_samples(y)

    anomalies = []
    for i, (_, row) in enumerate(df.iterrows()):
        if labels[i] == -1:
            direction = 'high' if row['y'] > median else 'low'
            anomalies.append({
                'date': row['ds'].strftime('%Y-%m-%dT%H:%M:%S'),
                'observedKwh': round(float(row['y']), 3),
                'expectedKwh': round(float(median), 3),
                'deviationKwh': round(float(abs(row['y'] - median)), 3),
                'direction': direction,
                'score': round(float(-scores[i]), 4),
                'method': 'isolation_forest',
                'explanation': (
                    f"IsolationForest classified this reading ({row['y']:.2f} kWh) as anomalous "
                    f"(anomaly score: {-scores[i]:.3f}). This is a statistical flag—not a confirmed fault."
                ),
            })

    return sorted(anomalies, key=lambda x: x['score'], reverse=True)

def _method_description(method: str) -> str:
    descriptions = {
        'iqr': 'Interquartile range (IQR) method: flags readings outside Q1−2.5×IQR to Q3+2.5×IQR.',
        'rolling_window': 'Rolling window z-score: flags readings >2.5σ from a 14-day rolling mean.',
        'isolation_forest': 'Isolation Forest: unsupervised ML detecting readings isolated from the main cluster.',
    }
    return descriptions.get(method, method)
