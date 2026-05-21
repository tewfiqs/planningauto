import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Intervenant, Contrainte } from '../../types/database';
import { User, ChevronRight, Plus, X, Edit2, Trash2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  principale: 'Principale',
  aide: 'Aide',
  am: 'Aide menagere',
};

const CRENEAU_LABELS: Record<string, string> = {
  AM_MENA: 'Aide menagere (11h-14h)',
  APM: 'Apres-midi (14h-19h)',
  NUIT: 'Nuit (19h-11h)',
  WE: 'Weekend (11h-19h)',
};

const JOURS_LABELS = [
  { value: 0, label: 'Lun' },
  { value: 1, label: 'Mar' },
  { value: 2, label: 'Mer' },
  { value: 3, label: 'Jeu' },
  { value: 4, label: 'Ven' },
  { value: 5, label: 'Sam' },
  { value: 6, label: 'Dim' },
];

const VALEUR_OPTIONS = [
  { value: 'obligatoire', label: 'Obligatoire', type: 'hard' as const },
  { value: 'optionnel', label: 'Optionnel (dernier recours)', type: 'soft' as const },
  { value: 'interdit', label: 'Interdit', type: 'hard' as const },
  { value: 'quota', label: 'Quota (max par periode)', type: 'quota' as const },
];

const VALEUR_BADGES: Record<string, { bg: string; text: string }> = {
  obligatoire: { bg: 'bg-green-100', text: 'text-green-700' },
  optionnel: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  interdit: { bg: 'bg-red-100', text: 'text-red-700' },
};

function joursLabel(jours: number[] | null): string {
  if (!jours || jours.length === 0) return 'Tous les jours';
  if (jours.length === 7) return 'Tous les jours';
  return jours.map(j => JOURS_LABELS.find(l => l.value === j)?.label ?? '?').join(', ');
}

interface IntervenantWithContraintes extends Intervenant {
  contraintes: Contrainte[];
}

export default function Intervenants() {
  const [intervenants, setIntervenants] = useState<IntervenantWithContraintes[]>([]);
  const [selected, setSelected] = useState<IntervenantWithContraintes | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddContrainte, setShowAddContrainte] = useState(false);
  const [editingIntervenant, setEditingIntervenant] = useState<Intervenant | null>(null);

  const [newContrainte, setNewContrainte] = useState({
    creneau_code: 'APM',
    valeur: 'obligatoire',
    jours_semaine: [] as number[],
    periode: '' as string,
    quota_max: '',
    description: '',
  });

  const [editForm, setEditForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    role: 'principale' as 'principale' | 'aide' | 'am',
    actif: true,
  });

  async function fetchIntervenants() {
    setLoading(true);
    const { data: intervData } = await supabase
      .from('intervenants')
      .select('*')
      .order('role')
      .order('nom');

    const { data: contData } = await supabase.from('contraintes').select('*');

    const merged = (intervData ?? []).map(i => ({
      ...i,
      contraintes: (contData ?? []).filter(c => c.intervenant_id === i.id),
    }));

    setIntervenants(merged);
    if (selected) {
      const updated = merged.find(i => i.id === selected.id);
      if (updated) setSelected(updated);
    }
    setLoading(false);
  }

  useEffect(() => { fetchIntervenants(); }, []);

  function toggleJour(jour: number) {
    setNewContrainte(prev => {
      const jours = prev.jours_semaine.includes(jour)
        ? prev.jours_semaine.filter(j => j !== jour)
        : [...prev.jours_semaine, jour].sort((a, b) => a - b);
      return { ...prev, jours_semaine: jours };
    });
  }

  async function handleAddContrainte() {
    if (!selected) return;
    const option = VALEUR_OPTIONS.find(o => o.value === newContrainte.valeur);
    if (!option) return;

    const isQuota = option.type === 'quota';
    const valeur = isQuota ? `max:${newContrainte.quota_max}` : newContrainte.valeur;
    const jours = newContrainte.jours_semaine.length > 0 ? newContrainte.jours_semaine : null;

    await supabase.from('contraintes').insert({
      intervenant_id: selected.id,
      type: option.type,
      creneau_code: newContrainte.creneau_code,
      valeur,
      jours_semaine: jours,
      periode: isQuota ? (newContrainte.periode || 'semaine') : (newContrainte.periode || null),
      description: newContrainte.description || null,
    });
    setShowAddContrainte(false);
    setNewContrainte({ creneau_code: 'APM', valeur: 'obligatoire', jours_semaine: [], periode: '', quota_max: '', description: '' });
    fetchIntervenants();
  }

  async function handleDeleteContrainte(id: string) {
    await supabase.from('contraintes').delete().eq('id', id);
    fetchIntervenants();
  }

  function startEditIntervenant(i: Intervenant) {
    setEditingIntervenant(i);
    setEditForm({ nom: i.nom, prenom: i.prenom, email: i.email, role: i.role, actif: i.actif });
  }

  async function handleSaveIntervenant() {
    if (!editingIntervenant) return;
    await supabase.from('intervenants').update(editForm).eq('id', editingIntervenant.id);
    setEditingIntervenant(null);
    fetchIntervenants();
  }

  async function handleToggleActif(i: Intervenant) {
    await supabase.from('intervenants').update({ actif: !i.actif }).eq('id', i.id);
    fetchIntervenants();
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  const isQuotaMode = newContrainte.valeur === 'quota';

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Liste */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Intervenants</h2>
          <p className="text-sm text-gray-500">{intervenants.length} personnes</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {intervenants.map(i => (
            <button
              key={i.id}
              onClick={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selected?.id === i.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                !i.actif ? 'bg-gray-400' : i.role === 'principale' ? 'bg-blue-500' : i.role === 'aide' ? 'bg-green-500' : 'bg-orange-500'
              }`}>
                {i.prenom[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${!i.actif ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {i.prenom} {i.nom}
                </p>
                <p className="text-xs text-gray-500">{ROLE_LABELS[i.role]}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <User size={48} />
            <p className="mt-2">Selectionnez un intervenant</p>
          </div>
        ) : (
          <div className="p-6">
            {/* En-tete */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium ${
                  selected.role === 'principale' ? 'bg-blue-500' : selected.role === 'aide' ? 'bg-green-500' : 'bg-orange-500'
                }`}>
                  {selected.prenom[0]}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selected.prenom} {selected.nom}</h2>
                  <p className="text-sm text-gray-500">{selected.email} — {ROLE_LABELS[selected.role]}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEditIntervenant(selected)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Edit2 size={14} /> Modifier
                </button>
                <button
                  onClick={() => handleToggleActif(selected)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selected.actif ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {selected.actif ? 'Desactiver' : 'Activer'}
                </button>
              </div>
            </div>

            {/* Contraintes */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Contraintes</h3>
              <button
                onClick={() => setShowAddContrainte(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>

            {selected.contraintes.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune contrainte definie</p>
            ) : (
              <div className="space-y-2">
                {selected.contraintes.map(c => {
                  const badge = VALEUR_BADGES[c.valeur] ?? { bg: 'bg-purple-100', text: 'text-purple-700' };
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${badge.bg} ${badge.text}`}>
                            {c.type === 'quota' ? 'Quota' : c.valeur.charAt(0).toUpperCase() + c.valeur.slice(1)}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {CRENEAU_LABELS[c.creneau_code] || c.creneau_code}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {joursLabel(c.jours_semaine)}
                          {c.type === 'quota' ? ` — ${c.valeur} (par ${c.periode})` : ''}
                        </p>
                        {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                      </div>
                      <button
                        onClick={() => handleDeleteContrainte(c.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal ajout contrainte */}
            {showAddContrainte && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Ajouter une contrainte</h3>
                    <button onClick={() => setShowAddContrainte(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Creneau</label>
                      <select
                        value={newContrainte.creneau_code}
                        onChange={e => setNewContrainte({ ...newContrainte, creneau_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {Object.entries(CRENEAU_LABELS).map(([code, label]) => (
                          <option key={code} value={code}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Jours de la semaine</label>
                      <div className="flex gap-2">
                        {JOURS_LABELS.map(j => (
                          <button
                            key={j.value}
                            type="button"
                            onClick={() => toggleJour(j.value)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                              newContrainte.jours_semaine.includes(j.value)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {j.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Aucun = tous les jours</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newContrainte.valeur}
                        onChange={e => setNewContrainte({ ...newContrainte, valeur: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {VALEUR_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {isQuotaMode && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                          <select
                            value={newContrainte.periode}
                            onChange={e => setNewContrainte({ ...newContrainte, periode: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="semaine">Semaine</option>
                            <option value="mois">Mois</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Maximum</label>
                          <input
                            type="number"
                            min="1"
                            value={newContrainte.quota_max}
                            onChange={e => setNewContrainte({ ...newContrainte, quota_max: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="ex: 2"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        value={newContrainte.description}
                        onChange={e => setNewContrainte({ ...newContrainte, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Description optionnelle..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => setShowAddContrainte(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleAddContrainte}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal edition intervenant */}
            {editingIntervenant && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Modifier l'intervenant</h3>
                    <button onClick={() => setEditingIntervenant(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
                      <input
                        value={editForm.prenom}
                        onChange={e => setEditForm({ ...editForm, prenom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input
                        value={editForm.nom}
                        onChange={e => setEditForm({ ...editForm, nom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={editForm.role}
                        onChange={e => setEditForm({ ...editForm, role: e.target.value as 'principale' | 'aide' | 'am' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="principale">Principale</option>
                        <option value="aide">Aide</option>
                        <option value="am">Aide menagere</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      onClick={() => setEditingIntervenant(null)}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveIntervenant}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
