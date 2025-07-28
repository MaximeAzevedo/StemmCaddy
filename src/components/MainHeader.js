import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const MainHeader = () => {
  const location = useLocation();
  const isCuisine = location.pathname.startsWith('/cuisine');
  const isLogistique = location.pathname.startsWith('/logistique');
  const isSecretariat = location.pathname.startsWith('/secretariat');
  const navigate = useNavigate();

  // Récupérer les informations utilisateur depuis localStorage
  const user = JSON.parse(localStorage.getItem('caddy_user') || 'null');

  // Ne pas afficher le header sur la page TV
  if (location.pathname === '/cuisine/tv') {
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('caddy_user');
    window.location.href = '/login';
  };

  // Fonction linkClass supprimée - utilisation de boutons simples maintenant

  return (
    <header className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50 w-3/4 max-w-6xl">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-90 backdrop-blur-xl shadow-2xl border border-gray-300 rounded-2xl px-8 py-2">
        <div className="flex items-center justify-between">
          
          {/* Logo Premium à gauche */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 hover:scale-105 transition-transform duration-300 group"
          >
            <div className="w-7 h-7 bg-white bg-opacity-25 rounded-lg flex items-center justify-center backdrop-blur-sm ring-1 ring-gray-300 group-hover:ring-white transition-all duration-300">
              <span className="text-white font-bold text-sm drop-shadow-sm">C</span>
            </div>
            <span className="text-lg font-bold text-white select-none drop-shadow-sm tracking-wide">Caddy</span>
          </button>

          {/* Navigation au centre */}
          <nav className="flex items-center space-x-5 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl px-4 py-1.5 shadow-lg border border-gray-300">
            <button 
              onClick={() => navigate('/logistique')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isLogistique 
                  ? 'bg-white bg-opacity-30 text-white shadow-lg' 
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
              style={{ color: 'white', fontSize: '14px' }}
            >
              Logistique
            </button>
            <button 
              onClick={() => navigate('/cuisine')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isCuisine 
                  ? 'bg-white bg-opacity-30 text-white shadow-lg' 
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
              style={{ color: 'white', fontSize: '14px' }}
            >
              Cuisine
            </button>
            <button 
              onClick={() => navigate('/secretariat')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isSecretariat 
                  ? 'bg-white bg-opacity-30 text-white shadow-lg' 
                  : 'text-white hover:bg-white hover:bg-opacity-20'
              }`}
              style={{ color: 'white', fontSize: '14px' }}
            >
              Secrétariat
            </button>
          </nav>

          {/* Section utilisateur à droite */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Bouton déconnexion */}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:bg-white hover:bg-opacity-20 hover:text-white border border-transparent hover:border-gray-300 transition-all duration-300 backdrop-blur-sm"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              /* Bouton connexion si pas connecté */
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white bg-opacity-20 text-white hover:bg-white hover:bg-opacity-30 border border-gray-300 hover:border-gray-200 transition-all duration-300 backdrop-blur-sm shadow-lg"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
        
        {/* Effet de brillance premium */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white to-transparent opacity-10 pointer-events-none"></div>
        
        {/* Effet de halo lumineux */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-30 rounded-2xl blur-lg -z-10"></div>
      </div>
    </header>
  );
};

export default MainHeader; 