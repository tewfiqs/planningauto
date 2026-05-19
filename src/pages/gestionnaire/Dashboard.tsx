import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout';
import Intervenants from './Intervenants';
import CongesGestionnaire from './Conges';
import Parametres from './Parametres';
import Calendrier from './Calendrier';
import { supabase } from '../../lib/supabase';

function DashboardHome() {
  const [stats, setStats] = useState({ congesEnAttente: 0, intervenantsActifs: 0 });

  useEffect(() => {
    async function load() {
      const [{ count: congesCount }, { count: intervCount }] = await Promise.all([
        supabase.from('conges').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
        supabase.from('intervenants').select('*', { count: 'exact', head: true }).eq('actif', true),
      ]);
      setStats({
        congesEnAttente: congesCount ?? 0,
        intervenantsActifs: intervCount ?? 0,
      });
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Gestionnaire</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Intervenants actifs</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.intervenantsActifs}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Alertes</h3>
          <p className="text-3xl font-bold text-orange-500 mt-2">--</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Conges en attente</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.congesEnAttente}</p>
        </div>
      </div>
      <p className="text-gray-500 mt-8">Le dashboard sera alimente apres la generation du premier planning.</p>
    </div>
  );
}

export default function GestionnaireDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route path="intervenants" element={<Intervenants />} />
        <Route path="conges" element={<CongesGestionnaire />} />
        <Route path="parametres" element={<Parametres />} />
      </Routes>
    </Layout>
  );
}
