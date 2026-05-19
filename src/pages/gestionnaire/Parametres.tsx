import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Parametre } from '../../types/database';
import { Save, Settings } from 'lucide-react';

export default function Parametres() {
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  async function fetchParametres() {
    setLoading(true);
    const { data } = await supabase.from('parametres').select('*').order('cle');
    setParametres(data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchParametres(); }, []);

  function handleChange(cle: string, valeur: string) {
    setEdited(prev => ({ ...prev, [cle]: valeur }));
    setSuccess(false);
  }

  function getValue(p: Parametre) {
    return edited[p.cle] ?? p.valeur;
  }

  async function handleSave() {
    setSaving(true);
    const updates = Object.entries(edited).map(([cle, valeur]) =>
      supabase.from('parametres').update({ valeur }).eq('cle', cle)
    );
    await Promise.all(updates);
    setEdited({});
    setSuccess(true);
    await fetchParametres();
    setSaving(false);
  }

  const hasChanges = Object.keys(edited).length > 0;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  const equiteParams = parametres.filter(p => p.cle.startsWith('equite_'));
  const otherParams = parametres.filter(p => !p.cle.startsWith('equite_'));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parametres</h1>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
          Parametres enregistres avec succes.
        </div>
      )}

      {/* Pondérations équité */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings size={20} className="text-blue-600" />
          Ponderations du score d'equite
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Le score composite determine l'equite de la repartition. La somme doit etre egale a 1.
        </p>
        <div className="space-y-3">
          {equiteParams.map(p => (
            <div key={p.id} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">{p.description}</label>
                <p className="text-xs text-gray-400">{p.cle}</p>
              </div>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={getValue(p)}
                onChange={e => handleChange(p.cle, e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-right"
              />
            </div>
          ))}
        </div>
        {equiteParams.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
            <span className={`text-sm font-medium ${
              Math.abs(equiteParams.reduce((sum, p) => sum + parseFloat(getValue(p) || '0'), 0) - 1) < 0.01
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              Total : {equiteParams.reduce((sum, p) => sum + parseFloat(getValue(p) || '0'), 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Autres paramètres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Autres parametres</h2>
        <div className="space-y-3">
          {otherParams.map(p => (
            <div key={p.id} className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">{p.description}</label>
                <p className="text-xs text-gray-400">{p.cle}</p>
              </div>
              <input
                value={getValue(p)}
                onChange={e => handleChange(p.cle, e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
