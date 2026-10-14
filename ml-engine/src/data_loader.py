import pandas as pd
import numpy as np
from typing import List, Dict, Any

def load_from_records(records: List[Dict[str, Any]]) -> pd.DataFrame:
    if not records:
        raise ValueError("records list is empty")

    df = pd.DataFrame(records)

    df.columns = [c.lower().strip() for c in df.columns]

    date_col = next((c for c in df.columns if c in ('date', 'timestamp', 'time', 'readingdate')), None)
    kwh_col  = next((c for c in df.columns if c in ('kwh', 'energy', 'consumption', 'reading')), None)

    if date_col is None:
        raise ValueError(f"No date column found. Available: {list(df.columns)}")
    if kwh_col is None:
        raise ValueError(f"No kWh column found. Available: {list(df.columns)}")

    df = df.rename(columns={date_col: 'ds', kwh_col: 'y'})
    df['ds'] = pd.to_datetime(df['ds'], utc=True).dt.tz_localize(None)
    df['y']  = pd.to_numeric(df['y'], errors='coerce')

    before = len(df)
    df = df.dropna(subset=['ds', 'y'])
    df = df[df['y'] >= 0]
    df = df.drop_duplicates(subset=['ds'])
    df = df.sort_values('ds').reset_index(drop=True)

    after = len(df)
    if after == 0:
        raise ValueError("No valid readings after cleaning.")
    if after < before:
        print(f"[data_loader] Dropped {before - after} invalid/duplicate rows.")

    return df[['ds', 'y']]

def load_sample_data(n_days: int = 365) -> pd.DataFrame:
    np.random.seed(42)
    dates = pd.date_range(start='2023-01-01', periods=n_days, freq='D')
    day_of_week = dates.dayofweek
    month = dates.month

    base = 10.0
    weekday_factor = np.where(day_of_week >= 5, 1.15, 1.0)
    seasonal_factor = 1 + 0.2 * np.sin(2 * np.pi * (month - 1) / 12)
    noise = np.random.normal(0, 0.8, n_days)
    y = base * weekday_factor * seasonal_factor + noise
    y = np.maximum(y, 0.1)

    df = pd.DataFrame({'ds': dates, 'y': y.round(3), '_is_sample': True})
    print(f"[data_loader] Generated {n_days} sample readings (NOT real data).")
    return df[['ds', 'y']]
