import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LoginChauffeur from './LoginChauffeur';
import ChauffeurInterface from './ChauffeurInterface';

const CollectesApp = ({ onReturnToMain }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Force la déconnexion au chargement pour s'assurer du login
  useEffect(() => {
    const forceLogout = async () => {
      await supabase.auth.signOut();
      setLoading(false);
    };
    forceLogout();
  }, []);

  const handleLoginSuccess = (profile) => {
    setUserProfile(profile);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  // Affichage du loader pendant la déconnexion forcée
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Si pas connecté, afficher le login
  if (!userProfile) {
    return <LoginChauffeur onLoginSuccess={handleLoginSuccess} />;
  }

  // Interface pour les chauffeurs uniquement
  if (userProfile.role === 'chauffeur') {
    return (
      <ChauffeurInterface 
        userProfile={userProfile} 
        onLogout={handleLogout}
      />
    );
  }

  // Les encadrants sont redirigés vers la logistique
  if (userProfile.role === 'encadrant') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <span className="text-6xl mb-4 block">👨‍💼</span>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Accès Encadrant
          </h2>
          <p className="text-gray-600 mb-6">
            La modération des collectes se trouve dans la section <strong>Logistique</strong> de l'application principale.
          </p>
          <div className="space-y-3">
            <button
              onClick={onReturnToMain}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              🚛 Aller à Logistique
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Cas d'erreur (rôle non reconnu)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
        <span className="text-6xl mb-4 block">⚠️</span>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Rôle non reconnu
        </h2>
        <p className="text-gray-600 mb-6">
          Votre rôle "{userProfile.role}" n'est pas autorisé à accéder à cette application.
        </p>
        <button
          onClick={handleLogout}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default CollectesApp; 