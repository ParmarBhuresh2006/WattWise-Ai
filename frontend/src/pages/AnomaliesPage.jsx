import React, { useState } from 'react';
import { mlApi } from '../services/api';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { AlertTriangle, Search } from 'lucide-react';

const directionBadge = { high: 'badge-red', low: 'badge-blue' };

export default function AnomaliesPage() {
  const [anomalies, setAnomalies]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [filters, setFilters]       = useState({ startDate: '', endDate: '' });

  const handleDetect = async () => {
    setLoading(true); setError(''); setAnomalies(null);
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate)   params.endDate   = filters.endDate;
      const res = await mlApi.detectAnomalies(params);
      setAnomalies(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Detection failed. Ensure you have ≥7 readings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Anomaly Detection</h1>
      <p className="text-sm text-gray-500 mb-6">
        Identifies statistically unusual energy readings using robust statistical methods.
        Anomalies are flags requiring investigation — not confirmed faults.
      </p>

      <Alert type="error" message={error} className="mb-4" />

      {}
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">From (optional)</label>
            <input type="date" className="form-input" value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">To (optional)</label>
            <input type="date" className="form-input" value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <button onClick={handleDetect} disabled={loading} className="btn-primary">
            <Search className="h-4 w-4" />
            {loading ? 'Detecting…' : 'Detect Anomalies'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : anomalies ? (
        <>
          {}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Readings analyzed', value: anomalies.totalReadings },
              { label: 'Anomalies found', value: anomalies.anomalyCount },
              { label: 'Detection method', value: anomalies.method },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="card mb-4">
            <p className="text-xs text-gray-500">{anomalies.description}</p>
          </div>

          {anomalies.anomalyCount === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No anomalies detected in the selected data.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.anomalies.map((a, i) => (
                <div key={i} className="card border-l-4 border-l-red-400">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="font-medium text-sm">{a.date?.slice(0,10)}</span>
                      <span className={directionBadge[a.direction] || 'badge-yellow'}>{a.direction}</span>
                    </div>
                    <span className="text-xs text-gray-400">score: {a.score}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Observed</p>
                      <p className="font-semibold text-red-700">{a.observedKwh} kWh</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Expected ~</p>
                      <p className="font-semibold">{a.expectedKwh} kWh</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Deviation</p>
                      <p className="font-semibold">{a.deviationKwh} kWh</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">{a.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12 text-gray-400">
          <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Click "Detect Anomalies" to analyze your readings.</p>
        </div>
      )}
    </div>
  );
}

