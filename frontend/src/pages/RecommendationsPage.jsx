import React, { useEffect, useState } from 'react';
import { mlApi } from '../services/api';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import { Lightbulb, RefreshCw } from 'lucide-react';

const confidenceColor = { high: 'badge-green', medium: 'badge-yellow', low: 'badge-red' };

export default function RecommendationsPage() {
  const [recs, setRecs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await mlApi.getRecommendations();
      setRecs(res.data.data || []);
    } catch {
      setError('Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await mlApi.dismissRecommendation(id);
      setRecs(r => r.filter(x => x.id !== id));
    } catch {

      setRecs(r => r.filter(x => x.id !== id));
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Energy Recommendations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Based on your actual usage data.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <Alert type="error" message={error} className="mb-4" />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : recs.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No recommendations available yet. Add energy readings to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recs.map(rec => (
            <div key={rec.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <h3 className="font-semibold text-gray-900 text-sm">{rec.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {rec.confidence && (
                    <span className={confidenceColor[rec.confidence] || 'badge-blue'}>
                      {rec.confidence}
                    </span>
                  )}
                  {rec.id !== 'no-data' && (
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 border border-gray-200 rounded"
                      title="Dismiss this recommendation"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{rec.explanation}</p>
              {rec.evidence && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 mb-2">
                  <strong>Evidence:</strong> {rec.evidence}
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium text-gray-700">Suggested action: </span>
                <span className="text-gray-600">{rec.action}</span>
              </div>
              {rec.estimatedImpact && (
                <div className="mt-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                  💡 {rec.estimatedImpact}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        These recommendations are generated from rule-based analysis of your actual data.
        Savings estimates are indicative based on your configured tariff.
        Always verify with your actual electricity bill.
      </div>
    </div>
  );
}

