import { Routes, Route } from 'react-router-dom';
import Layout from '../../components/Layout';
import MonPlanning from './MonPlanning';
import MesConges from './MesConges';
import Desistement from './Desistement';
import NotificationsPage from './Notifications';

export default function IntervenantDashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<MonPlanning />} />
        <Route path="conges" element={<MesConges />} />
        <Route path="desistement" element={<Desistement />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Routes>
    </Layout>
  );
}
