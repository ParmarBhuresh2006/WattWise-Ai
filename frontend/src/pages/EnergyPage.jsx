import React, { useEffect, useState, useCallback } from 'react';
import { energyApi } from '../services/api';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { Plus, Pencil, Trash2, Upload, Download, Filter, Sparkles } from 'lucide-react';

function ReadingModal({ reading, onClose, onSave }) {
  const [form, setForm] = useState(reading || {
    readingDate: new Date().toISOString().slice(0,10),
    kWh: '',
    meterId: 'main',
    category: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (reading?._id) {
        await energyApi.updateReading(reading._id, { ...form, kWh: Number(form.kWh) });
      } else {
        await energyApi.createReading({ ...form, kWh: Number(form.kWh) });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {reading?._id ? 'Edit Reading' : 'Add Reading'}
        </h3>
        <Alert type="error" message={error} className="mb-3" />
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="form-label">Date *</label>
            <input type="date" required className="form-input"
              value={form.readingDate?.slice?.(0,10) || form.readingDate}
              onChange={e => setForm(f => ({ ...f, readingDate: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Energy (kWh) *</label>
            <input type="number" step="0.001" min="0" required className="form-input"
              value={form.kWh}
              onChange={e => setForm(f => ({ ...f, kWh: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Meter ID</label>
            <input type="text" className="form-input"
              value={form.meterId}
              onChange={e => setForm(f => ({ ...f, meterId: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Category</label>
            <select className="form-input"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Select…</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EnergyPage() {
  const [readings, setReadings]   = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [modal, setModal]         = useState(null);
  const [page, setPage]           = useState(1);
  const [filters, setFilters]     = useState({ startDate: '', endDate: '' });
  const [importing, setImporting] = useState(false);
  const [importing_error, setImportError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const res = await energyApi.getReadings(params);
      setReadings(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setError('Failed to load readings.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this reading?')) return;
    try {
      await energyApi.deleteReading(id);
      setSuccess('Reading deleted.');
      load();
    } catch { setError('Delete failed.'); }
  };

  const handleExport = async () => {
    try {
      const res = await energyApi.exportCSV(Object.fromEntries(Object.entries(filters).filter(([,v]) => v)));
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'wattwise-export.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Export failed.'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true); setImportError('');
    const form = new FormData(); form.append('file', file);
    try {
      const res = await energyApi.importCSV(form);
      setSuccess(`Imported ${res.data.imported} readings.`);
      load();
    } catch (err) {
      setImportError(err.response?.data?.message || 'Import failed.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleSeedSample = async () => {
    if (!confirm('Load 60 days of synthetic sample energy data for demonstration?')) return;
    setLoading(true); setError('');
    try {
      const res = await energyApi.seedSample(60);
      setSuccess(res.data.message || 'Sample data loaded.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sample data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Energy Records</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleSeedSample} className="btn-secondary" title="Populate 60 days of labeled sample data for testing">
            <Sparkles className="h-4 w-4 text-brand-600" /> Demo Data
          </button>
          <label className="btn-secondary cursor-pointer">
            <Upload className="h-4 w-4" />
            {importing ? 'Importing…' : 'Import CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => setModal('add')} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Reading
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} className="mb-4" />}
      {success && <Alert type="success" message={success} className="mb-4" />}
      {importing_error && <Alert type="error" message={importing_error} className="mb-4" />}

      {}
      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={filters.startDate}
              onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={filters.endDate}
              onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }} />
          </div>
          <button onClick={() => { setFilters({ startDate:'', endDate:'' }); setPage(1); }} className="btn-secondary">
            <Filter className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      {}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : readings.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="mb-2">No energy readings found.</p>
            <button onClick={() => setModal('add')} className="btn-primary mx-auto">
              <Plus className="h-4 w-4" /> Add your first reading
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Date','kWh','Meter','Category','Notes','Source','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {readings.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{new Date(r.readingDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold text-brand-700">{r.kWh}</td>
                    <td className="px-4 py-3 text-gray-600">{r.meterId || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{r.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge-${r.source === 'manual' ? 'green' : r.source === 'csv_import' ? 'blue' : 'yellow'}`}>
                        {r.source.replace('_',' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setModal(r)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(r._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span>Page {page} of {pagination.pages} ({pagination.total} total)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="btn-secondary py-1 px-2">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p+1)} className="btn-secondary py-1 px-2">Next</button>
            </div>
          </div>
        )}
      </div>

      {}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <strong>CSV format:</strong> Must include a <code>date</code> column (YYYY-MM-DD) and a <code>kWh</code> column.
        Optional columns: <code>meterId</code>, <code>category</code>, <code>notes</code>.
      </div>

      {}
      {modal && (
        <ReadingModal
          reading={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); setSuccess('Reading saved.'); load(); }}
        />
      )}
    </div>
  );
}

