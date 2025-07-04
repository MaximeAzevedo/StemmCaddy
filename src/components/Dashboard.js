import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  UserMinus,
  Clock,
  LogOut,
  ChefHatIcon
} from 'lucide-react';

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [stats] = useState({
    totalEmployees: 7,
    vehiclesActive: 5,
    planningCompliance: 92,
    absencesToday: 1
  });

  const quickActions = [
    {
      title: 'Gestion des Employés',
      description: 'Voir et gérer les profils des employés',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      path: '/employees'
    },
    {
      title: 'Planning des Équipes',
      description: 'Organiser et optimiser les plannings',
      icon: Calendar,
      color: 'from-green-500 to-green-600',
      path: '/planning'
    },
    {
      title: 'Gestion des Absences',
      description: 'Gérer les absences et indisponibilités',
      icon: UserMinus,
      color: 'from-red-500 to-red-600',
      path: '/absences'
    },
    {
      title: 'Module Cuisine',
      description: 'Gérer les équipes et planning cuisine',
      icon: ChefHatIcon,
      color: 'from-orange-500 to-red-600',
      path: '/cuisine'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'planning',
      message: 'Planning de la semaine généré automatiquement',
      time: 'Il y a 2 heures',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      id: 2,
      type: 'absence',
      message: 'Shadi déclaré absent (maladie)',
      time: 'Il y a 4 heures',
      icon: UserMinus,
      color: 'text-red-600'
    },
    {
      id: 3,
      type: 'employee',
      message: 'Nouveau employé Ahmad ajouté',
      time: 'Hier',
      icon: Users,
      color: 'text-green-600'
    }
  ];

  const handleQuickAction = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-xl font-bold text-white">C</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Caddy Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Bonjour, {user.name}</span>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-1" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-premium p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Employés</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Véhicules actifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.vehiclesActive}</p>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Conformité planning</p>
                <p className="text-2xl font-bold text-gray-900">{stats.planningCompliance}%</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Actions Rapides */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  className="card-premium p-6 cursor-pointer group"
                  onClick={() => handleQuickAction(action.path)}
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

          {/* Activité Récente */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Activité Récente</h2>
            <div className="card-premium p-6">
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className={`p-1 rounded ${activity.color}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <div className="flex items-center mt-1">
                        <Clock className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Planning du Jour */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Planning d'Aujourd'hui</h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card-premium p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {['CR 21', 'CR 23', 'Jumper', 'Ducato', 'Transit'].map((vehicle, index) => (
                <div key={vehicle} className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-2">{vehicle}</h3>
                  <div className="space-y-1">
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {vehicle === 'Transit' ? '6 personnes' : '3 personnes'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {vehicle === 'Transit' ? 'Formation' : 'Collecte'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 