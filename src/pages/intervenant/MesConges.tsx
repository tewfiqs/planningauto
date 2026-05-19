import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Conge } from '../../types/database';
import { Plus, Clock, Check, X as XIcon } from 'lucide-react';

const STATUT_CONFIG = {
  en_attente: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approuvé: { label: 'Approuve', color: 'bg-green-100 text-green-700', icon: Check },
  refusé: { label: 'Refuse', color: 'bg-red-100 text-red-700', icon: XIcon },
};

export default function MesConges() {
  const { profil } = useAuth();
  const [conges, setConges] = useState<Conge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date_debut: '', date_fin: '', motif: '' });
  const [submitting, setSubmitting] = useState(false);

  async function fetchConges() {
    if (!profil?.intervenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('conges')
      .select('*')
      .eq('intervenant_id', profil.intervenant_id)
      .order('created_at', { ascending: false });
    setConges((data as Conge[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchConges(); }, [profil]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profil?.intervenant_id) return;
    setSubmitting(true);

    await supabase.from('conges').insert({
      intervenant_id: profil.intervenant_id,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      motif: form.motif || null,
      statut: 'en_attente',
    });

    setForm({ date_debut: '', date_fin: '', motif: '' });
    setShowForm(false);
    setSubmitting(false);
    fetchConges();
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes Conges</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Demander un conge
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouvelle demande</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date debut</label>
              <input
                type="date"
                value={form.date_debut}
                onChange={e => setForm({ ...form, date_debut: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="date"
                value={form.date_fin}
                onChange={e => setForm({ ...form, date_fin: e.target.value })}
                required
                min={form.date_debut}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif (optionnel)</label>
            <input
              value={form.motif}
              onChange={e => setForm({ ...form, motif: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Raison du conge..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      )}

      {conges.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
          Aucune demande de conge
        </div>
      ) : (
        <div className="space-y-3">
          {conges.map(c => {
            const config = STATUT_CONFIG[c.statut as keyof typeof STATUT_CONFIG];
            const Icon = config.icon;
            return (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(c.date_debut).toLocaleDateString('fr-FR')} — {new Date(c.date_fin).toLocaleDateString('fr-FR')}
                  </p>
                  {c.motif && <p className="text-sm text-gray-500 mt-0.5">{c.motif}</p>}
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${config.color}`}>
                  <Icon size={12} /> {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
