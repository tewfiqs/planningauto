import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventInput } from '@fullcalendar/core';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

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

export default function MonPlanning() {
  const { profil } = useAuth();
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profil?.intervenant_id) {
        setLoading(false);
        return;
      }

      const now = new Date();
      const debutMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const finMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      const { data: affectations } = await supabase
        .from('affectations')
        .select('*')
        .eq('intervenant_id', profil.intervenant_id)
        .gte('date', debutMois)
        .lte('date', finMois)
        .eq('statut', 'confirmé');

      const evts: EventInput[] = (affectations ?? []).map((a: any) => ({
        id: a.id,
        title: CRENEAU_SHORT[a.creneau_code] ?? a.creneau_code,
        start: a.date,
        backgroundColor: CRENEAU_COLORS[a.creneau_code] ?? '#6b7280',
        borderColor: CRENEAU_COLORS[a.creneau_code] ?? '#6b7280',
        extendedProps: { affectation_id: a.id, creneau_code: a.creneau_code },
      }));

      setEvents(evts);
      setLoading(false);
    }
    load();
  }, [profil]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  if (!profil?.intervenant_id) {
    return <p className="text-gray-500">Votre profil n'est pas lie a un intervenant.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon Planning</h1>

      <div className="flex gap-4 mb-4">
        {Object.entries(CRENEAU_COLORS).map(([code, color]) => (
          <div key={code} className="flex items-center gap-1.5 text-sm">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            {CRENEAU_SHORT[code]}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          locale="fr"
          firstDay={1}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: '',
          }}
          events={events}
          height="auto"
          eventDisplay="block"
        />
      </div>

      <div className="mt-4 text-sm text-gray-500">
        {events.length} creneau(x) ce mois
      </div>
    </div>
  );
}
