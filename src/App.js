import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import HomeLanding from './components/HomeLanding';
import EmployeeManagement from './components/EmployeeManagement';
import PlanningView from './components/PlanningView';
import AIAssistant from './components/AIAssistant';
import AbsenceManagement from './components/AbsenceManagement';
import CuisineManagement from './components/CuisineManagement';
import CuisinePlanningDisplay from './components/CuisinePlanningDisplay';
import MainHeader from './components/MainHeader';
import './index.css';

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
        <MainHeader />
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
                <CuisineManagement user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route path="/cuisine/tv" element={<CuisinePlanningDisplay tvMode={true} />} />
        </Routes>
        
        {/* Assistant IA flottant disponible partout */}
        {user && <AIAssistant />}
        
        {/* Notifications */}
        <Toaster 
          position="top-right"
          toastOptions={{
            className: 'tv-scale',
            duration: 4000,
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