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
import PlanningNettoyage from './components/PlanningNettoyage';
import NettoyagePlanningDisplay from './components/NettoyagePlanningDisplay';
import SecretariatManagement from './components/SecretariatManagement';
import MainHeader from './components/MainHeader';
// ✅ NOUVEAU : Import de l'application de collectes chauffeurs
import CollectesApp from './components/CollectesApp';
// ✅ NOUVEAU : Import de la modération des collectes
import ModerationCollectes from './components/ModerationCollectes';
import './index.css';

// Composant pour protéger les routes avec authentification obligatoire
const ProtectedRoute = ({ children, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Composant interne pour gérer la location
const AppContent = ({ user, handleLogin, handleLogout }) => {
  const location = useLocation();
  
  // Vérifier si on est en mode TV ou sur l'app collectes (pas de header)
  const isTVMode = location?.pathname === '/cuisine/tv' || location?.pathname === '/logistique/tv' || location?.pathname === '/cuisine/nettoyage/tv';
  const isCollectesApp = location?.pathname === '/collectes';
  
  return (
    <>
      {/* Afficher le header seulement si on n'est pas en mode TV ou collectes ET si l'utilisateur est connecté */}
      {user && !isTVMode && !isCollectesApp && <MainHeader />}
      
      {/* Wrapper avec marge pour compenser le header flottant seulement si header visible */}
      <div className={!user || isTVMode || isCollectesApp ? '' : 'pt-20'}>
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
            } 
          />
          
          {/* 🔒 SÉCURISÉ : Route principale protégée */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute user={user}>
                <HomeLanding />
              </ProtectedRoute>
            }
          />
          
          {/* 🔒 SÉCURISÉ : Application de collectes chauffeurs maintenant protégée */}
          <Route 
            path="/collectes" 
            element={
              <ProtectedRoute user={user}>
                <CollectesApp onReturnToMain={() => window.location.href = '/'} />
              </ProtectedRoute>
            }
          />
          
          {/* 🔒 SÉCURISÉ : Toutes les routes logistique protégées */}
          <Route 
            path="/logistique"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/logistique/gestion"
            element={
              <ProtectedRoute user={user}>
                <LogistiqueManagement user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/logistique/planning"
            element={
              <ProtectedRoute user={user}>
                <PlanningView user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/logistique/absences"
            element={
              <ProtectedRoute user={user}>
                <AbsenceManagementLogistique user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/logistique/collectes"
            element={
              <ProtectedRoute user={user}>
                <ModerationCollectes user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          
          {/* 🔒 SÉCURISÉ : Mode TV logistique maintenant protégé */}
          <Route 
            path="/logistique/tv" 
            element={
              <ProtectedRoute user={user}>
                <LogistiqueTVView />
              </ProtectedRoute>
            }
          />
          
          {/* 🔒 SÉCURISÉ : Gestion des employés protégée */}
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute user={user}>
                <EmployeeManagement user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* 🔒 SÉCURISÉ : Planning protégé */}
          <Route 
            path="/planning" 
            element={
              <ProtectedRoute user={user}>
                <PlanningView user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* 🔒 SÉCURISÉ : Absences protégées */}
          <Route 
            path="/absences" 
            element={
              <ProtectedRoute user={user}>
                <AbsenceManagement user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* 🔒 SÉCURISÉ : Toutes les routes cuisine protégées */}
          <Route 
            path="/cuisine" 
            element={
              <ProtectedRoute user={user}>
                <DashboardCuisine user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* 🔒 SÉCURISÉ : Secrétariat protégé */}
          <Route 
            path="/secretariat" 
            element={
              <ProtectedRoute user={user}>
                <SecretariatManagement user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* 🔒 SÉCURISÉ : Absences cuisine protégées */}
          <Route 
            path="/cuisine/absences" 
            element={
              <ProtectedRoute user={user}>
                <AbsenceManagementCuisine user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* 🔒 SÉCURISÉ : Mode TV cuisine maintenant protégé */}
          <Route 
            path="/cuisine/tv" 
            element={
              <ProtectedRoute user={user}>
                <CuisinePlanningDisplay tvMode={true} />
              </ProtectedRoute>
            }
          />
          
          {/* 🔒 SÉCURISÉ : Planning nettoyage protégé */}
          <Route 
            path="/cuisine/nettoyage" 
            element={
              <ProtectedRoute user={user}>
                <PlanningNettoyage user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          
          {/* 🔒 SÉCURISÉ : Mode TV nettoyage protégé */}
          <Route 
            path="/cuisine/nettoyage/tv" 
            element={
              <ProtectedRoute user={user}>
                <NettoyagePlanningDisplay tvMode={true} />
              </ProtectedRoute>
            }
          />
          
          {/* 🔒 SÉCURISÉ : Redirection par défaut vers login pour toute route non définie */}
          <Route 
            path="*" 
            element={<Navigate to="/login" replace />}
          />
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
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        // Si erreur de parsing, nettoyer le localStorage
        localStorage.removeItem('caddy_user');
      }
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
    // Rediriger vers login après déconnexion
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-primary-600 font-medium">Vérification de l'authentification...</p>
        </div>
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
        </Router>
      </PlanningDataProvider>
    </NotificationProvider>
  );
}

export default App; 