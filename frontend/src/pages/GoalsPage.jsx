import React, { useEffect, useState } from 'react';
import { goalsApi } from '../services/api';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { Target, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

function GoalModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', targetKwh: '', period: 'monthly',
    startDate: new Date().toISOString().slice(0,10),
    endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10),
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await goalsApi.createGoal({ ...form, targetKwh: Number(form.targetKwh) });
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create goal.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
        <h3 className="text-base font-semibold mb-4">New Energy Goal</h3>
        <Alert type="error" message={error} className="mb-3" />
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Goal title *</label>
            <input type="text" required className="form-input" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Target (kWh) *</label>
            <input type="number" required min="0.1" step="0.1" className="form-input"
              value={form.targetKwh}
              onChange={e => setForm(f => ({ ...f, targetKwh: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Start date</label>
              <input type="date" required className="form-input" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">End date</label>
              <input type="date" required className="form-input" value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Period</label>
            <select className="form-input" value={form.period}
              onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Creating…' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modal, setModal]     = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await goalsApi.getGoals();
      setGoals(res.data.data || []);
    } catch { setError('Failed to load goals.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try { await goalsApi.deleteGoal(id); load(); } catch { setError('Delete failed.'); }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Energy Goals</h1>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      <Alert type="error" message={error} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No goals set. Create a consumption target to track your progress.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => {
            const progress = Math.min(goal.progressPercent, 100);
            const exceeded = goal.actualKwh > goal.targetKwh;
            return (
              <div key={goal._id} className={`card border-l-4 ${exceeded ? 'border-l-red-400' : 'border-l-brand-400'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{goal.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(goal.startDate).toLocaleDateString()} – {new Date(goal.endDate).toLocaleDateString()}
                      {' · '}{goal.period}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {exceeded
                      ? <AlertCircle className="h-4 w-4 text-red-500" />
                      : <CheckCircle className="h-4 w-4 text-green-500" />}
                    <button onClick={() => handleDelete(goal._id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{goal.actualKwh.toFixed(1)} kWh used</span>
                  <span>Target: {goal.targetKwh} kWh</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${exceeded ? 'bg-red-500' : 'bg-brand-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${exceeded ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {exceeded
                    ? `⚠ Exceeded by ${(goal.actualKwh - goal.targetKwh).toFixed(1)} kWh (${goal.progressPercent.toFixed(0)}%)`
                    : `${goal.progressPercent.toFixed(0)}% used · ${goal.remaining.toFixed(1)} kWh remaining`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {modal && <GoalModal onClose={() => setModal(false)} onSave={() => { setModal(false); load(); }} />}
    </div>
  );
}

