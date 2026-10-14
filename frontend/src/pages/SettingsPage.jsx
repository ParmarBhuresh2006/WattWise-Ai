import React, { useEffect, useState } from 'react';
import { settingsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage() {
  const { refreshUser } = useAuth();
  const [form, setForm]       = useState({ tariffPerKwh: '', fixedMonthlyCharge: '', emissionFactor: '', currency: 'INR' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    settingsApi.getSettings().then(res => {
      const d = res.data.data;
      setForm({
        tariffPerKwh: d.tariffPerKwh ?? 8,
        fixedMonthlyCharge: d.fixedMonthlyCharge ?? 100,
        emissionFactor: d.emissionFactor ?? 0.82,
        currency: d.currency ?? 'INR',
      });
    }).catch(() => setError('Failed to load settings.')).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    setSaving(true);
    try {
      await settingsApi.updateSettings({
        tariffPerKwh: Number(form.tariffPerKwh),
        fixedMonthlyCharge: Number(form.fixedMonthlyCharge),
        emissionFactor: Number(form.emissionFactor),
        currency: form.currency,
      });
      await refreshUser();
      setSuccess('Settings saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <Alert type="error" message={error} className="" />
          <Alert type="success" message={success} className="" />

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Electricity Tariff
            </h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Currency</label>
                <select className="form-input w-auto" value={form.currency}
                  onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
              </div>
              <div>
                <label className="form-label">Price per kWh</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" min="0" required className="form-input"
                    value={form.tariffPerKwh}
                    onChange={e => setForm(f => ({ ...f, tariffPerKwh: e.target.value }))} />
                  <span className="text-sm text-gray-500">{form.currency}/kWh</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  This is your user-configured estimate, not an official tariff. Verify with your electricity provider.
                </p>
              </div>
              <div>
                <label className="form-label">Fixed monthly charge</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" min="0" className="form-input"
                    value={form.fixedMonthlyCharge}
                    onChange={e => setForm(f => ({ ...f, fixedMonthlyCharge: e.target.value }))} />
                  <span className="text-sm text-gray-500">{form.currency}/month</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Carbon Emissions (Optional)</h3>
            <div>
              <label className="form-label">Grid emission factor</label>
              <div className="flex items-center gap-2">
                <input type="number" step="0.001" min="0" className="form-input"
                  value={form.emissionFactor}
                  onChange={e => setForm(f => ({ ...f, emissionFactor: e.target.value }))} />
                <span className="text-sm text-gray-500">kg CO₂/kWh</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Default 0.82 kg CO₂/kWh is India's average grid emission factor (CEA 2023).
                Configure for your actual grid. These are estimates, not official measurements.
              </p>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  );
}

