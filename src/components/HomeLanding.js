import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TruckIcon } from '@heroicons/react/24/solid';
import { FireIcon } from '@heroicons/react/24/solid';
import { DocumentTextIcon } from '@heroicons/react/24/solid';

const Card = ({ title, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-8 rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br ${color} text-white w-full sm:w-64 lg:w-72`}
  >
    <Icon className="w-16 h-16 mb-4" />
    <span className="text-2xl font-bold tracking-wide">{title}</span>
  </button>
);

const HomeLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center pt-20 px-4">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-12 text-center">
        Bienvenue sur la plateforme interne <span className="text-orange-600">Caddy</span>
      </h1>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        <Card
          title="Logistique"
          icon={TruckIcon}
          color="from-blue-600 to-indigo-600"
          onClick={() => navigate('/logistique')}
        />
        <Card
          title="Cuisine"
          icon={FireIcon}
          color="from-orange-500 to-red-500"
          onClick={() => navigate('/cuisine')}
        />
        <Card
          title="Secrétariat"
          icon={DocumentTextIcon}
          color="from-green-500 to-emerald-600"
          onClick={() => navigate('/secretariat')}
        />
      </div>

      <p className="mt-16 max-w-xl text-center text-gray-500">
        Choisissez votre module pour gérer les équipes, les compétences et le planning.
      </p>
    </div>
  );
};

export default HomeLanding; 