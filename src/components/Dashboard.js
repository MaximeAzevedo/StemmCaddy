import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  UserMinus,
  LogOut,
  Truck
} from 'lucide-react';
import EmployeeManagement from './EmployeeManagement';
import PlanningView from './PlanningView';
import AbsenceManagement from './AbsenceManagement';

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats] = useState({
    totalEmployees: 7,
    vehiclesActive: 5,
    absencesToday: 1
  });

  const quickActions = [
    {
      title: 'Gestion des Employés',
      description: 'Voir et gérer les profils des employés',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      tab: 'employees'
    },
    {
      title: 'Planning des Équipes',
      description: 'Organiser et optimiser les plannings',
      icon: Calendar,
      color: 'from-green-500 to-green-600',
      tab: 'planning'
    },
    {
      title: 'Gestion des Absences',
      description: 'Gérer les absences et indisponibilités',
      icon: UserMinus,
      color: 'from-red-500 to-red-600',
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
  if (activeTab === 'employees') {
    return <EmployeeManagement user={user} onLogout={onLogout} />;
  }
  
  if (activeTab === 'planning') {
    return <PlanningView user={user} onLogout={onLogout} />;
  }
  
  if (activeTab === 'absences') {
    return <AbsenceManagement user={user} onLogout={onLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <Truck className="w-5 h-5" />
              </button>
              <Truck className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Gestion Logistique</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{user.email}</span>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-premium p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Employés total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Véhicules actifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.vehiclesActive}</p>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <UserMinus className="w-6 h-6 text-red-600" />
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
          <h2 className="text-xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.02 }}
                className="card-premium p-6 cursor-pointer group"
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
      </div>
    </div>
  );
};

export default Dashboard; 