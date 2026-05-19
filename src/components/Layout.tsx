import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Calendar, Users, Settings, Bell, ClipboardList, Home, AlertTriangle } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const gestionnaireNav: NavItem[] = [
  { label: 'Dashboard', path: '/gestionnaire', icon: <Home size={20} /> },
  { label: 'Calendrier', path: '/gestionnaire/calendrier', icon: <Calendar size={20} /> },
  { label: 'Intervenants', path: '/gestionnaire/intervenants', icon: <Users size={20} /> },
  { label: 'Congés', path: '/gestionnaire/conges', icon: <ClipboardList size={20} /> },
  { label: 'Paramètres', path: '/gestionnaire/parametres', icon: <Settings size={20} /> },
];

const intervenantNav: NavItem[] = [
  { label: 'Mon planning', path: '/intervenant', icon: <Calendar size={20} /> },
  { label: 'Mes conges', path: '/intervenant/conges', icon: <ClipboardList size={20} /> },
  { label: 'Desistement', path: '/intervenant/desistement', icon: <AlertTriangle size={20} /> },
  { label: 'Notifications', path: '/intervenant/notifications', icon: <Bell size={20} /> },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { role, signOut } = useAuth();
  const location = useLocation();
  const navItems = role === 'gestionnaire' ? gestionnaireNav : intervenantNav;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">PlanningAuto</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{role}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/gestionnaire' && item.path !== '/intervenant' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
