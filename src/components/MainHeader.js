import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const MainHeader = () => {
  const location = useLocation();
  const isCuisine = location.pathname.startsWith('/cuisine');
  const isLogistique = location.pathname.startsWith('/logistique');
  const isSecretariat = location.pathname.startsWith('/secretariat');
  const navigate = useNavigate();

  const linkClass = (active) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active
        ? 'bg-orange-600 text-white shadow'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="text-lg font-bold text-gray-800 select-none">Caddy</span>
        </button>

        {/* Services */}
        <nav className="flex items-center space-x-2">
          <NavLink to="/logistique" className={({ isActive }) => linkClass(isLogistique && isActive)}>
            Logistique
          </NavLink>
          <NavLink to="/cuisine" className={({ isActive }) => linkClass(isCuisine && isActive)}>
            Cuisine
          </NavLink>
          <NavLink to="/secretariat" className={({ isActive }) => linkClass(isSecretariat && isActive)}>
            Secrétariat
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default MainHeader; 