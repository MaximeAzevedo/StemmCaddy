import React from 'react';
import { 
  DocumentTextIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const SecretariatManagement = ({ user, onLogout }) => {
  const quickActions = [
    {
      title: 'Gestion des Documents',
      description: 'Gérer les documents administratifs',
      icon: DocumentTextIcon,
      color: 'from-green-500 to-green-600',
      action: () => console.log('Documents - En développement')
    },
    {
      title: 'Registres du Personnel',
      description: 'Consulter les dossiers employés',
      icon: UsersIcon,
      color: 'from-blue-500 to-blue-600',
      action: () => console.log('Personnel - En développement')
    },
    {
      title: 'Rapports & Suivi',
      description: 'Générer des rapports administratifs',
      icon: ClipboardDocumentListIcon,
      color: 'from-purple-500 to-purple-600',
      action: () => console.log('Rapports - En développement')
    },
    {
      title: 'Archives',
      description: 'Consulter les archives administratives',
      icon: ArchiveBoxIcon,
      color: 'from-gray-500 to-gray-600',
      action: () => console.log('Archives - En développement')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <DocumentTextIcon className="w-8 h-8 text-green-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Gestion Secrétariat</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{user?.email}</span>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête du module */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Module Secrétariat
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Gérez l'administration, les documents et le suivi administratif de l'équipe.
          </p>
        </div>

        {/* Actions Rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <div
              key={action.title}
              onClick={action.action}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 cursor-pointer group hover:-translate-y-1"
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${action.color} group-hover:shadow-lg transition-all duration-300`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-gray-600 text-sm">{action.description}</p>
            </div>
          ))}
        </div>

        {/* Message temporaire */}
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg mr-3">
              <DocumentTextIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Module en développement</h3>
              <p className="text-yellow-700 mt-1">
                Le module Secrétariat est actuellement en cours de développement. 
                Les fonctionnalités seront ajoutées prochainement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretariatManagement; 