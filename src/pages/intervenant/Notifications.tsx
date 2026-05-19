import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Notification } from '../../types/database';
import { Bell, Check, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const { profil } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    if (!profil?.intervenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('intervenant_id', profil.intervenant_id)
      .order('created_at', { ascending: false });
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchNotifications(); }, [profil]);

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ lu: true }).eq('id', id);
    fetchNotifications();
  }

  async function markAllAsRead() {
    if (!profil?.intervenant_id) return;
    await supabase
      .from('notifications')
      .update({ lu: true })
      .eq('intervenant_id', profil.intervenant_id)
      .eq('lu', false);
    fetchNotifications();
  }

  // Verifier les demandes de remplacement en attente
  const [remplacements, setRemplacements] = useState<any[]>([]);

  useEffect(() => {
    async function loadRemplacements() {
      if (!profil?.intervenant_id) return;
      const { data } = await supabase
        .from('remplacements')
        .select('*, desistements(*, affectations(date, creneau_code))')
        .eq('intervenant_remplacant_id', profil.intervenant_id)
        .eq('statut', 'proposé');
      setRemplacements(data ?? []);
    }
    loadRemplacements();
  }, [profil]);

  async function repondreRemplacement(remplacementId: string, statut: 'accepté' | 'refusé') {
    await supabase.from('remplacements').update({
      statut,
      repondu_le: new Date().toISOString(),
    }).eq('id', remplacementId);

    if (statut === 'accepté') {
      const remplacement = remplacements.find(r => r.id === remplacementId);
      if (remplacement?.desistements?.affectations) {
        // Mettre a jour l'affectation originale
        await supabase.from('affectations').update({
          intervenant_id: profil!.intervenant_id!,
          statut: 'confirmé',
        }).eq('id', remplacement.desistements.affectation_id);
      }
    }

    // Recharger
    const { data } = await supabase
      .from('remplacements')
      .select('*, desistements(*, affectations(date, creneau_code))')
      .eq('intervenant_remplacant_id', profil!.intervenant_id!)
      .eq('statut', 'proposé');
    setRemplacements(data ?? []);
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  const unread = notifications.filter(n => !n.lu).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <CheckCheck size={16} /> Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Demandes de remplacement en attente */}
      {remplacements.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Demandes de remplacement</h2>
          <div className="space-y-3">
            {remplacements.map(r => (
              <div key={r.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="font-medium text-gray-900 mb-2">
                  Remplacement demande pour le{' '}
                  {r.desistements?.affectations?.date
                    ? new Date(r.desistements.affectations.date).toLocaleDateString('fr-FR')
                    : '?'}{' '}
                  ({r.desistements?.affectations?.creneau_code ?? '?'})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => repondreRemplacement(r.id, 'accepté')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Check size={14} /> Accepter
                  </button>
                  <button
                    onClick={() => repondreRemplacement(r.id, 'refusé')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des notifications */}
      {notifications.length === 0 && remplacements.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
          <Bell size={32} className="mx-auto mb-2" />
          Aucune notification
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 flex items-center justify-between transition-colors ${
                n.lu ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div>
                <p className={`text-sm ${n.lu ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                  {n.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              {!n.lu && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Marquer comme lu"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
