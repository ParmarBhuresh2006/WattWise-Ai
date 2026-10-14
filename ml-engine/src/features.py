"""
features.py — Feature engineering for time-series energy forecasting.
All features derived from a date index to avoid leakage.
"""

import pandas as pd
import numpy as np
from typing import List


FEATURE_NAMES: List[str] = [
    'hour',
    'day_of_week',
    'is_weekend',
    'month',
    'day_of_year',
    'week_of_year',
    'lag_1',
    'lag_7',
    'lag_14',
    'rolling_mean_7',
    'rolling_std_7',
    'rolling_mean_14',
]


def build_features(df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
    """
    Build time-series features from a DataFrame with columns [ds, y].
    - Uses only past observations for lag/rolling features (no leakage).
    - Returns a new DataFrame with feature columns and target 'y'.
    - Drops rows where lagged features are NaN (start of series).
    
    For inference (is_training=False), NaN lags are filled with forward-fill
    to allow prediction at the boundary.
    """
    df = df.copy().sort_values('ds').reset_index(drop=True)

    # Date-based features
    df['hour']        = df['ds'].dt.hour
    df['day_of_week'] = df['ds'].dt.dayofweek          # 0=Mon, 6=Sun
    df['is_weekend']  = (df['day_of_week'] >= 5).astype(int)
    df['month']       = df['ds'].dt.month
    df['day_of_year'] = df['ds'].dt.dayofyear
    df['week_of_year'] = df['ds'].dt.isocalendar().week.astype(int)

    # Lag features — strictly past observations
    df['lag_1']  = df['y'].shift(1)
    df['lag_7']  = df['y'].shift(7)
    df['lag_14'] = df['y'].shift(14)

    # Rolling statistics — window ends at previous observation
    df['rolling_mean_7']  = df['y'].shift(1).rolling(7,  min_periods=3).mean()
    df['rolling_std_7']   = df['y'].shift(1).rolling(7,  min_periods=3).std()
    df['rolling_mean_14'] = df['y'].shift(1).rolling(14, min_periods=5).mean()

    if is_training:
        df = df.dropna(subset=FEATURE_NAMES)
    else:
        df[FEATURE_NAMES] = df[FEATURE_NAMES].ffill().bfill()

    return df


def build_future_features(last_df: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """
    Build a feature DataFrame for future dates beyond the training data.
    last_df: historical data with [ds, y] columns, sorted ascending.
    horizon: number of future days to predict.
    """
    last_date = pd.to_datetime(last_df['ds'].max())
    future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=horizon, freq='D')

    future_df = pd.DataFrame({'ds': future_dates, 'y': np.nan})
    combined  = pd.concat([last_df[['ds', 'y']], future_df], ignore_index=True)

    combined = build_features(combined, is_training=False)
    result = combined[combined['ds'].isin(future_dates)].copy()
    return result
