import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { ArrowLeft, Edit, Save, Star } from 'lucide-react';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import CuisinePlanningInteractive from './CuisinePlanningInteractive';

const CuisineManagement = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('planning');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États principaux
  const [postes, setPostes] = useState([]);
  const [employeesCuisine, setEmployeesCuisine] = useState([]);
  const [planning, setPlanining] = useState([]);
  const [creneaux, setCreneaux] = useState([]);

  /* ===== Nouveaux états pour fiche employé ===== */
  const [competencesMap, setCompetencesMap] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Dates de la semaine courante
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  // Navigation semaine
  const navigateWeek = (direction) => {
    setCurrentWeek(prev => addDays(prev, direction * 7));
  };

  // Chargement des données
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [postesResult, employeesResult, planningResult, creneauxResult, competencesResult] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getEmployeesCuisineWithCompetences(),
        supabaseCuisine.getPlanningCuisine(),
        supabaseCuisine.getCreneaux(),
        supabaseCuisine.getCompetencesCuisineSimple()
      ]);

      if (postesResult.error) throw postesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (planningResult.error) throw planningResult.error;
      if (creneauxResult.error) throw creneauxResult.error;
      if (competencesResult.error) throw competencesResult.error;

      setPostes(postesResult.data || []);
      setEmployeesCuisine(employeesResult.data || []);
      setPlanining(planningResult.data || []);
      setCreneaux(creneauxResult.data || []);

      // Construction map compétences { employeeId: [competence, ...] }
      const compMap = {};
      (competencesResult.data || []).forEach(c => {
        if (!compMap[c.employee_id]) compMap[c.employee_id] = [];
        compMap[c.employee_id].push(c);
      });
      setCompetencesMap(compMap);
    } catch (err) {
      console.error('Erreur chargement données cuisine:', err);
      setError('Erreur de chargement des données');
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Utilitaires pour le planning
  const getPlanningForDateAndCreneau = (date, creneau) => {
    return planning.filter(p => 
      p.date === format(date, 'yyyy-MM-dd') && 
      p.creneau === creneau.nom
    );
  };

  /* ====== Utilitaires fiche employé ====== */
  const getProfileColor = (profil) => {
    switch (profil) {
      case 'Faible': return 'bg-red-50 border-red-200 text-red-700';
      case 'Moyen': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'Fort': return 'bg-green-50 border-green-200 text-green-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const renderStars = (niveau) => {
    // Niveau: Débutant (1), Confirmé (2), Expert (3)
    const mapping = { 'Débutant': 1, 'Confirmé': 2, 'Expert': 3 };
    const count = mapping[niveau] || 0;
    const stars = [];
    for (let i = 0; i < 3; i++) {
      if (i < count) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return stars;
  };

  const getEmployeeCompetence = (employeeId, posteId) => {
    const comps = competencesMap[employeeId] || [];
    const comp = comps.find(c => c.poste_id === posteId);
    return comp || null;
  };

  const saveEmployee = () => {
    setEditMode(false);
    toast.success('Employé mis à jour avec succès (à implémenter)');
  };

  // Chargement initial
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du module Cuisine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Erreur de connexion !</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
          <button 
            onClick={loadAllData}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🍽️</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion Cuisine</h1>
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                <UserGroupIcon className="w-4 h-4" />
                <span>{employeesCuisine.length} employés</span>
                <span className="text-gray-400">•</span>
                <ChartBarIcon className="w-4 h-4" />
                <span>{postes.length} postes</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Connecté : {user?.email}</span>
              </div>
              <button
                onClick={onLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Déconnexion
              </button>
              <button
                onClick={() => window.open('/cuisine/tv','_blank')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >Mode TV</button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'planning', name: 'Planning', icon: ClockIcon },
              { id: 'employees', name: 'Employés', icon: UserGroupIcon },
              { id: 'competences', name: 'Compétences', icon: ChartBarIcon },
              { id: 'postes', name: 'Postes', icon: Cog6ToothIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'planning' && (
            <motion.div
              key="planning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <CuisinePlanningInteractive />
            </motion.div>
          )}

          {activeTab === 'employees' && (
            <motion.div
              key="employees"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Employés Cuisine</h2>
                <button
                  onClick={() => toast.info('Fonctionnalité en développement')}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Ajouter employé</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employeesCuisine.map(employeeCuisine => {
                  const employee = employeeCuisine.employee;
                  return (
                    <div key={employee.id} className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          {employeeCuisine.photo_url ? (
                            <img 
                              src={employeeCuisine.photo_url} 
                              alt={employee.nom}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <PhotoIcon className="w-6 h-6 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {employee.nom} {employee.prenom}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              employee.profil === 'Fort' ? 'bg-green-100 text-green-800' :
                              employee.profil === 'Moyen' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {employee.profil}
                            </span>
                            <span className="text-sm text-gray-500">
                              {employee.langues?.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Service:</span>
                          <span className="text-sm font-medium">{employeeCuisine.service}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Hygiène:</span>
                          <span className="text-sm font-medium">{employeeCuisine.niveau_hygiene}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Compétences:</span>
                          <span className="text-sm font-medium">
                            {employeeCuisine.competences_cuisine?.length || 0} postes
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-right text-orange-600">Clique pour voir la fiche ➜</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ===== Fiche employé cuisine ===== */}
          {selectedEmployee && (
            <motion.div
              key="employee-detail"
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-white z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => { setSelectedEmployee(null); setEditMode(false); }}
                      className="p-2 hover:bg-white/20 rounded-lg"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold">Fiche Employé Cuisine</h1>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {editMode ? 'Annuler' : 'Modifier'}
                    </button>
                    {editMode && (
                      <button
                        onClick={saveEmployee}
                        className="px-4 py-2 bg-white text-orange-600 hover:bg-gray-100 rounded-lg flex items-center"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Sauvegarder
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="max-w-4xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Info générales */}
                  <div className="lg:col-span-1">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
                      <h2 className="text-xl font-bold text-gray-900 mb-6">Informations Générales</h2>

                      {/* Photo */}
                      <div className="text-center mb-6">
                        <div className="w-32 h-32 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
                          {selectedEmployee.photo_url ? (
                            <img src={selectedEmployee.photo_url} alt={selectedEmployee.nom} className="w-32 h-32 rounded-full object-cover" />
                          ) : (
                            <span className="text-4xl font-bold text-orange-600">
                              {selectedEmployee.nom?.charAt(0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nom */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                        {editMode ? (
                          <input type="text" value={selectedEmployee.nom} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                        ) : (
                          <p className="text-lg font-semibold">{selectedEmployee.nom} {selectedEmployee.prenom}</p>
                        )}
                      </div>

                      {/* Profil */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Profil</label>
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getProfileColor(selectedEmployee.profil)}`}>
                          {selectedEmployee.profil}
                        </div>
                      </div>

                      {/* Hygiène */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Niveau Hygiène</label>
                        <p>{employeesCuisine.find(ec => ec.employee.id === selectedEmployee.id)?.niveau_hygiene || 'Base'}</p>
                      </div>

                      {/* Langues */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Langues parlées</label>
                        <div className="flex flex-wrap gap-2">
                          {(selectedEmployee.langues || []).map((langue, idx) => (
                            <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {langue}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compétences postes */}
                  <div className="lg:col-span-2">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
                      <h2 className="text-xl font-bold text-gray-900 mb-6">Compétences Postes</h2>

                      <div className="space-y-6">
                        {postes.map(poste => {
                          const competence = getEmployeeCompetence(selectedEmployee.id, poste.id);
                          return (
                            <div key={poste.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span>{poste.icone}</span>
                                  <h3 className="font-semibold text-lg" style={{ color: poste.couleur }}>{poste.nom}</h3>
                                </div>
                                <div className="flex items-center space-x-4">
                                  {competence ? (
                                    <div className="flex items-center space-x-1">{renderStars(competence.niveau)}</div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">Non formé</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Autres onglets à développer */}
          {(activeTab === 'competences' || activeTab === 'postes') && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center py-12"
            >
              <div className="text-gray-500">
                <h3 className="text-lg font-medium mb-2">
                  {activeTab === 'competences' ? 'Gestion des Compétences' : 'Gestion des Postes'}
                </h3>
                <p>Cette section sera développée prochainement...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default CuisineManagement; 