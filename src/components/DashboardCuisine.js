import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  UserGroupIcon, 
  CalendarDaysIcon, 
  UserMinusIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import CuisineManagement from './CuisineManagement';
import AbsenceManagementCuisineAdvanced from './AbsenceManagementCuisineAdvanced';

import CuisinePlanningSimple from './CuisinePlanningSimple';

const DashboardCuisine = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const quickActions = [
    {
      title: 'Planning Cuisine',
      description: 'Organiser les plannings et les postes',
      icon: CalendarDaysIcon,
      color: 'from-blue-500 to-indigo-600',
      tab: 'planning'
    },
    {
      title: 'Gestion des Employés',
      description: 'Voir et gérer les profils des employés',
      icon: UserGroupIcon,
      color: 'from-indigo-500 to-violet-600',
      tab: 'employees'
    },
    {
      title: 'Gestion des Absences',
      description: 'Système avancé : 6 types, vue calendrier, statistiques',
      icon: UserMinusIcon,
      color: 'from-violet-500 to-purple-600',
      tab: 'absences'
    },
    {
      title: 'Planning Nettoyage',
      description: 'Répartir les employés dans les zones de nettoyage',
      icon: SparklesIcon,
      color: 'from-green-500 to-emerald-600',
      action: () => navigate('/cuisine/nettoyage')
    }
  ];

  const handleQuickAction = (action) => {
    if (action.action) {
      action.action();
    } else if (action.tab) {
      setActiveTab(action.tab);
    }
  };

  // Si un onglet spécifique est actif, afficher le composant correspondant
  if (activeTab === 'planning') {
    return <CuisinePlanningSimple user={user} onLogout={onLogout} />;
  }
  
  if (activeTab === 'employees') {
    return <CuisineManagement user={user} onLogout={onLogout} onReturnToDashboard={() => setActiveTab('dashboard')} />;
  }
  
  if (activeTab === 'absences') {
    return <AbsenceManagementCuisineAdvanced 
      user={user} 
      onLogout={onLogout} 
      onReturnToDashboard={() => setActiveTab('dashboard')}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* En-tête du module */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-3xl">🍽️</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Gestion Cuisine</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Gérez l'équipe cuisine, les plannings, les postes et les compétences culinaires.
          </p>
        </div>



        {/* Actions Rapides */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0.8, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 cursor-pointer group"
                onClick={() => handleQuickAction(action)}
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-r ${action.color} group-hover:shadow-lg transition-all duration-300`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-gray-600 text-sm">{action.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Accès rapide aux Modes TV */}
        <div className="mt-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-2">Modes TV</h3>
            <p className="text-purple-100">
              Affichage en temps réel des plannings pour les écrans de service
            </p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => window.open('/cuisine/tv','_blank')}
              className="flex-1 bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center justify-center space-x-2"
            >
              <ClockIcon className="w-5 h-5" />
              <span>Mode TV Planning</span>
            </button>
            
            <button
              onClick={() => window.open('/cuisine/nettoyage/tv','_blank')}
              className="flex-1 bg-white/20 text-white border border-white/30 px-6 py-3 rounded-lg font-medium hover:bg-white/30 transition-colors flex items-center justify-center space-x-2"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>Mode TV Nettoyage</span>
            </button>
          </div>
        </div>
      </div>


    </div>
  );
};

export default DashboardCuisine; 