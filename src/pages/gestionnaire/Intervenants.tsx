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

const CONTRAINTE_TYPE_LABELS: Record<string, string> = {
  hard: 'Obligatoire',
  soft: 'Souple',
  quota: 'Quota',
};

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
    type: 'hard' as 'hard' | 'soft' | 'quota',
    creneau_code: 'APM',
    valeur: 'autorisé',
    periode: '' as string,
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

  async function handleAddContrainte() {
    if (!selected) return;
    await supabase.from('contraintes').insert({
      intervenant_id: selected.id,
      type: newContrainte.type,
      creneau_code: newContrainte.creneau_code,
      valeur: newContrainte.valeur,
      periode: newContrainte.periode || null,
      description: newContrainte.description || null,
    });
    setShowAddContrainte(false);
    setNewContrainte({ type: 'hard', creneau_code: 'APM', valeur: 'autorisé', periode: '', description: '' });
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
                {selected.contraintes.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          c.type === 'hard' ? 'bg-red-100 text-red-700' :
                          c.type === 'quota' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {CONTRAINTE_TYPE_LABELS[c.type]}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {CRENEAU_LABELS[c.creneau_code] || c.creneau_code}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {c.valeur}
                        {c.periode ? ` (par ${c.periode})` : ''}
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
                ))}
              </div>
            )}

            {/* Modal ajout contrainte */}
            {showAddContrainte && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Ajouter une contrainte</h3>
                    <button onClick={() => setShowAddContrainte(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newContrainte.type}
                        onChange={e => setNewContrainte({ ...newContrainte, type: e.target.value as 'hard' | 'soft' | 'quota' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="hard">Obligatoire (hard)</option>
                        <option value="soft">Souple (soft)</option>
                        <option value="quota">Quota</option>
                      </select>
                    </div>

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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valeur</label>
                      <input
                        value={newContrainte.valeur}
                        onChange={e => setNewContrainte({ ...newContrainte, valeur: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="autorisé, interdit, priorité, max:2, no_consecutive..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                      <select
                        value={newContrainte.periode}
                        onChange={e => setNewContrainte({ ...newContrainte, periode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Aucune</option>
                        <option value="jour">Jour</option>
                        <option value="semaine">Semaine</option>
                        <option value="mois">Mois</option>
                      </select>
                    </div>

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
