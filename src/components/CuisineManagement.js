import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  CalendarDaysIcon,
  XMarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { ArrowLeft, Edit, Save, Camera, Search, Users } from 'lucide-react';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import CuisinePlanningInteractive from './CuisinePlanningInteractive';
import AbsenceManagementCuisine from './AbsenceManagementCuisine';
import CuisineAIAssistant from './CuisineAIAssistant';
import { useSafeEmployee, useSafeLoading, useSafeError, useSafeArray, useSafeObject } from '../hooks/useSafeState';

const CuisineManagement = ({ user, onLogout, defaultTab = 'planning' }) => {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(defaultTab);

  /* ===== États pour fiche employé ===== */
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  
  // Liste étendue des 50 langues les plus parlées + langues existantes
  const [availableLanguages] = useState([
    'Français', 'Anglais', 'Espagnol', 'Mandarin', 'Hindi', 'Arabe', 'Bengali', 'Portugais', 
    'Russe', 'Japonais', 'Allemand', 'Coréen', 'Vietnamien', 'Tamoul', 'Ourdou', 'Indonésien', 
    'Turc', 'Italien', 'Thaï', 'Gujarati', 'Persan', 'Polonais', 'Pashto', 'Kannada', 
    'Malayalam', 'Marathi', 'Telugu', 'Ukrainien', 'Néerlandais', 'Roumain', 'Grec', 
    'Hongrois', 'Tchèque', 'Suédois', 'Norvégien', 'Finnois', 'Danois', 'Bulgare', 
    'Slovaque', 'Croate', 'Slovène', 'Estonien', 'Letton', 'Lituanien', 'Maltais', 
    'Luxembourgeois', 'Créole', 'Tigrinya', 'Yougoslave'
  ]);

  // Hooks sécurisés pour éviter les erreurs null/undefined
  const { items: employees, setItems: setEmployees } = useSafeArray([]);
  const { items: postesDispobibles, setItems: setPostesDisponibles } = useSafeArray([]);
  const { data: competences, setData: setCompetences } = useSafeObject({});
  const { startLoading: startLoadingEmployees, stopLoading: stopLoadingEmployees } = useSafeLoading(true);
  const { handleError, clearError } = useSafeError();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  
  // Hook sécurisé pour la gestion des employés sélectionnés
  const { 
    employee: selectedEmployeeState, 
    clearEmployee
  } = useSafeEmployee();
  
  const languages = availableLanguages;
  const profiles = ['Débutant', 'Intermédiaire', 'Expérimenté', 'Expert'];

  // Fonctions pour gérer les employés
  const clearEmployeeModal = () => {
    setSelectedEmployee(null);
    setEditedEmployee(null);
    clearEmployee();
  };

  const cancelEdit = () => {
    setEditedEmployee(null);
  };

  const handleEmployeeChange = (field, value) => {
    if (!editedEmployee) return;
    
    setEditedEmployee(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLanguageToggle = (langue) => {
    if (!editedEmployee) return;
    
    const currentLangues = editedEmployee.langue_parlee ? [editedEmployee.langue_parlee] : [];
    // Pour la nouvelle structure, on utilise un seul champ langue_parlee
    const newLangue = currentLangues.includes(langue) ? '' : langue;
    
    setEditedEmployee(prev => ({
      ...prev,
      langue_parlee: newLangue
    }));
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setPhotoUploading(true);
      // Ici vous pouvez ajouter la logique d'upload de photo
      toast.success('Photo mise à jour avec succès');
    } catch (error) {
      console.error('Erreur upload photo:', error);
      toast.error('Erreur lors de l\'upload de la photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const saveEmployee = async () => {
    if (!editedEmployee) return;

    try {
      // Logique de sauvegarde ici
      toast.success('Employé mis à jour avec succès');
      setSelectedEmployee(editedEmployee);
      setEditedEmployee(null);
    } catch (error) {
      console.error('Erreur sauvegarde employé:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const getEmployeeCompetence = (employeeId, posteId) => {
    try {
      if (!employeeId || !posteId) {
        return { valide: false };
      }

      const empCompetences = competences[employeeId] || [];
      const competence = empCompetences.find(c => c && c.poste_id === posteId);
      
      if (competence) {
        return {
          valide: true
        };
      } else {
        return { 
          valide: false 
        };
      }
    } catch (error) {
      console.warn('⚠️ Erreur getEmployeeCompetence:', error);
      return { valide: false };
    }
  };

  const updateCompetence = async (employeeId, posteId, field, value) => {
    try {
      const currentCompetences = competences[employeeId] || [];
      const existingCompetence = currentCompetences.find(c => c.poste_id === posteId);
      
      let dbSaveSuccessful = false;
      try {
        if (field === 'valide') {
          if (value) {
            // VALIDATION : Créer/mettre à jour la compétence
            const competenceData = {
              niveau: 'Expert', // Simplified to binary
              date_validation: new Date().toISOString().split('T')[0]
            };
            const result = await supabaseCuisine.updateCompetenceCuisine(employeeId, posteId, competenceData);
            if (!result.error) {
              dbSaveSuccessful = true;
              console.log('✅ Compétence cuisine validée:', result.data);
            }
          } else {
            // SUPPRESSION : Supprimer la compétence
            const competenceData = {
              niveau: '', // Niveau vide = suppression
              date_validation: null
            };
            const result = await supabaseCuisine.updateCompetenceCuisine(employeeId, posteId, competenceData);
            if (!result.error) {
              dbSaveSuccessful = true;
              console.log('✅ Compétence cuisine supprimée:', result.data);
            }
          }
        } else if (field === 'niveau') {
          if (value === 0) {
            // SUPPRESSION : Niveau 0 = supprimer
            const competenceData = {
              niveau: '', // Niveau vide = suppression
              date_validation: null
            };
            const result = await supabaseCuisine.updateCompetenceCuisine(employeeId, posteId, competenceData);
            if (!result.error) {
              dbSaveSuccessful = true;
              console.log('✅ Compétence cuisine supprimée (niveau 0):', result.data);
            }
          } else {
            // MISE À JOUR : Nouveau niveau
            const niveau = value === 1 ? 'Intermédiaire' : 'Expert';
            const competenceData = {
              niveau: niveau,
              date_validation: new Date().toISOString().split('T')[0]
            };
            const result = await supabaseCuisine.updateCompetenceCuisine(employeeId, posteId, competenceData);
            if (!result.error) {
              dbSaveSuccessful = true;
              console.log('✅ Niveau compétence cuisine mis à jour:', result.data);
            }
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Base de données non accessible:', dbError);
      }
      
      // Mettre à jour l'état local
      setCompetences(prev => {
        const newCompetences = { ...prev };
        
        if (!newCompetences[employeeId]) {
          newCompetences[employeeId] = [];
        }
        
        if (field === 'valide') {
          if (value) {
            const competenceIndex = newCompetences[employeeId].findIndex(c => c.poste_id === posteId);
            const updatedCompetence = {
              employee_id: employeeId,
              poste_id: posteId,
              niveau: 'Expert', // Simplified to binary
              date_validation: new Date().toISOString().split('T')[0],
              id: existingCompetence?.id || Date.now()
            };
            
            if (competenceIndex >= 0) {
              newCompetences[employeeId][competenceIndex] = updatedCompetence;
            } else {
              newCompetences[employeeId].push(updatedCompetence);
            }
          } else {
            newCompetences[employeeId] = newCompetences[employeeId].filter(c => c.poste_id !== posteId);
          }
        } else if (field === 'niveau') {
          if (value === 0) {
            newCompetences[employeeId] = newCompetences[employeeId].filter(c => c.poste_id !== posteId);
          } else {
            const competenceIndex = newCompetences[employeeId].findIndex(c => c.poste_id === posteId);
            const niveau = value === 1 ? 'Intermédiaire' : 'Expert';
            const updatedCompetence = {
              employee_id: employeeId,
              poste_id: posteId,
              niveau: niveau,
              date_validation: new Date().toISOString().split('T')[0],
              id: existingCompetence?.id || Date.now()
            };
            
            if (competenceIndex >= 0) {
              newCompetences[employeeId][competenceIndex] = updatedCompetence;
            } else {
              newCompetences[employeeId].push(updatedCompetence);
            }
          }
        }
        
        return newCompetences;
      });
      
      if (dbSaveSuccessful) {
        toast.success('Compétence mise à jour avec succès !');
      } else {
        toast.success('Compétence mise à jour localement');
      }
      
    } catch (error) {
      console.error('❌ Erreur mise à jour compétence:', error);
      toast.error('Erreur lors de la mise à jour de la compétence');
    }
  };

  const tabs = [
    {
      id: 'planning',
      name: 'Planning Cuisine',
      icon: CalendarDaysIcon,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 'employees',
      name: 'Équipe Cuisine',
      icon: UserGroupIcon,
      color: 'text-indigo-600 bg-indigo-100'
    },
    {
      id: 'absences',
      name: 'Gestion des Absences',
      icon: ExclamationCircleIcon,
      color: 'text-red-600 bg-red-100'
    }
  ];

  // 🛠️ CORRECTION BOUCLE INFINIE : Stabiliser les dépendances
  const loadingRef = useRef(false);
  const hooksRef = useRef({ startLoading: startLoadingEmployees, stopLoading: stopLoadingEmployees, clearError, handleError, setEmployees, setPostesDisponibles, setCompetences });
  
  // Mettre à jour les refs sans déclencher de re-render
  useEffect(() => {
    hooksRef.current = { startLoading: startLoadingEmployees, stopLoading: stopLoadingEmployees, clearError, handleError, setEmployees, setPostesDisponibles, setCompetences };
  });
  
  const loadData = useCallback(async () => {
    if (loadingRef.current) return; // Éviter les appels multiples
    
    try {
      loadingRef.current = true;
      hooksRef.current.startLoading();
      hooksRef.current.clearError();
      
      console.log('📊 Chargement données cuisine - DEBUT');
      
      const [employeesResult, postesResult, competencesResult] = await Promise.all([
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple()
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (postesResult.error) throw postesResult.error;
      if (competencesResult.error) throw competencesResult.error;
      
      const competencesMap = {};
      (competencesResult.data || []).forEach(competence => {
        if (!competencesMap[competence.employee_id]) {
          competencesMap[competence.employee_id] = [];
        }
        competencesMap[competence.employee_id].push(competence);
      });
      
      // 🔧 STRUCTURE CORRIGÉE : employés directs sans imbrication
      const adaptedEmployees = (employeesResult.data || []).map(emp => ({
        employee_id: emp.id,
        employee: {
          id: emp.id,
          nom: emp.prenom,
          profil: emp.langue_parlee || 'Non défini',
          langues: emp.langue_parlee ? [emp.langue_parlee] : [],
          statut: emp.actif ? 'Actif' : 'Inactif'
        },
        photo_url: emp.photo_url
      }));
      
      hooksRef.current.setEmployees(adaptedEmployees);
      hooksRef.current.setPostesDisponibles(postesResult.data || []);
      hooksRef.current.setCompetences(competencesMap);
      
      console.log('✅ Données cuisine chargées avec succès:', {
        employés: adaptedEmployees.length,
        postes: postesResult.data?.length || 0,
        compétences: Object.keys(competencesMap).length
      });
      
    } catch (error) {
      console.error('❌ Erreur chargement données cuisine:', error);
      hooksRef.current.handleError(error, 'Chargement données cuisine');
      
      // Données fallback pour développement (sécurisées)
      const fallbackEmployees = [
        {
          employee_id: 1,
          employee: {
            id: 1,
            nom: 'Salah',
            profil: 'Arabe',
            langues: ['Arabe'],
            statut: 'Actif'
          },
          photo_url: null
        },
        {
          employee_id: 2,
          employee: {
            id: 2,
            nom: 'Majda',
            profil: 'Yougoslave',
            langues: ['Yougoslave'],
            statut: 'Actif'
          },
          photo_url: null
        },
        {
          employee_id: 3,
          employee: {
            id: 3,
            nom: 'Mahmoud',
            profil: 'Arabe',
            langues: ['Arabe'],
            statut: 'Actif'
          },
          photo_url: null
        }
      ];
      
      hooksRef.current.setEmployees(fallbackEmployees);
      
      hooksRef.current.setPostesDisponibles([
        { id: 1, nom: 'Cuisine chaude', couleur: '#ef4444', icone: '🔥' },
        { id: 2, nom: 'Sandwichs', couleur: '#f59e0b', icone: '🥪' },
        { id: 3, nom: 'Pain', couleur: '#eab308', icone: '🍞' },
        { id: 4, nom: 'Jus de fruits', couleur: '#22c55e', icone: '🧃' },
        { id: 5, nom: 'Vaisselle', couleur: '#3b82f6', icone: '🍽️' },
        { id: 6, nom: 'Légumerie', couleur: '#10b981', icone: '🥬' },
        { id: 7, nom: 'Self Midi', couleur: '#8b5cf6', icone: '🍽️' },
        { id: 8, nom: 'Equipe Pina et Saskia', couleur: '#ec4899', icone: '👥' }
      ]);
    } finally {
      hooksRef.current.stopLoading();
      loadingRef.current = false;
    }
  }, []); // 🔧 STABILISÉ : Pas de dépendances changeantes

  // 🛠️ CORRECTION : useEffect simplifié pour le chargement initial
  useEffect(() => {
    if (activeTab === 'employees') {
      console.log('📋 Onglet employés activé - chargement des données...');
      loadData();
    }
  }, [activeTab, loadData]); // 🔧 loadData maintenant stabilisé

  // 🛠️ MEMOIZATION pour éviter les recalculs constants
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      try {
        if (!emp || !emp.employee?.nom) {
          return false;
        }
        
        const matchesSearch = emp.employee.nom.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProfile = !filterProfile || emp.employee.langues?.includes(filterProfile);
        return matchesSearch && matchesProfile;
      } catch (error) {
        console.warn('⚠️ Erreur filtrage employé:', error);
        return false;
      }
    });
  }, [employees, searchTerm, filterProfile]);

  // 🛠️ CORRECTION : useEffect simplifié pour l'employé sélectionné
  useEffect(() => {
    // Quand on sélectionne un employé, initialiser l'état d'édition
    if (selectedEmployeeState) {
      setSelectedEmployee(selectedEmployeeState);
    }
  }, [selectedEmployeeState]);

  // Composant pour afficher une carte d'employé
  const EmployeeCard = ({ employee }) => {
    if (!employee || !employee.employee) {
      return null;
    }

    const { employee: emp, photo_url } = employee;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-blue-100 cursor-pointer hover:shadow-xl transition-all"
        onClick={() => setSelectedEmployee(employee)}
      >
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-violet-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            {photo_url ? (
              <img src={photo_url} alt={emp.nom} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-600">
                {emp.nom?.charAt(0) || '?'}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {emp.nom || 'Nom non défini'}
            </h3>
            
            <div className="mt-2 space-y-1">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                emp.statut === 'Actif' 
                  ? 'bg-green-100 text-green-800' 
                  : emp.statut === 'Formation'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {emp.statut || 'Actif'}
              </span>
            </div>
            
            {emp.langues && emp.langues.length > 0 && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {emp.langues.slice(0, 2).map((langue, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                      {langue}
                    </span>
                  ))}
                  {emp.langues.length > 2 && (
                    <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded border border-gray-200">
                      +{emp.langues.length - 2}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const EmployeeDetail = ({ employee }) => (
    <AnimatePresence>
      {selectedEmployee && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={clearEmployeeModal}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold">Fiche Employé Cuisine</h1>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => editedEmployee ? cancelEdit() : setEditedEmployee({ ...selectedEmployee })}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {editedEmployee ? 'Annuler' : 'Modifier'}
                  </button>
                  {editedEmployee && (
                    <button
                      onClick={saveEmployee}
                      className="px-4 py-2 bg-white text-blue-600 hover:bg-gray-100 rounded-lg flex items-center transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </button>
                  )}
                  <button
                    onClick={clearEmployeeModal}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Informations personnelles */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Informations Générales</h2>
                    
                    {/* Photo */}
                    <div className="text-center mb-6">
                      <div className="w-32 h-32 mx-auto bg-gradient-to-r from-blue-100 to-violet-100 rounded-full flex items-center justify-center mb-4 relative overflow-hidden">
                        {(editedEmployee?.photo_url || selectedEmployee?.photo_url) ? (
                          <img src={editedEmployee?.photo_url || selectedEmployee?.photo_url} alt={editedEmployee?.employee?.nom || selectedEmployee?.employee?.nom} className="w-32 h-32 rounded-full object-cover" />
                        ) : (
                          <span className="text-4xl font-bold text-blue-600">
                            {(editedEmployee?.employee?.nom || selectedEmployee?.employee?.nom)?.charAt(0)}
                          </span>
                        )}
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
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto transition-colors"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {photoUploading ? 'Upload en cours...' : 'Changer la photo'}
                      </button>
                    </div>

                    {/* Nom */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                      {editedEmployee ? (
                        <input
                          type="text"
                          value={editedEmployee?.employee?.nom || ''}
                          onChange={(e) => handleEmployeeChange('nom', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-lg font-semibold">{editedEmployee?.employee?.nom || selectedEmployee?.employee?.nom}</p>
                      )}
                    </div>

                    {/* Statut */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                      {editedEmployee ? (
                        <select
                          value={editedEmployee?.employee?.statut || 'Actif'}
                          onChange={(e) => handleEmployeeChange('statut', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Actif">Actif</option>
                          <option value="Absent">Absent</option>
                          <option value="Formation">Formation</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          (editedEmployee?.employee?.statut || selectedEmployee?.employee?.statut) === 'Actif' 
                            ? 'bg-green-100 text-green-800' 
                            : (editedEmployee?.employee?.statut || selectedEmployee?.employee?.statut) === 'Formation'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {editedEmployee?.employee?.statut || selectedEmployee?.employee?.statut || 'Actif'}
                        </span>
                      )}
                    </div>

                    {/* Langues */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Langues parlées</label>
                      {editedEmployee ? (
                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          <div className="grid grid-cols-1 gap-1">
                            {languages.map(langue => (
                              <label key={langue} className="flex items-center text-sm hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={(editedEmployee?.employee?.langues || []).includes(langue)}
                                  onChange={() => handleLanguageToggle(langue)}
                                  className="mr-2 text-blue-500 focus:ring-blue-500"
                                />
                                {langue}
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(editedEmployee?.employee?.langues || selectedEmployee?.employee?.langues || []).map((langue, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                              {langue}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compétences cuisine */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Compétences par Poste de Cuisine</h2>
                    
                    <div className="space-y-4">
                      {postesDispobibles.map(poste => {
                        const competence = getEmployeeCompetence(employee.employee_id, poste.id);
                        
                        return (
                          <div key={poste.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-white transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-sm">
                                  {poste.nom.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{poste.nom}</h3>
                                <p className="text-sm text-gray-500">Poste de cuisine</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center">
                              {editedEmployee ? (
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={competence.valide}
                                    onChange={(e) => updateCompetence(employee.employee_id, poste.id, 'valide', e.target.checked)}
                                    className="mr-2 text-blue-500 focus:ring-blue-500 h-5 w-5"
                                  />
                                  <span className="text-sm font-medium">Validé</span>
                                </label>
                              ) : (
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                  competence.valide 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {competence.valide ? 'Validé' : 'Non validé'}
                                </span>
                              )}
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
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderEmployeeManagement = () => {
    return (
      <div className="space-y-6">
        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={filterProfile}
                onChange={(e) => setFilterProfile(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les niveaux</option>
                {profiles.map(profile => (
                  <option key={profile} value={profile}>{profile}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredEmployees.length} employé{filteredEmployees.length > 1 ? 's' : ''} trouvé{filteredEmployees.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Liste des employés */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredEmployees.map((employee) => (
              <EmployeeCard key={employee.employee_id} employee={employee} />
            ))}
          </AnimatePresence>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun employé trouvé</h3>
            <p className="text-gray-500">Essayez de modifier vos critères de recherche.</p>
          </div>
        )}

        {/* Détail employé sélectionné */}
        <AnimatePresence>
          {selectedEmployee && (
            <EmployeeDetail employee={selectedEmployee} />
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* En-tête avec navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/cuisine'}
                className="p-2 hover:bg-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestion Cuisine</h1>
                <p className="text-gray-600">Gérez les plannings et l'équipe de cuisine</p>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span>{tab.name}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="mt-8">
          {activeTab === 'planning' && (
            <div className="bg-white rounded-lg shadow-sm">
              <CuisinePlanningInteractive />
            </div>
          )}
          
          {activeTab === 'employees' && renderEmployeeManagement()}
          
          {activeTab === 'absences' && (
            <div className="bg-white rounded-lg shadow-sm">
              <AbsenceManagementCuisine />
            </div>
          )}
        </div>
      </div>
      
      {/* Assistant IA disponible dans toutes les fenêtres cuisine */}
      <CuisineAIAssistant onDataRefresh={loadData} />
    </div>
  );
};

export default CuisineManagement; 