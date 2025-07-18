import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { NotificationProvider } from './components/PremiumNotifications';
// ✅ NOUVEAU : Importer le contexte partagé
import { PlanningDataProvider } from './contexts/PlanningDataContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import HomeLanding from './components/HomeLanding';
import EmployeeManagement from './components/EmployeeManagement';
import LogistiqueManagement from './components/LogistiqueManagement';
import AbsenceManagementLogistique from './components/AbsenceManagementLogistique';
import PlanningView from './components/PlanningView';
import LogistiqueTVView from './components/LogistiqueTVView';
import AbsenceManagement from './components/AbsenceManagement';
import AbsenceManagementCuisine from './components/AbsenceManagementCuisine';
import DashboardCuisine from './components/DashboardCuisine';
import CuisinePlanningDisplay from './components/CuisinePlanningDisplay';
import SecretariatManagement from './components/SecretariatManagement';
import MainHeader from './components/MainHeader';
// ✅ NOUVEAU : Import de l'application de collectes chauffeurs
import CollectesApp from './components/CollectesApp';
// ✅ NOUVEAU : Import de la modération des collectes
import ModerationCollectes from './components/ModerationCollectes';
import './index.css';

// Composant interne pour gérer la location
const AppContent = ({ user, handleLogin, handleLogout }) => {
  const location = useLocation();
  
  // Vérifier si on est en mode TV ou sur l'app collectes (pas de header)
  const isTVMode = location?.pathname === '/cuisine/tv' || location?.pathname === '/logistique/tv';
  const isCollectesApp = location?.pathname === '/collectes';
  
  return (
    <>
      {/* Afficher le header seulement si on n'est pas en mode TV ou collectes */}
      {!isTVMode && !isCollectesApp && <MainHeader />}
      
      {/* Wrapper avec marge pour compenser le header flottant seulement si header visible */}
      <div className={isTVMode || isCollectesApp ? '' : 'pt-20'}>
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/" 
            element={user ? <HomeLanding /> : <Navigate to="/login" />}
          />
          {/* ✅ NOUVEAU : Route pour l'application de collectes chauffeurs */}
          <Route 
            path="/collectes" 
            element={<CollectesApp onReturnToMain={() => window.location.href = '/'} />}
          />
          <Route 
            path="/logistique"
            element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route 
            path="/logistique/gestion"
            element={user ? <LogistiqueManagement user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route 
            path="/logistique/planning"
            element={user ? <PlanningView user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route 
            path="/logistique/absences"
            element={user ? <AbsenceManagementLogistique user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          {/* ✅ NOUVEAU : Route pour la modération des collectes en logistique */}
          <Route 
            path="/logistique/collectes"
            element={user ? <ModerationCollectes user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
          <Route path="/logistique/tv" element={<LogistiqueTVView />} />
          <Route 
            path="/employees" 
            element={
              user ? (
                <EmployeeManagement user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/planning" 
            element={
              user ? (
                <PlanningView user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/absences" 
            element={
              user ? (
                <AbsenceManagement user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/cuisine" 
            element={
              user ? (
                <DashboardCuisine user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/secretariat" 
            element={
              user ? (
                <SecretariatManagement user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route 
            path="/cuisine/absences" 
            element={
              user ? (
                <AbsenceManagementCuisine user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route path="/cuisine/tv" element={<CuisinePlanningDisplay tvMode={true} />} />
        </Routes>
      </div>
    </>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const savedUser = localStorage.getItem('caddy_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('caddy_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('caddy_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <PlanningDataProvider>
        <Router>
          <AppContent 
            user={user} 
            handleLogin={handleLogin} 
            handleLogout={handleLogout} 
          />
          
          {/* Assistant IA flottant disponible partout */}
          
        </Router>
      </PlanningDataProvider>
    </NotificationProvider>
  );
}

export default App; 