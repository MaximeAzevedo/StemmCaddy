import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const MainHeader = () => {
  const location = useLocation();
  const isCuisine = location.pathname.startsWith('/cuisine');
  const isLogistique = location.pathname.startsWith('/logistique');
  const isSecretariat = location.pathname.startsWith('/secretariat');
  const navigate = useNavigate();

  // Ne pas afficher le header sur la page TV
  if (location.pathname === '/cuisine/tv') {
    return null;
  }

  const linkClass = (active) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 backdrop-blur-sm ${
      active
        ? 'bg-white/30 text-white shadow-lg ring-2 ring-white/40 border border-white/20'
        : 'text-white/90 hover:bg-white/20 hover:text-white border border-transparent hover:border-white/20'
    }`;

  return (
    <header className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50 w-auto max-w-5xl">
      <div className="bg-gradient-to-r from-blue-600/80 via-indigo-600/85 to-purple-600/80 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl px-12 py-2">
        <div className="flex items-center justify-between space-x-20">
          {/* Logo Premium Compact */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 hover:scale-105 transition-transform duration-300 group"
          >
            <div className="w-7 h-7 bg-white/25 rounded-lg flex items-center justify-center backdrop-blur-sm ring-1 ring-white/30 group-hover:ring-white/50 transition-all duration-300">
              <span className="text-white font-bold text-sm drop-shadow-sm">C</span>
            </div>
            <span className="text-lg font-bold text-white select-none drop-shadow-sm tracking-wide">Caddy</span>
          </button>

          {/* Services Premium Compacts */}
          <nav className="flex items-center space-x-5 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-1.5 shadow-lg border border-white/20">
            <NavLink 
              to="/logistique" 
              className={({ isActive }) => linkClass(isLogistique || isActive)}
            >
              Logistique
            </NavLink>
            <NavLink 
              to="/cuisine" 
              className={({ isActive }) => linkClass(isCuisine || isActive)}
            >
              Cuisine
            </NavLink>
            <NavLink 
              to="/secretariat" 
              className={({ isActive }) => linkClass(isSecretariat || isActive)}
            >
              Secrétariat
            </NavLink>
          </nav>
        </div>
        
        {/* Effet de brillance premium */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-60 pointer-events-none"></div>
        
        {/* Effet de halo lumineux */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-2xl blur-lg opacity-70 -z-10"></div>
      </div>
    </header>
  );
};

export default MainHeader; 