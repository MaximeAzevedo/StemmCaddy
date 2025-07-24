import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  UserGroupIcon, 
  CalendarDaysIcon, 
  UserMinusIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import CuisineManagement from './CuisineManagement';
import AbsenceManagementCuisine from './AbsenceManagementCuisine';
import CuisineAIAssistant from './CuisineAIAssistant';
import CuisinePlanningInteractive from './CuisinePlanningInteractive';

const DashboardCuisine = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats] = useState({
    totalEmployees: 29,
    totalPostes: 9,
    absencesToday: 2
  });

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
      description: 'Gérer les absences et indisponibilités',
      icon: UserMinusIcon,
      color: 'from-violet-500 to-purple-600',
      tab: 'absences'
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
    return <CuisinePlanningInteractive user={user} onLogout={onLogout} />;
  }
  
  if (activeTab === 'employees') {
    return <CuisineManagement user={user} onLogout={onLogout} />;
  }
  
  if (activeTab === 'absences') {
    return <AbsenceManagementCuisine user={user} onLogout={onLogout} />;
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <UserGroupIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Employés cuisine</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CalendarDaysIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Postes cuisine</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPostes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <UserMinusIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Absences aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900">{stats.absencesToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Rapides */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
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

        {/* Accès rapide au Mode TV */}
        <div className="mt-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Mode TV Cuisine</h3>
              <p className="text-purple-100">
                Affichage en temps réel du planning cuisine pour les écrans de service
              </p>
            </div>
            <button
              onClick={() => window.open('/cuisine/tv','_blank')}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center space-x-2"
            >
              <ClockIcon className="w-5 h-5" />
              <span>Ouvrir Mode TV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assistant IA spécialisé Cuisine */}
      <CuisineAIAssistant />
    </div>
  );
};

export default DashboardCuisine; 