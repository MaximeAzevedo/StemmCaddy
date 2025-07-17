import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Users, Calendar, UserMinus, Settings } from 'lucide-react';

const Dashboard = ({ user, onLogout }) => {
  // Statistiques fictives (à remplacer par vos données réelles)
  const stats = {
    totalEmployees: 21,
    vehiclesActive: 5,
    absencesToday: 1
  };

  const quickActions = [
    {
      title: 'Gestion des Employés',
      description: 'Gérer les profils et compétences logistique',
      icon: Settings,
      color: 'from-purple-500 to-purple-600',
      onClick: () => window.location.assign('/logistique/gestion')
    },
    {
      title: 'Planning des Équipes',
      description: 'Créer et organiser les plannings avec IA',
      icon: Calendar,
      color: 'from-green-500 to-green-600',
      onClick: () => window.location.assign('/logistique/planning')
    },
    {
      title: 'Gestion des Absences',
      description: 'Gérer les absences et indisponibilités',
      icon: UserMinus,
      color: 'from-red-500 to-red-600',
      onClick: () => window.location.assign('/absences')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 pb-16">
      {/* Header central premium */}
      <div className="flex flex-col items-center pt-12 pb-6">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-xl">
          <Truck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 text-center">Gestion Logistique</h1>
        <p className="text-gray-500 text-lg text-center max-w-2xl mb-2">
          Gérez les équipes logistiques, les véhicules, les plannings et les absences.
        </p>
      </div>

      {/* Statistiques premium */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
            <Users className="w-7 h-7 text-blue-600" />
          </div>
          <p className="text-gray-500 font-medium mb-1">Employés total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
            <Truck className="w-7 h-7 text-green-600" />
          </div>
          <p className="text-gray-500 font-medium mb-1">Véhicules actifs</p>
          <p className="text-2xl font-bold text-gray-900">{stats.vehiclesActive}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
            <UserMinus className="w-7 h-7 text-red-600" />
          </div>
          <p className="text-gray-500 font-medium mb-1">Absences aujourd'hui</p>
          <p className="text-2xl font-bold text-gray-900">{stats.absencesToday}</p>
        </div>
      </div>

      {/* Actions Rapides premium */}
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.03 }}
              className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer group transition-all duration-300"
              onClick={action.onClick}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:shadow-lg transition-all duration-300`}>
                <action.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-gray-500 text-sm">{action.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 