import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Conge, Intervenant } from '../../types/database';
import { Check, X, Clock } from 'lucide-react';

interface CongeWithIntervenant extends Conge {
  intervenant?: Intervenant;
}

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approuvé: { label: 'Approuve', color: 'bg-green-100 text-green-700', icon: Check },
  refusé: { label: 'Refuse', color: 'bg-red-100 text-red-700', icon: X },
};

export default function CongesGestionnaire() {
  const [conges, setConges] = useState<CongeWithIntervenant[]>([]);
  const [, setIntervenants] = useState<Intervenant[]>([]);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'approuvé' | 'refusé'>('all');
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    const [{ data: congesData }, { data: intervData }] = await Promise.all([
      supabase.from('conges').select('*').order('created_at', { ascending: false }),
      supabase.from('intervenants').select('*'),
    ]);

    setIntervenants(intervData ?? []);
    setConges(
      (congesData ?? []).map(c => ({
        ...c,
        intervenant: (intervData ?? []).find(i => i.id === c.intervenant_id),
      }))
    );
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function handleStatut(congeId: string, statut: 'approuvé' | 'refusé') {
    await supabase.from('conges').update({ statut }).eq('id', congeId);
    fetchData();
  }

  const filtered = filter === 'all' ? conges : conges.filter(c => c.statut === filter);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des conges</h1>
        <div className="flex gap-2">
          {(['all', 'en_attente', 'approuvé', 'refusé'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Tous' : STATUT_CONFIG[f].label}
              {f === 'en_attente' && (
                <span className="ml-1 bg-yellow-500 text-white rounded-full px-1.5 text-xs">
                  {conges.filter(c => c.statut === 'en_attente').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
          Aucun conge {filter !== 'all' ? `avec le statut "${STATUT_CONFIG[filter as keyof typeof STATUT_CONFIG]?.label}"` : ''}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const config = STATUT_CONFIG[c.statut as keyof typeof STATUT_CONFIG];
            const Icon = config.icon;
            return (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                    {c.intervenant?.prenom?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {c.intervenant?.prenom} {c.intervenant?.nom}
                    </p>
                    <p className="text-sm text-gray-500">
                      Du {new Date(c.date_debut).toLocaleDateString('fr-FR')} au{' '}
                      {new Date(c.date_fin).toLocaleDateString('fr-FR')}
                      {c.motif && <span className="ml-2 text-gray-400">— {c.motif}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${config.color}`}>
                    <Icon size={12} /> {config.label}
                  </span>

                  {c.statut === 'en_attente' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStatut(c.id, 'approuvé')}
                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        title="Approuver"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleStatut(c.id, 'refusé')}
                        className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Refuser"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
