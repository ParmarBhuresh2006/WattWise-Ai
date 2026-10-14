import React, { useState } from 'react';
import { analyticsApi, mlApi, energyApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { FileText, Download, Printer } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

export default function ReportsPage() {
  const { user } = useAuth();
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 90*24*60*60*1000).toISOString().slice(0,10),
    endDate:   new Date().toISOString().slice(0,10),
  });

  const currency = user?.settings?.currency || 'INR';

  const generateReport = async () => {
    setLoading(true); setError(''); setReport(null);
    try {
      const [summRes, consRes, anomRes] = await Promise.allSettled([
        analyticsApi.getSummary({ period: 'monthly' }),
        analyticsApi.getConsumption({ groupBy: 'month', startDate: filters.startDate, endDate: filters.endDate }),
        mlApi.detectAnomalies({ startDate: filters.startDate, endDate: filters.endDate }),
      ]);
      setReport({
        generatedAt: new Date().toISOString(),
        filters,
        summary: summRes.status === 'fulfilled' ? summRes.value.data.data : null,
        consumption: consRes.status === 'fulfilled' ? consRes.value.data.data : [],
        anomalies: anomRes.status === 'fulfilled' ? anomRes.value.data : null,
      });
    } catch (err) {
      setError('Failed to generate report.');
    } finally { setLoading(false); }
  };

  const handleExportCSV = async () => {
    try {
      const res = await energyApi.exportCSV({ startDate: filters.startDate, endDate: filters.endDate });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'wattwise-report.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Export failed.'); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        {report && (
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-secondary">
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
            <button onClick={handleExportCSV} className="btn-secondary">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        )}
      </div>

      <Alert type="error" message={error} className="mb-4" />

      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={filters.startDate}
              onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={filters.endDate}
              onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <button onClick={generateReport} disabled={loading} className="btn-primary">
            <FileText className="h-4 w-4" />
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : report ? (
        <>
          <div className="card mb-4">
            <p className="text-xs text-gray-400">Generated: {new Date(report.generatedAt).toLocaleString()} · Period: {filters.startDate} to {filters.endDate}</p>
          </div>

          {report.summary && (
            <div className="card mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {[
                  { label: 'Total kWh', value: report.summary.totalKwh?.toFixed(2) },
                  { label: `Est. Cost (${currency})`, value: report.summary.estimatedCost?.toFixed(2) },
                  { label: 'Avg Daily kWh', value: report.summary.avgDailyKwh?.toFixed(2) },
                  { label: 'vs Previous', value: report.summary.changePercent != null ? `${report.summary.changePercent > 0 ? '+' : ''}${report.summary.changePercent?.toFixed(1)}%` : '—' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="font-bold text-gray-900">{s.value ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.consumption.length > 0 && (
            <div className="card mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Consumption</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.consumption}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kWh" width={65} />
                  <Tooltip />
                  <Bar dataKey="totalKwh" fill="#16a34a" name="kWh" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {report.anomalies && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Anomaly Summary</h3>
              <p className="text-sm text-gray-600">
                Detected <strong>{report.anomalies.anomalyCount}</strong> anomalies in {report.anomalies.totalReadings} readings
                using {report.anomalies.method} method.
              </p>
              {report.anomalies.anomalyCount > 0 && (
                <div className="mt-3 space-y-2">
                  {report.anomalies.anomalies.slice(0,5).map((a, i) => (
                    <div key={i} className="text-xs text-gray-600 bg-red-50 rounded px-3 py-2">
                      {a.date?.slice(0,10)}: {a.observedKwh} kWh (expected ~{a.expectedKwh} kWh)
                    </div>
                  ))}
                  {report.anomalies.anomalyCount > 5 && (
                    <p className="text-xs text-gray-400">…and {report.anomalies.anomalyCount - 5} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Select a date range and click "Generate Report".</p>
        </div>
      )}
    </div>
  );
}

