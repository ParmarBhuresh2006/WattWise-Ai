import React, { useEffect, useState, useCallback } from 'react';
import { analyticsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [consumption, setConsumption] = useState([]);
  const [cost, setCost]               = useState([]);
  const [groupBy, setGroupBy]         = useState('day');
  const [months, setMonths]           = useState(6);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const currency = user?.settings?.currency || 'INR';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
      const [cRes, costRes] = await Promise.all([
        analyticsApi.getConsumption({ groupBy, startDate }),
        analyticsApi.getCostAnalysis({ months }),
      ]);
      setConsumption(cRes.data.data || []);
      setCost(costRes.data.data || []);
    } catch {
      setError('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [groupBy, months]);

  useEffect(() => { load(); }, [load]);

  const totalKwh = consumption.reduce((s, d) => s + d.totalKwh, 0);
  const totalCost = cost.reduce((s, d) => s + d.estimatedCost, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Consumption Analytics</h1>
        <div className="flex gap-2">
          <select className="form-input w-auto text-sm" value={months} onChange={e => setMonths(Number(e.target.value))}>
            <option value={1}>Last month</option>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <select className="form-input w-auto text-sm" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      <Alert type="error" message={error} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          {}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total kWh', value: totalKwh.toFixed(1), unit: 'kWh' },
              { label: 'Estimated Cost', value: totalCost.toFixed(0), unit: currency },
              { label: 'Avg per period', value: consumption.length ? (totalKwh/consumption.length).toFixed(2) : '—', unit: 'kWh' },
              { label: 'Data points', value: consumption.length, unit: 'periods' },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}<span className="text-sm font-normal text-gray-500 ml-1">{s.unit}</span></p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {}
          <div className="card mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Energy Consumption</h3>
            {consumption.length === 0 ? (
              <div className="py-10 text-center text-gray-400">No consumption data for selected period.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={consumption} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.length > 7 ? d.slice(5) : d} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kWh" width={65} />
                  <Tooltip formatter={v => [`${v} kWh`, 'Total']} />
                  <Bar dataKey="totalKwh" fill="#16a34a" radius={[3,3,0,0]} name="kWh" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Cost Estimate ({currency})</h3>
            {cost.length === 0 ? (
              <div className="py-10 text-center text-gray-400">No cost data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={cost} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={v => [`${currency} ${v}`, 'Cost']} />
                  <Legend />
                  <Line type="monotone" dataKey="estimatedCost" stroke="#3b82f6" strokeWidth={2} name="Total Cost" dot={false} />
                  <Line type="monotone" dataKey="energyCost"    stroke="#16a34a" strokeWidth={2} name="Energy Cost" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}

