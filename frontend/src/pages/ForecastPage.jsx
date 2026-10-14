import React, { useState, useEffect } from 'react';
import { mlApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { Brain, Play, BarChart2 } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';

export default function ForecastPage() {
  const { user } = useAuth();
  const [status, setStatus]         = useState(null);
  const [forecast, setForecast]     = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [horizon, setHorizon]       = useState(7);
  const [loading, setLoading]       = useState(false);
  const [training, setTraining]     = useState(false);
  const [error, setError]           = useState('');
  const [trainMsg, setTrainMsg]     = useState('');

  const currency = user?.settings?.currency || 'INR';
  const tariff   = user?.settings?.tariffPerKwh || 8;

  useEffect(() => {
    mlApi.getStatus().then(r => setStatus(r.data)).catch(() => {});
    mlApi.getEvaluation().then(r => setEvaluation(r.data)).catch(() => {});
  }, []);

  const handleTrain = async (useSample = false) => {
    setTraining(true); setTrainMsg(''); setError('');
    try {
      const res = await mlApi.train({ useSample });
      const algo = res.data.data?.algorithm || res.data.algorithm;
      const mae = res.data.data?.metrics?.mae ?? res.data.metrics?.mae ?? '—';
      const sampleNotice = useSample ? ' (Sample Data Demo)' : '';
      setTrainMsg(`Training complete${sampleNotice}! Algorithm: ${algo}, Test MAE: ${mae} kWh`);
      const sRes = await mlApi.getStatus();
      setStatus(sRes.data);
      const eRes = await mlApi.getEvaluation();
      setEvaluation(eRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Training failed. Ensure ML engine is running.');
    } finally {
      setTraining(false);
    }
  };

  const handleForecast = async () => {
    setLoading(true); setError(''); setForecast(null);
    try {
      const res = await mlApi.forecast({ horizon });
      setForecast(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Forecast failed. Try training the model first.');
    } finally {
      setLoading(false);
    }
  };

  const forecastWithCost = forecast?.forecast?.map(f => ({
    ...f,
    estimatedCost: +(f.kWh * tariff).toFixed(2),
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-2">AI Energy Forecast</h1>
      <p className="text-sm text-gray-500 mb-6">Uses a trained machine learning model on your actual energy data.</p>

      <Alert type="error" message={error} className="mb-4" />
      {trainMsg && <Alert type="success" message={trainMsg} className="mb-4" />}

      {/* Status card */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Brain className="h-4 w-4 text-brand-600" /> ML Engine Status
          </h3>
          <span className={`badge-${status?.engineOnline ? 'green' : 'red'}`}>
            {status?.engineOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {status?.model ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Algorithm', value: status.model.algorithm },
              { label: 'Trained', value: new Date(status.model.trainedAt).toLocaleDateString() },
              { label: 'Test MAE', value: `${status.model.metrics?.mae ?? '—'} kWh` },
              { label: 'Baseline MAE', value: `${status.model.metrics?.baselineMae ?? '—'} kWh` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No trained model yet. Use the button below to train.</p>
        )}
      </div>

      {/* Train + Forecast controls */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <button onClick={() => handleTrain(false)} disabled={training || !status?.engineOnline} className="btn-primary">
          <Play className="h-4 w-4" />
          {training ? 'Training…' : 'Train on My Data'}
        </button>
        <button onClick={() => handleTrain(true)} disabled={training || !status?.engineOnline} className="btn-secondary" title="Train model using synthetic 730-day baseline data for testing">
          <Play className="h-4 w-4 text-brand-600" />
          Train with Sample Data (Demo)
        </button>
        <div className="flex items-end gap-2 ml-auto">
          <div>
            <label className="form-label">Forecast horizon</label>
            <select className="form-input w-auto" value={horizon} onChange={e => setHorizon(Number(e.target.value))}>
              {[3,7,14,21,30].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <button onClick={handleForecast} disabled={loading || !status?.engineOnline} className="btn-primary">
            <BarChart2 className="h-4 w-4" />
            {loading ? 'Forecasting…' : 'Generate Forecast'}
          </button>
        </div>
      </div>

      {!status?.engineOnline && (
        <Alert type="warning" message="ML Engine is offline. Start it with: cd ml-engine/src && python server.py" className="mb-4" />
      )}

      {/* Forecast chart */}
      {forecastWithCost && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-700">
              {horizon}-Day Energy Forecast — {forecast.algorithm}
            </h3>
            {forecast.usedSampleData && (
              <span className="badge-yellow">Sample data — not real measurements</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">{forecast.limitation}</p>

          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={forecastWithCost} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis yAxisId="kwh" tick={{ fontSize: 10 }} unit=" kWh" width={65} />
              <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 10 }} width={55} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="kwh" dataKey="kWh" fill="#16a34a" radius={[3,3,0,0]} name="Forecast kWh" opacity={0.8} />
              <Line yAxisId="cost" dataKey="estimatedCost" stroke="#3b82f6" strokeWidth={2} dot={false} name={`Est. Cost (${currency})`} />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Avg Forecast kWh/day</p>
              <p className="font-bold text-gray-900">{forecast.avgForecastKwh?.toFixed(2)} kWh</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Forecast kWh</p>
              <p className="font-bold text-gray-900">{forecastWithCost.reduce((s,f)=>s+f.kWh,0).toFixed(2)} kWh</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Estimated Total Cost</p>
              <p className="font-bold text-gray-900">{currency} {forecastWithCost.reduce((s,f)=>s+f.estimatedCost,0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Model evaluation */}
      {evaluation && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4" /> Model Evaluation
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Test MAE', value: `${evaluation.metrics?.mae ?? '—'} kWh`, good: evaluation.metrics?.mae < evaluation.baselineMetrics?.mae },
              { label: 'Test RMSE', value: `${evaluation.metrics?.rmse ?? '—'} kWh`, good: null },
              { label: 'R²', value: evaluation.metrics?.r2 ?? '—', good: evaluation.metrics?.r2 > 0 },
              { label: 'Baseline MAE', value: `${evaluation.baselineMetrics?.mae ?? '—'} kWh`, good: null },
              { label: 'Training samples', value: evaluation.trainingSamples ?? '—', good: null },
              { label: 'Algorithm', value: evaluation.algorithm ?? '—', good: null },
            ].map(({ label, value, good }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`font-bold ${good === true ? 'text-green-700' : good === false ? 'text-red-700' : 'text-gray-900'}`}>{String(value)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            MAE = Mean Absolute Error (lower is better). R² measures explained variance (1.0 = perfect, &lt;0 = worse than mean).
            Model MAE shown against persistence baseline (predict yesterday's value).
          </p>
        </div>
      )}
    </div>
  );
}
