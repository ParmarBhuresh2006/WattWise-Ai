import sys
sys.path.insert(0,'ml-engine/src')
from data_loader import load_sample_data
from predict import forecast
from anomaly_detection import detect_anomalies

df = load_sample_data(60)
records = [{'date': str(r['ds'].date()), 'kWh': r['y']} for _, r in df.iterrows()]

# Forecast
fc = forecast(records, horizon=7)
print('=== 7-Day Forecast ===')
for p in fc['forecast']:
    print('  %s: %.3f kWh' % (p['date'], p['kWh']))
print('Avg forecast: %.3f kWh/day' % fc['avgForecastKwh'])
print('Algorithm: %s | Model version: %s' % (fc['algorithm'], fc['modelVersion']))

# Anomaly detection - inject a spike
records_spike = list(records)
records_spike[30] = dict(records_spike[30]); records_spike[30]['kWh'] = 85.0
anom = detect_anomalies(records_spike, method='iqr')
print('=== Anomaly Detection ===')
print('Method: %s | Anomalies: %d / %d' % (anom['method'], anom['anomalyCount'], anom['totalReadings']))
if anom['anomalies']:
    a = anom['anomalies'][0]
    print('  Top: %s - %.2f kWh (expected ~%.2f kWh, dev %.2f)' % (
        a['date'][:10], a['observedKwh'], a['expectedKwh'], a['deviationKwh']))
    print('  Explanation:', a['explanation'][:100])
