import { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventDropArg } from '@fullcalendar/core';
import { supabase } from '../../lib/supabase';
import { genererEtSauvegarderPlanning, validerPlanning } from '../../engine/service';
import type { AlerteGeneration } from '../../engine/types';
import { exportExcel, exportPDF } from '../../engine/exports';
import { Play, Check, AlertTriangle, Loader2, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';

const CRENEAU_COLORS: Record<string, string> = {
  AM_MENA: '#f59e0b',
  APM: '#3b82f6',
  NUIT: '#6366f1',
  WE: '#10b981',
};

const CRENEAU_SHORT: Record<string, string> = {
  AM_MENA: 'AM',
  APM: 'APM',
  NUIT: 'NUIT',
  WE: 'WE',
};

interface IntervenantMap {
  [id: string]: { nom: string; prenom: string };
}

export default function Calendrier() {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [intervenants, setIntervenants] = useState<IntervenantMap>({});
  const [planning, setPlanning] = useState<{ id: string; statut: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [alertes, setAlertes] = useState<AlerteGeneration[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  async function loadIntervenants() {
    const { data } = await supabase.from('intervenants').select('id, nom, prenom');
    const map: IntervenantMap = {};
    for (const i of data ?? []) {
      map[i.id] = { nom: i.nom, prenom: i.prenom };
    }
    setIntervenants(map);
  }

  async function loadPlanning() {
    const { data: planningData } = await supabase
      .from('plannings')
      .select('*')
      .eq('mois', selectedMonth)
      .eq('annee', selectedYear)
      .single();

    if (!planningData) {
      setPlanning(null);
      setEvents([]);
      setScores([]);
      return;
    }

    setPlanning({ id: planningData.id, statut: planningData.statut });

    const { data: affectations } = await supabase
      .from('affectations')
      .select('*')
      .eq('planning_id', planningData.id);

    const { data: scoresData } = await supabase
      .from('scores_equite')
      .select('*')
      .eq('planning_id', planningData.id);

    setScores(scoresData ?? []);

    const evts: EventInput[] = (affectations ?? []).map((a: any) => ({
      id: a.id,
      title: `${CRENEAU_SHORT[a.creneau_code]} - ${intervenants[a.intervenant_id]?.prenom ?? '?'}`,
      start: a.date,
      backgroundColor: CRENEAU_COLORS[a.creneau_code] ?? '#6b7280',
      borderColor: CRENEAU_COLORS[a.creneau_code] ?? '#6b7280',
      extendedProps: {
        affectation_id: a.id,
        intervenant_id: a.intervenant_id,
        creneau_code: a.creneau_code,
      },
    }));

    setEvents(evts);
  }

  useEffect(() => { loadIntervenants(); }, []);
  useEffect(() => {
    if (Object.keys(intervenants).length > 0) loadPlanning();
  }, [selectedMonth, selectedYear, intervenants]);

  async function handleGenerate() {
    setGenerating(true);
    setAlertes([]);
    try {
      const result = await genererEtSauvegarderPlanning(selectedYear, selectedMonth);
      setAlertes(result.alertes);
      await loadPlanning();
    } catch (err) {
      console.error('Erreur generation:', err);
      setAlertes([{
        date: '',
        creneau_code: 'APM',
        message: `Erreur lors de la generation : ${err}`,
        niveau: 'error',
      }]);
    }
    setGenerating(false);
  }

  async function handleRegenerate() {
    if (!planning) return;
    setShowRegenConfirm(false);
    setRegenerating(true);
    setAlertes([]);
    try {
      await supabase.from('affectations').delete().eq('planning_id', planning.id);
      await supabase.from('scores_equite').delete().eq('planning_id', planning.id);
      await supabase.from('plannings').update({ statut: 'brouillon', validated_at: null }).eq('id', planning.id);
      const result = await genererEtSauvegarderPlanning(selectedYear, selectedMonth);
      setAlertes(result.alertes);
      await loadPlanning();
    } catch (err) {
      console.error('Erreur regeneration:', err);
      setAlertes([{
        date: '',
        creneau_code: 'APM',
        message: `Erreur lors de la regeneration : ${err}`,
        niveau: 'error',
      }]);
    }
    setRegenerating(false);
  }

  async function handleValidate() {
    if (!planning) return;
    await validerPlanning(planning.id);
    await loadPlanning();
  }

  async function handleEventDrop(info: EventDropArg) {
    const affId = info.event.extendedProps.affectation_id;
    const newDate = info.event.startStr;
    await supabase.from('affectations').update({ date: newDate }).eq('id', affId);
    await loadPlanning();
  }

  const isValidated = planning?.statut === 'validé';

  function handleExportExcel() {
    if (!planning) return;
    exportExcel({ planningId: planning.id, mois: selectedMonth, annee: selectedYear });
  }

  function handleExportPDF() {
    if (!planning) return;
    exportPDF({ planningId: planning.id, mois: selectedMonth, annee: selectedYear });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          {!planning && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {generating ? 'Generation...' : `Generer ${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
            </button>
          )}

          {planning && !isValidated && (
            <button
              onClick={() => setShowRegenConfirm(true)}
              disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {regenerating ? 'Regeneration...' : 'Regenerer'}
            </button>
          )}

          {planning && !isValidated && (
            <button
              onClick={handleValidate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check size={16} /> Valider le planning
            </button>
          )}

          {isValidated && (
            <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              <Check size={16} /> Planning valide
            </span>
          )}

          {planning && (
            <>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <FileText size={16} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal confirmation regeneration */}
      {showRegenConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Regenerer le planning ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cette action va supprimer toutes les affectations actuelles et regenerer le planning
              a partir des contraintes en vigueur. Cette action est irreversible.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRegenConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Confirmer la regeneration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="mb-4 space-y-2">
          {alertes.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                a.niveau === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              <AlertTriangle size={16} />
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Legende */}
      <div className="flex gap-4 mb-4">
        {Object.entries(CRENEAU_COLORS).map(([code, color]) => (
          <div key={code} className="flex items-center gap-1.5 text-sm">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            {CRENEAU_SHORT[code]}
          </div>
        ))}
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
          locale="fr"
          firstDay={1}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: '',
          }}
          events={events}
          editable={!isValidated}
          eventDrop={handleEventDrop}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={4}
        />
      </div>

      {/* Scores d'equite */}
      {scores.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scores d'equite</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Intervenant</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Jours</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Nuits</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Weekends</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Score</th>
                </tr>
              </thead>
              <tbody>
                {scores
                  .sort((a: any, b: any) => a.score_composite - b.score_composite)
                  .map((s: any) => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-900">
                        {intervenants[s.intervenant_id]?.prenom ?? s.intervenant_id}
                      </td>
                      <td className="text-right py-2 px-3">{s.jours_travailles}</td>
                      <td className="text-right py-2 px-3">{s.nuits_effectuees}</td>
                      <td className="text-right py-2 px-3">{s.weekends_travailles}</td>
                      <td className="text-right py-2 px-3 font-mono">{Number(s.score_composite).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
