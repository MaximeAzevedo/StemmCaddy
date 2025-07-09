import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PhotoIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { ArrowLeft, Edit, Save, Star } from 'lucide-react';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import { supabaseAPI } from '../lib/supabase';
import CuisinePlanningInteractive from './CuisinePlanningInteractive';
import AbsenceManagementCuisine from './AbsenceManagementCuisine';

const CuisineManagement = ({ user, onLogout }) => {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('planning');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États principaux
  const [postes, setPostes] = useState([]);
  const [employeesCuisine, setEmployeesCuisine] = useState([]);

  /* ===== Nouveaux états pour fiche employé ===== */
  const [competencesMap, setCompetencesMap] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // ===== Nouveaux états pour l'édition =====
  const [editedEmployeeCuisine, setEditedEmployeeCuisine] = useState(null);
  const [availableLanguages] = useState(['Français', 'Arabe', 'Anglais', 'Tigrinya', 'Perse', 'Turc', 'Yougoslave', 'Allemand', 'Créole', 'Luxembourgeois']);
  const [availableProfiles] = useState(['Faible', 'Moyen', 'Fort']);
  const [availableNiveauHygiene] = useState(['Base', 'Renforcé', 'Expert']);
  const [availableNiveauCompetence] = useState(['Débutant', 'Confirmé', 'Expert']);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [postesResult, employeesResult, competencesResult] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getEmployeesCuisineWithCompetences(),
        supabaseCuisine.getCompetencesCuisineSimple()
      ]);

      if (postesResult.error) throw postesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (competencesResult.error) throw competencesResult.error;

      setPostes(postesResult.data || []);
      setEmployeesCuisine(employeesResult.data || []);

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

  useEffect(() => {
    // Quand on sélectionne un employé, initialiser l'état d'édition
    if (selectedEmployee) {
      setEditedEmployee({ ...selectedEmployee });
      // Trouver l'employé cuisine correspondant
      const empCuisine = employeesCuisine.find(ec => ec.employee.id === selectedEmployee.id);
      if (empCuisine) {
        setEditedEmployeeCuisine({ ...empCuisine });
      }
    }
  }, [selectedEmployee, employeesCuisine]);

  // ===== Fonctions d'édition =====
  const handleEmployeeChange = (field, value) => {
    if (editedEmployee) {
      setEditedEmployee(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleEmployeeCuisineChange = (field, value) => {
    if (editedEmployeeCuisine) {
      setEditedEmployeeCuisine(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleLanguageToggle = (langue) => {
    if (editedEmployee) {
      const currentLangues = editedEmployee.langues || [];
      const newLangues = currentLangues.includes(langue)
        ? currentLangues.filter(l => l !== langue)
        : [...currentLangues, langue];
      
      setEditedEmployee(prev => ({
        ...prev,
        langues: newLangues
      }));
    }
  };

  const updateCompetencePoste = async (employeeId, posteId, niveau) => {
    try {
      // Trouver la compétence existante
      const currentCompetences = competencesMap[employeeId] || [];
      const existingCompetence = currentCompetences.find(c => c.poste_id === posteId);

      if (niveau === null || niveau === 'Aucun') {
        // Supprimer la compétence
        if (existingCompetence) {
          const result = await supabaseCuisine.deleteCompetenceCuisine(existingCompetence.id);
          if (result.error) {
            console.warn('⚠️ Erreur suppression compétence:', result.error);
            toast.warning('Compétence mise à jour localement (problème sauvegarde)');
          } else {
            toast.success('Compétence supprimée avec succès !');
          }
        }
        
        // Mise à jour locale
        setCompetencesMap(prev => ({
          ...prev,
          [employeeId]: currentCompetences.filter(c => c.poste_id !== posteId)
        }));
      } else {
        // Créer ou mettre à jour la compétence
        const competenceData = {
          employee_id: employeeId,
          poste_id: posteId,
          niveau: niveau,
          date_validation: new Date().toISOString().split('T')[0],
          formateur_id: user.id || 1 // Utilisateur actuel comme formateur
        };

        let result;
        if (existingCompetence) {
          result = await supabaseCuisine.updateCompetenceCuisine(existingCompetence.id, competenceData);
        } else {
          result = await supabaseCuisine.createCompetenceCuisine(competenceData);
        }

        if (result.error) {
          console.warn('⚠️ Erreur sauvegarde compétence:', result.error);
          toast.warning('Compétence mise à jour localement (problème sauvegarde)');
        } else {
          toast.success('Compétence mise à jour avec succès !');
        }

        // Mise à jour locale
        setCompetencesMap(prev => {
          const newMap = { ...prev };
          const updatedCompetence = {
            ...competenceData,
            id: result.data?.id || existingCompetence?.id || Date.now()
          };

          if (!newMap[employeeId]) {
            newMap[employeeId] = [];
          }

          const competenceIndex = newMap[employeeId].findIndex(c => c.poste_id === posteId);
          if (competenceIndex >= 0) {
            newMap[employeeId][competenceIndex] = updatedCompetence;
          } else {
            newMap[employeeId].push(updatedCompetence);
          }

          return newMap;
        });
      }
    } catch (error) {
      console.error('❌ Erreur updateCompetencePoste:', error);
      toast.error('Erreur lors de la mise à jour de la compétence');
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La taille de l\'image ne doit pas dépasser 5MB');
      return;
    }

    try {
      setPhotoUploading(true);
      
      // Convertir l'image en base64 pour stockage local
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Photo = e.target.result;
        
        try {
          // Mettre à jour l'employé édité avec la nouvelle photo
          if (editedEmployeeCuisine) {
            setEditedEmployeeCuisine(prev => ({
              ...prev,
              photo_url: base64Photo
            }));
          }
          
          // Si on n'est pas en mode édition, sauvegarder immédiatement
          if (!editMode && selectedEmployee) {
            try {
              const result = await supabaseCuisine.updateEmployeeCuisine(selectedEmployee.id, {
                photo_url: base64Photo
              });
              
              if (!result.error) {
                console.log('✅ Photo cuisine sauvegardée en base:', result.data);
                toast.success('Photo mise à jour avec succès !');
              } else {
                console.warn('⚠️ Erreur Supabase photo cuisine:', result.error);
                toast.success('Photo mise à jour localement (sauvegarde en cours...)');
              }
            } catch (dbError) {
              console.warn('⚠️ Base de données non accessible pour photo cuisine:', dbError);
              toast.success('Photo mise à jour localement (sauvegarde en cours...)');
            }
            
            // Mettre à jour l'état local
            setEmployeesCuisine(prev => 
              prev.map(empCuisine => 
                empCuisine.employee.id === selectedEmployee.id 
                  ? { ...empCuisine, photo_url: base64Photo }
                  : empCuisine
              )
            );
          } else {
            toast.success('Photo sélectionnée ! N\'oubliez pas de sauvegarder.');
          }
          
        } catch (error) {
          console.error('❌ Erreur traitement photo cuisine:', error);
          toast.error('Erreur lors du traitement de la photo');
        } finally {
          setPhotoUploading(false);
        }
      };
      
      reader.onerror = () => {
        toast.error('Erreur lors de la lecture du fichier');
        setPhotoUploading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('❌ Erreur upload photo cuisine:', error);
      toast.error('Erreur lors de l\'upload de la photo');
      setPhotoUploading(false);
    }
  };

  const triggerPhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const saveEmployee = async () => {
    if (!editedEmployee || !editedEmployeeCuisine) {
      toast.error('Données manquantes pour la sauvegarde');
      return;
    }

    try {
      // Sauvegarder les informations générales de l'employé
      const employeeResult = await supabaseAPI.updateEmployee(editedEmployee.id, {
        nom: editedEmployee.nom,
        prenom: editedEmployee.prenom,
        profil: editedEmployee.profil,
        langues: editedEmployee.langues || []
      });

      // Sauvegarder les informations spécifiques cuisine (y compris la photo)
      const cuisineResult = await supabaseCuisine.updateEmployeeCuisine(editedEmployee.id, {
        niveau_hygiene: editedEmployeeCuisine.niveau_hygiene,
        service: editedEmployeeCuisine.service,
        photo_url: editedEmployeeCuisine.photo_url
      });

      if (employeeResult.error || cuisineResult.error) {
        console.warn('⚠️ Erreurs sauvegarde:', { employeeResult, cuisineResult });
        toast.warning('Employé mis à jour localement (problème sauvegarde)');
      } else {
        toast.success('Employé sauvegardé avec succès !');
      }

      // Mettre à jour les états locaux
      setSelectedEmployee(editedEmployee);
      setEmployeesCuisine(prev => 
        prev.map(ec => 
          ec.employee.id === editedEmployee.id 
            ? { ...editedEmployeeCuisine, employee: editedEmployee }
            : ec
        )
      );

      setEditMode(false);
    } catch (error) {
      console.error('❌ Erreur saveEmployee:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const cancelEdit = () => {
    if (selectedEmployee) {
      setEditedEmployee({ ...selectedEmployee });
      const empCuisine = employeesCuisine.find(ec => ec.employee.id === selectedEmployee.id);
      if (empCuisine) {
        setEditedEmployeeCuisine({ ...empCuisine });
      }
    }
    setEditMode(false);
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
              { id: 'absences', name: 'Absences', icon: CalendarDaysIcon },
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
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center relative overflow-hidden">
                          {employeeCuisine.photo_url ? (
                            <img 
                              src={employeeCuisine.photo_url} 
                              alt={employee.nom}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-orange-600">
                              {employee.nom?.charAt(0) || '?'}
                            </span>
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
                  <div className="flex items-center space-x-2">
                    {editMode ? (
                      <>
                        <button
                          onClick={saveEmployee}
                          className="flex items-center space-x-2 bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors font-medium"
                        >
                          <Save className="w-5 h-5" />
                          <span>Sauvegarder</span>
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center space-x-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
                        >
                          <span>Annuler</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center space-x-2 bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors font-medium"
                      >
                        <Edit className="w-5 h-5" />
                        <span>Modifier</span>
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
                        <div className="w-32 h-32 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4 relative overflow-hidden">
                          {(() => {
                            const currentEmployeeCuisine = editedEmployeeCuisine || employeesCuisine.find(ec => ec.employee.id === selectedEmployee.id);
                            const photoUrl = currentEmployeeCuisine?.photo_url;
                            const employeeName = editedEmployee?.nom || selectedEmployee?.nom;
                            
                            if (photoUrl) {
                              return (
                                <img 
                                  src={photoUrl} 
                                  alt={employeeName} 
                                  className="w-32 h-32 rounded-full object-cover" 
                                />
                              );
                            } else {
                              return (
                                <span className="text-4xl font-bold text-orange-600">
                                  {employeeName?.charAt(0) || '?'}
                                </span>
                              );
                            }
                          })()}
                          {photoUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                        <button 
                          onClick={triggerPhotoUpload}
                          disabled={photoUploading}
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
                        >
                          <PhotoIcon className="w-4 h-4 mr-2" />
                          {photoUploading ? 'Upload en cours...' : 'Changer la photo'}
                        </button>
                      </div>

                      {/* Nom */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                        {editMode ? (
                          <input 
                            type="text" 
                            value={editedEmployee?.nom || ''} 
                            onChange={(e) => handleEmployeeChange('nom', e.target.value)} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                            placeholder="Nom de l'employé"
                          />
                        ) : (
                          <p className="text-lg font-semibold">{editedEmployee?.nom || selectedEmployee?.nom}</p>
                        )}
                      </div>

                      {/* Prénom */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                        {editMode ? (
                          <input 
                            type="text" 
                            value={editedEmployee?.prenom || ''} 
                            onChange={(e) => handleEmployeeChange('prenom', e.target.value)} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                            placeholder="Prénom de l'employé"
                          />
                        ) : (
                          <p className="text-lg font-semibold">{editedEmployee?.prenom || selectedEmployee?.prenom}</p>
                        )}
                      </div>

                      {/* Profil */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Profil</label>
                        {editMode ? (
                          <select
                            value={editedEmployee?.profil || ''}
                            onChange={(e) => handleEmployeeChange('profil', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          >
                            {availableProfiles.map(profil => (
                              <option key={profil} value={profil}>{profil}</option>
                            ))}
                          </select>
                        ) : (
                          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getProfileColor(editedEmployee?.profil || selectedEmployee?.profil)}`}>
                            {editedEmployee?.profil || selectedEmployee?.profil}
                          </div>
                        )}
                      </div>

                      {/* Niveau Hygiène */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Niveau Hygiène</label>
                        {editMode ? (
                          <select
                            value={editedEmployeeCuisine?.niveau_hygiene || 'Base'}
                            onChange={(e) => handleEmployeeCuisineChange('niveau_hygiene', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          >
                            {availableNiveauHygiene.map(niveau => (
                              <option key={niveau} value={niveau}>{niveau}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm">{editedEmployeeCuisine?.niveau_hygiene || employeesCuisine.find(ec => ec.employee.id === (editedEmployee?.id || selectedEmployee?.id))?.niveau_hygiene || 'Base'}</p>
                        )}
                      </div>

                      {/* Langues */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Langues parlées</label>
                        {editMode ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                            {availableLanguages.map(langue => (
                              <label key={langue} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={(editedEmployee?.langues || []).includes(langue)}
                                  onChange={() => handleLanguageToggle(langue)}
                                  className="mr-3 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                />
                                <span className="text-sm">{langue}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {((editedEmployee?.langues || selectedEmployee?.langues) || []).map((langue, idx) => (
                              <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                {langue}
                              </span>
                            ))}
                            {((editedEmployee?.langues || selectedEmployee?.langues) || []).length === 0 && (
                              <span className="text-gray-400 text-sm italic">Aucune langue renseignée</span>
                            )}
                          </div>
                        )}
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
                            <div key={poste.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <span className="text-2xl">{poste.icone}</span>
                                  <div>
                                    <h3 className="font-semibold text-lg" style={{ color: poste.couleur }}>{poste.nom}</h3>
                                    <p className="text-sm text-gray-500">{poste.description || 'Poste de cuisine'}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-4">
                                  {editMode ? (
                                    <div className="flex items-center space-x-3">
                                      <select
                                        value={competence?.niveau || 'Aucun'}
                                        onChange={(e) => updateCompetencePoste(selectedEmployee.id, poste.id, e.target.value === 'Aucun' ? null : e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                      >
                                        <option value="Aucun">Non formé</option>
                                        {availableNiveauCompetence.map(niveau => (
                                          <option key={niveau} value={niveau}>{niveau}</option>
                                        ))}
                                      </select>
                                      
                                      {/* Affichage visuel des étoiles */}
                                      <div className="flex items-center space-x-1">
                                        {renderStars(competence?.niveau || 'Aucun')}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      {competence ? (
                                        <>
                                          <div className="flex items-center space-x-1">{renderStars(competence.niveau)}</div>
                                          <span className="text-sm text-gray-600">({competence.niveau})</span>
                                          {competence.date_validation && (
                                            <span className="text-xs text-gray-400">
                                              Validé le {new Date(competence.date_validation).toLocaleDateString('fr-FR')}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-gray-400 text-sm">Non formé</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Informations supplémentaires en mode lecture */}
                              {!editMode && competence?.formateur_id && (
                                <div className="mt-2 text-xs text-gray-500">
                                  Formateur: {competence.formateur?.nom || 'Non spécifié'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Résumé des compétences */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total des compétences:</span>
                          <span className="font-medium">
                            {(competencesMap[selectedEmployee.id] || []).length} / {postes.length} postes
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${((competencesMap[selectedEmployee.id] || []).length / postes.length) * 100}%` 
                            }}
                          ></div>
                        </div>
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

          {activeTab === 'absences' && (
            <motion.div
              key="absences"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AbsenceManagementCuisine user={user} onLogout={onLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default CuisineManagement; 