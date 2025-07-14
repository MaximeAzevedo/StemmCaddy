import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import HomeLanding from './components/HomeLanding';
import EmployeeManagement from './components/EmployeeManagement';
import PlanningView from './components/PlanningView';
import AbsenceManagement from './components/AbsenceManagement';
import AbsenceManagementCuisine from './components/AbsenceManagementCuisine';
import DashboardCuisine from './components/DashboardCuisine';
import CuisinePlanningDisplay from './components/CuisinePlanningDisplay';
import SecretariatManagement from './components/SecretariatManagement';
import MainHeader from './components/MainHeader';
import './index.css';

// Composant interne pour gérer la location
const AppContent = ({ user, handleLogin, handleLogout }) => {
  const location = useLocation();
  
  return (
    <>
      <MainHeader />
      {/* Wrapper avec marge pour compenser le header flottant */}
      <div className={location?.pathname === '/cuisine/tv' ? '' : 'pt-20'}>
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
          <Route 
            path="/logistique"
            element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
          />
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
    <div className="App tv-scale">
      <Router>
        <AppContent 
          user={user} 
          handleLogin={handleLogin} 
          handleLogout={handleLogout} 
        />
        
        {/* Assistant IA flottant disponible partout */}
        
        {/* Notifications */}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            className: 'tv-scale',
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1f2937',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            },
          }}
        />
      </Router>
    </div>
  );
}

export default App; 