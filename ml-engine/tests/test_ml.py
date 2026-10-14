import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

class TestDataLoader:
    def test_load_from_records_basic(self):
        from data_loader import load_from_records
        records = [
            {'date': '2024-01-01', 'kWh': 10.5},
            {'date': '2024-01-02', 'kWh': 11.0},
            {'date': '2024-01-03', 'kWh': 9.8},
        ]
        df = load_from_records(records)
        assert len(df) == 3
        assert list(df.columns) == ['ds', 'y']
        assert df['y'].sum() > 0

    def test_load_filters_negative_kwh(self):
        from data_loader import load_from_records
        records = [
            {'date': '2024-01-01', 'kWh': 10.0},
            {'date': '2024-01-02', 'kWh': -5.0},
            {'date': '2024-01-03', 'kWh': 8.0},
        ]
        df = load_from_records(records)
        assert len(df) == 2
        assert (df['y'] >= 0).all()

    def test_load_drops_duplicates(self):
        from data_loader import load_from_records
        records = [
            {'date': '2024-01-01', 'kWh': 10.0},
            {'date': '2024-01-01', 'kWh': 12.0},
            {'date': '2024-01-02', 'kWh': 9.0},
        ]
        df = load_from_records(records)
        assert len(df) == 2

    def test_load_raises_on_empty(self):
        from data_loader import load_from_records
        with pytest.raises((ValueError, Exception)):
            load_from_records([])

    def test_load_raises_missing_date_col(self):
        from data_loader import load_from_records
        with pytest.raises(ValueError, match='No date column'):
            load_from_records([{'energy': 10}])

    def test_load_raises_missing_kwh_col(self):
        from data_loader import load_from_records
        with pytest.raises(ValueError, match='No kWh column'):
            load_from_records([{'date': '2024-01-01', 'watts': 10}])

    def test_sample_data_labeled(self):
        from data_loader import load_sample_data
        df = load_sample_data(30)
        assert len(df) == 30
        assert 'ds' in df.columns
        assert 'y' in df.columns
        assert (df['y'] > 0).all()

class TestFeatures:
    def _make_df(self, n=30):
        dates = pd.date_range('2024-01-01', periods=n, freq='D')
        y     = np.random.uniform(5, 20, n)
        return pd.DataFrame({'ds': dates, 'y': y})

    def test_builds_expected_columns(self):
        from features import build_features, FEATURE_NAMES
        df = self._make_df(60)
        feat = build_features(df, is_training=True)
        for col in FEATURE_NAMES:
            assert col in feat.columns, f"Missing feature: {col}"

    def test_no_future_leakage_in_lags(self):
        from features import build_features
        df = self._make_df(60)
        feat = build_features(df, is_training=True)
        for i in range(1, min(5, len(feat))):
            expected_lag = df.iloc[feat.index[i] - 1]['y'] if feat.index[i] > 0 else np.nan
            if not np.isnan(expected_lag):
                assert abs(feat.iloc[i]['lag_1'] - expected_lag) < 1e-9

    def test_drops_nan_rows_in_training(self):
        from features import build_features
        df = self._make_df(60)
        feat = build_features(df, is_training=True)
        assert not feat[['lag_1', 'lag_7', 'rolling_mean_7']].isnull().any().any()

    def test_future_features_count(self):
        from features import build_future_features
        df = self._make_df(60)
        horizon = 7
        future = build_future_features(df, horizon)
        assert len(future) == horizon

class TestTrain:
    def test_train_with_sample_data_returns_meta(self):
        from train import train
        meta = train(use_sample=True)
        assert 'algorithm' in meta
        assert 'metrics' in meta
        assert meta['metrics']['mae'] >= 0
        assert meta['metrics']['rmse'] >= 0

    def test_model_artifacts_exist_after_training(self):
        import os
        from train import train, MODELS_DIR
        train(use_sample=True)
        assert os.path.exists(os.path.join(MODELS_DIR, 'model.pkl'))
        assert os.path.exists(os.path.join(MODELS_DIR, 'model_meta.json'))

    def test_train_raises_on_insufficient_data(self):
        from train import train
        from data_loader import load_sample_data
        tiny = load_sample_data(5)
        tiny_records = [{'date': str(r['ds']), 'kWh': r['y']} for _, r in tiny.iterrows()]
        with pytest.raises(ValueError, match='Insufficient'):
            train(records=tiny_records)

    def test_chronological_split_no_leakage(self):
        from features import build_features, FEATURE_NAMES
        from data_loader import load_sample_data
        import numpy as np
        df_raw = load_sample_data(200)
        df_feat = build_features(df_raw, is_training=True)
        n = len(df_feat)
        train_end = int(n * 0.70)
        val_end   = int(n * 0.85)
        train_dates = df_feat.iloc[:train_end]['ds'].values
        val_dates   = df_feat.iloc[train_end:val_end]['ds'].values
        test_dates  = df_feat.iloc[val_end:]['ds'].values
        assert train_dates.max() < val_dates.min()
        assert val_dates.max() < test_dates.min()

class TestPredict:
    def setup_method(self):
        from train import train
        train(use_sample=True)

    def test_forecast_returns_correct_horizon(self):
        from predict import forecast
        from data_loader import load_sample_data
        df = load_sample_data(60)
        records = [{'date': str(r['ds']), 'kWh': r['y']} for _, r in df.iterrows()]
        result = forecast(records, horizon=7)
        assert len(result['forecast']) == 7

    def test_forecast_no_negative_kwh(self):
        from predict import forecast
        from data_loader import load_sample_data
        df = load_sample_data(60)
        records = [{'date': str(r['ds']), 'kWh': r['y']} for _, r in df.iterrows()]
        result = forecast(records, horizon=14)
        for point in result['forecast']:
            assert point['kWh'] >= 0, f"Negative kWh in forecast: {point}"

    def test_forecast_dates_are_future(self):
        from predict import forecast
        from data_loader import load_sample_data
        df = load_sample_data(60)
        last_date = df['ds'].max()
        records = [{'date': str(r['ds']), 'kWh': r['y']} for _, r in df.iterrows()]
        result = forecast(records, horizon=7)
        for point in result['forecast']:
            assert point['date'] > str(last_date.date())

    def test_forecast_capped_at_90_days(self):
        from predict import forecast
        from data_loader import load_sample_data
        df = load_sample_data(60)
        records = [{'date': str(r['ds']), 'kWh': r['y']} for _, r in df.iterrows()]
        result = forecast(records, horizon=200)
        assert len(result['forecast']) == 90

    def test_forecast_too_few_records_raises(self):
        from predict import forecast
        tiny = [{'date': f'2024-01-0{i+1}', 'kWh': 10.0} for i in range(5)]
        with pytest.raises(ValueError, match='at least 14'):
            forecast(tiny, horizon=7)

class TestAnomalyDetection:
    def _make_records(self, n=30, spike_idx=15):
        dates = pd.date_range('2024-01-01', periods=n, freq='D')
        y = [10.0] * n
        y[spike_idx] = 80.0
        return [{'date': str(d.date()), 'kWh': v} for d, v in zip(dates, y)]

    def test_iqr_detects_obvious_spike(self):
        from anomaly_detection import detect_anomalies
        records = self._make_records(30, spike_idx=15)
        result = detect_anomalies(records, method='iqr')
        assert result['anomalyCount'] > 0
        dates = [a['date'][:10] for a in result['anomalies']]
        assert '2024-01-16' in dates

    def test_rolling_detects_spike(self):
        from anomaly_detection import detect_anomalies
        records = self._make_records(60, spike_idx=30)
        result = detect_anomalies(records, method='rolling')
        assert result['anomalyCount'] > 0

    def test_normal_data_few_anomalies(self):
        from anomaly_detection import detect_anomalies
        from data_loader import load_sample_data
        df = load_sample_data(100)
        records = [{'date': str(r['ds'].date()), 'kWh': r['y']} for _, r in df.iterrows()]
        result = detect_anomalies(records, method='iqr')
        assert result['anomalyCount'] <= 5

    def test_raises_on_too_few_records(self):
        from anomaly_detection import detect_anomalies
        tiny = [{'date': f'2024-01-0{i+1}', 'kWh': 10.0} for i in range(4)]
        with pytest.raises(ValueError, match='at least 7'):
            detect_anomalies(tiny)

    def test_anomaly_has_required_fields(self):
        from anomaly_detection import detect_anomalies
        records = self._make_records(30, spike_idx=15)
        result = detect_anomalies(records, method='iqr')
        if result['anomalies']:
            a = result['anomalies'][0]
            for field in ('date', 'observedKwh', 'expectedKwh', 'deviationKwh', 'direction', 'score', 'explanation'):
                assert field in a, f"Missing field: {field}"
