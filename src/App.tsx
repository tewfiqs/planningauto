import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Login from './pages/Login';
import GestionnaireDashboard from './pages/gestionnaire/Dashboard';
import IntervenantDashboard from './pages/intervenant/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/gestionnaire/*"
            element={
              <ProtectedRoute requiredRole="gestionnaire">
                <GestionnaireDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/intervenant/*"
            element={
              <ProtectedRoute requiredRole="intervenant">
                <IntervenantDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
