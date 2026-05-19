import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { lancerRemplacement } from '../../engine/remplacement';
import { AlertTriangle } from 'lucide-react';

const CRENEAU_LABELS: Record<string, string> = {
  AM_MENA: 'Aide menagere',
  APM: 'Apres-midi',
  NUIT: 'Nuit',
  WE: 'Weekend',
};

interface Affectation {
  id: string;
  date: string;
  creneau_code: string;
  statut: string;
}

export default function Desistement() {
  const { profil } = useAuth();
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [motif, setMotif] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      if (!profil?.intervenant_id) {
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('affectations')
        .select('id, date, creneau_code, statut')
        .eq('intervenant_id', profil.intervenant_id)
        .eq('statut', 'confirmé')
        .gte('date', today)
        .order('date');

      setAffectations((data as Affectation[]) ?? []);
      setLoading(false);
    }
    load();
  }, [profil]);

  async function handleDesistement(e: React.FormEvent) {
    e.preventDefault();
    if (!profil?.intervenant_id || !selectedId) return;
    setSubmitting(true);

    // Creer le desistement
    const { data: desistementData } = await supabase.from('desistements').insert({
      affectation_id: selectedId,
      intervenant_id: profil.intervenant_id,
      motif: motif || null,
    }).select('id').single();

    // Marquer l'affectation comme absente
    await supabase.from('affectations').update({ statut: 'absent' }).eq('id', selectedId);

    // Lancer la recherche de remplacant automatiquement
    if (desistementData) {
      await lancerRemplacement(desistementData.id);
    }

    setSuccess(true);
    setSelectedId('');
    setMotif('');
    setSubmitting(false);

    // Recharger les affectations
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('affectations')
      .select('id, date, creneau_code, statut')
      .eq('intervenant_id', profil.intervenant_id)
      .eq('statut', 'confirmé')
      .gte('date', today)
      .order('date');
    setAffectations((data as Affectation[]) ?? []);
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Declarer un desistement</h1>

      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
          Desistement enregistre. Le gestionnaire sera notifie et un remplacement sera recherche.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4 text-yellow-600">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">
            Un desistement declenche automatiquement la recherche d'un remplacant.
          </p>
        </div>

        {affectations.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun creneau a venir a desister.</p>
        ) : (
          <form onSubmit={handleDesistement} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Creneau concerne
              </label>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Selectionnez un creneau...</option>
                {affectations.map(a => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' — '}
                    {CRENEAU_LABELS[a.creneau_code] ?? a.creneau_code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif (optionnel)
              </label>
              <textarea
                value={motif}
                onChange={e => setMotif(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                placeholder="Raison du desistement..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedId}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
            >
              {submitting ? 'Envoi...' : 'Confirmer le desistement'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
