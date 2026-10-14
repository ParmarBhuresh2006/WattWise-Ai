import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsApi, mlApi } from '../services/api';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { Zap, DollarSign, TrendingUp, TrendingDown, Activity, Brain, AlertTriangle, Minus } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

function KpiCard({ title, value, unit, change, Icon, color = 'brand' }) {
  const colors = {
    brand:  'bg-brand-50  text-brand-700  border-brand-100',
    blue:   'bg-blue-50   text-blue-700   border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    red:    'bg-red-50    text-red-700    border-red-100',
  };
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className={`p-2 rounded-lg border ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}<span className="text-sm font-normal text-gray-500 ml-1">{unit}</span></p>
        {change !== undefined && change !== null && (
          <div className="flex items-center gap-1 mt-1">
            {change > 0 ? <TrendingUp className="h-3.5 w-3.5 text-red-500" /> :
             change < 0 ? <TrendingDown className="h-3.5 w-3.5 text-green-500" /> :
                          <Minus className="h-3.5 w-3.5 text-gray-400" />}
            <span className={`text-xs font-medium ${change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-500'}`}>
              {change > 0 ? '+' : ''}{change?.toFixed(1)}% vs previous period
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod]       = useState('monthly');
  const [summary, setSummary]     = useState(null);
  const [trend, setTrend]         = useState([]);
  const [mlStatus, setMlStatus]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summRes, trendRes, mlRes] = await Promise.allSettled([
        analyticsApi.getSummary({ period }),
        analyticsApi.getConsumption({ groupBy: 'day', startDate: new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10) }),
        mlApi.getStatus(),
      ]);
      if (summRes.status === 'fulfilled') setSummary(summRes.value.data.data);
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data.data || []);
      if (mlRes.status === 'fulfilled')   setMlStatus(mlRes.value.data);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const currency = user?.settings?.currency || 'INR';

  return (
    <div className="max-w-7xl mx-auto">
      {}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        <div className="flex gap-2">
          {['daily','weekly','monthly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${period === p ? 'bg-brand-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Alert type="error" message={error} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          {}
          {mlStatus && (
            <div className={`mb-4 px-4 py-2 rounded-lg border text-sm flex items-center gap-2
              ${mlStatus.engineOnline ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
              <Brain className="h-4 w-4 flex-shrink-0" />
              {mlStatus.engineOnline
                ? `ML Engine online — Model: ${mlStatus.model?.algorithm || 'not trained'}${mlStatus.model ? ` (trained ${new Date(mlStatus.model.trainedAt).toLocaleDateString()})` : ''}`
                : 'ML Engine offline — Start the Python server to enable AI forecasting.'}
            </div>
          )}

          {}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Total Consumption" value={summary?.totalKwh?.toFixed(1)} unit="kWh"
              change={summary?.changePercent} Icon={Zap} color="brand" />
            <KpiCard title="Estimated Cost" value={summary?.estimatedCost?.toFixed(0)} unit={currency}
              Icon={DollarSign} color="yellow" />
            <KpiCard title="Avg Daily Usage" value={summary?.avgDailyKwh?.toFixed(2)} unit="kWh/day"
              Icon={Activity} color="blue" />
            <KpiCard title="Readings This Period" value={summary?.readingCount} unit="records"
              Icon={TrendingUp} color="brand" />
          </div>

          {}
          <div className="card mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Consumption — Last 30 Days</h3>
            {trend.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Zap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No data yet. Add energy readings to see your trend.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="kwh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kWh" width={65} />
                  <Tooltip formatter={(v) => [`${v} kWh`, 'Consumption']} />
                  <Area type="monotone" dataKey="totalKwh" stroke="#16a34a" strokeWidth={2}
                    fill="url(#kwh)" name="kWh" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Current vs Previous Period</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Current period</span>
                    <span className="font-semibold">{summary.totalKwh?.toFixed(2)} kWh</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Previous period</span>
                    <span className="font-semibold">{summary.prevTotalKwh?.toFixed(2)} kWh</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Estimated cost</span>
                    <span className="font-semibold">{currency} {summary.estimatedCost?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Tariff</span>
                    <span className="font-semibold">{currency} {summary.tariffPerKwh}/kWh</span>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Add energy reading', href: '/energy' },
                    { label: 'Upload CSV data',     href: '/energy' },
                    { label: 'Run AI forecast',     href: '/forecast' },
                    { label: 'Detect anomalies',    href: '/anomalies' },
                    { label: 'View recommendations',href: '/recommendations' },
                  ].map(({ label, href }) => (
                    <a key={href} href={href}
                      className="flex items-center justify-between text-sm text-brand-700 hover:text-brand-800 py-1">
                      <span>{label}</span>
                      <span>→</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

