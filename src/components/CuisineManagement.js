import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  ClockIcon,
  PhotoIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { ArrowLeft, Edit, Save } from 'lucide-react';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import { supabaseAPI } from '../lib/supabase';
import CuisinePlanningInteractive from './CuisinePlanningInteractive';
import AbsenceManagementCuisine from './AbsenceManagementCuisine';
import CuisineAIAssistant from './CuisineAIAssistant';

const CuisineManagement = ({ user, onLogout, defaultTab = 'planning' }) => {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
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

  // Définition de loadAllData AVANT le useEffect
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

  // Chargement initial
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // NOUVEAU: Initialiser les données d'édition quand on sélectionne un employé
  useEffect(() => {
    if (selectedEmployee) {
      setEditedEmployee({ ...selectedEmployee });
      // Trouver l'employé cuisine correspondant
      const empCuisine = employeesCuisine.find(ec => ec.employee.id === selectedEmployee.id);
      if (empCuisine) {
        setEditedEmployeeCuisine({ ...empCuisine });
      }
    }
  }, [selectedEmployee, employeesCuisine]);

  /* ====== Utilitaires fiche employé ====== */
  const getProfileColor = (profil) => {
    switch (profil) {
      case 'Faible': return 'bg-red-50 border-red-200 text-red-700';
      case 'Moyen': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'Fort': return 'bg-green-50 border-green-200 text-green-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getEmployeeCompetence = (employeeId, posteId) => {
    const comps = competencesMap[employeeId] || [];
    const comp = comps.find(c => c.poste_id === posteId);
    return comp || null;
  };

  // useEffect(() => {
  //   // Quand on sélectionne un employé, initialiser l'état d'édition
  //   if (selectedEmployee) {
  //     setEditedEmployee({ ...selectedEmployee });
  //     // Trouver l'employé cuisine correspondant
  //     const empCuisine = employeesCuisine.find(ec => ec.employee.id === selectedEmployee.id);
  //     if (empCuisine) {
  //       setEditedEmployeeCuisine({ ...empCuisine });
  //     }
  //   }
  // }, [selectedEmployee, employeesCuisine]);

  // ===== Fonctions d'édition =====
  const handleEmployeeChange = (field, value) => {
    if (editedEmployee) {
      setEditedEmployee(prev => ({
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

  const updateCompetencePoste = async (employeeId, posteId, isFormé) => {
    try {
      // Trouver la compétence existante
      const currentCompetences = competencesMap[employeeId] || [];
      const existingCompetence = currentCompetences.find(c => c.poste_id === posteId);

      if (!isFormé) {
        // Supprimer la compétence
        if (existingCompetence) {
          const result = await supabaseCuisine.deleteCompetenceCuisine(existingCompetence.id);
          if (result.error) {
            console.warn('⚠️ Erreur suppression compétence (base de données):', result.error);
            // Ne pas afficher d'erreur si la mise à jour locale fonctionne
          } else {
            console.log('✅ Compétence supprimée en base de données');
          }
        }
        
        // Mise à jour locale (toujours effectuée)
        setCompetencesMap(prev => ({
          ...prev,
          [employeeId]: currentCompetences.filter(c => c.poste_id !== posteId)
        }));
        
        toast.success('Compétence supprimée');
      } else {
        // Créer ou mettre à jour la compétence
        const competenceData = {
          employee_id: employeeId,
          poste_id: posteId,
          niveau: 'Formé',
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
          console.warn('⚠️ Erreur sauvegarde compétence (base de données):', result.error);
          // Ne pas afficher d'erreur si la mise à jour locale fonctionne
        } else {
          console.log('✅ Compétence sauvegardée en base de données');
        }

        // Mise à jour locale (toujours effectuée)
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
        
        toast.success('Employé formé sur ce poste');
      }
    } catch (error) {
      console.error('❌ Erreur updateCompetencePoste:', error);
      // Seulement afficher une erreur si quelque chose de vraiment grave s'est passé
      toast.error('Erreur technique - contactez l\'administrateur');
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📸 Début sélection photo:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      maxSize: 5 * 1024 * 1024
    });

    // Types de fichiers acceptés
    const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!acceptedTypes.includes(file.type.toLowerCase())) {
      toast.error('Format non supporté. Utilisez JPG, PNG, GIF ou WebP');
      return;
    }

    // Vérifier la taille du fichier (max 10MB au lieu de 5MB)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB au lieu de 5MB
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (maxSizeBytes / 1024 / 1024).toFixed(2);
    
    console.log('🔍 Validation taille:', {
      'Taille fichier (bytes)': file.size,
      'Taille fichier (MB)': fileSizeMB,
      'Limite max (bytes)': maxSizeBytes,
      'Limite max (MB)': maxSizeMB,
      'Valide': file.size <= maxSizeBytes
    });
    
    if (file.size > maxSizeBytes) {
      const errorMsg = `Fichier trop volumineux: ${fileSizeMB}MB > ${maxSizeMB}MB autorisés`;
      console.error('❌ Validation taille échouée:', errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setPhotoUploading(true);
      
      // Recadrage automatique simple et rapide
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Canvas pour recadrage automatique centré
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Taille finale fixe
          canvas.width = 200;
          canvas.height = 200;
          
          // Calculer le recadrage centré
          const minDimension = Math.min(img.width, img.height);
          const cropX = (img.width - minDimension) / 2;
          const cropY = (img.height - minDimension) / 2;
          
          // Dessiner l'image recadrée
          ctx.drawImage(
            img,
            cropX, cropY, minDimension, minDimension,
            0, 0, 200, 200
          );
          
          // Convertir en base64
          const croppedBase64 = canvas.toDataURL('image/png', 0.9);
          
          // Sauvegarder directement
          saveEditedPhoto(croppedBase64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ Erreur traitement photo:', error);
      toast.error('Erreur lors du traitement de la photo');
      setPhotoUploading(false);
    }
  };

  // Fonction pour sauvegarder la photo éditée
  const saveEditedPhoto = async (base64Photo) => {
    try {
      setPhotoUploading(true);
      console.log('💾 Sauvegarde photo éditée...');
      
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
            console.log('✅ Photo cuisine sauvegardée en base');
            toast.success('Photo mise à jour avec succès !');
          } else {
            console.warn('⚠️ Erreur Supabase photo cuisine:', result.error);
            toast.success('Photo mise à jour localement');
          }
        } catch (dbError) {
          console.warn('⚠️ Base de données non accessible pour photo cuisine:', dbError);
          toast.success('Photo mise à jour localement');
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
        toast.success('Photo éditée ! N\'oubliez pas de sauvegarder.');
      }
      
      // Fermer l'éditeur
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde photo éditée:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
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

      // Sauvegarder les informations spécifiques cuisine (photo uniquement)
      const cuisineResult = await supabaseCuisine.updateEmployeeCuisine(editedEmployee.id, {
        service: editedEmployeeCuisine.service,
        photo_url: editedEmployeeCuisine.photo_url
      });

      if (employeeResult.error || cuisineResult.error) {
        console.warn('⚠️ Erreurs sauvegarde:', { employeeResult, cuisineResult });
        toast.error('Employé mis à jour localement (problème sauvegarde)');
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => window.history.back()}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
                title="Retour"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-2xl mr-3">🍽️</span>
              <h1 className="text-2xl font-bold text-gray-900">Gestion Cuisine</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{user.name}</span>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'planning', name: 'Planning', icon: CalendarDaysIcon },
              { id: 'employees', name: 'Employés', icon: UserGroupIcon },
              { id: 'competences', name: 'Compétences', icon: ClockIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Composant employés cuisine au lieu d'EmployeeManagement */}
              <div className="space-y-6">
                {/* En-tête */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Équipe de Cuisine</h2>
                    <p className="text-gray-600">Gérez les employés cuisine et leurs compétences</p>
                  </div>
                </div>

                {/* Cartes employés */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {employeesCuisine.map(employeeCuisine => {
                      const employee = employeeCuisine.employee;
                      if (!employee) return null;

                      const competences = competencesMap[employee.id] || [];
                      
                      return (
                        <motion.div
                          key={employee.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                          onClick={() => setSelectedEmployee(employee)}
                        >
                          {/* Photo et infos de base */}
                          <div className="p-6">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                                {employee.photo_url ? (
                                  <img 
                                    src={employee.photo_url} 
                                    alt={employee.nom}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  `${employee.nom?.charAt(0) || '?'}${employee.prenom?.charAt(0) || ''}`
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {employee.nom} {employee.prenom}
                                </h3>
                                <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getProfileColor(employee.profil)}`}>
                                  {employee.profil}
                                </div>
                              </div>
                            </div>

                            {/* Langues */}
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Langues</p>
                              <div className="flex flex-wrap gap-1">
                                {(employee.langues || []).slice(0, 3).map((langue, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                                    {langue}
                                  </span>
                                ))}
                                {(employee.langues || []).length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                                    +{(employee.langues || []).length - 3}
                                  </span>
                                )}
                                {!(employee.langues || []).length && (
                                  <span className="text-xs text-gray-400 italic">Aucune langue</span>
                                )}
                              </div>
                            </div>

                            {/* Compétences postes */}
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Compétences ({competences.length}/{postes.length})</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {competences.slice(0, 3).map((comp, idx) => {
                                  const poste = postes.find(p => p.id === comp.poste_id);
                                  return (
                                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs">
                                      {poste?.icone} {poste?.nom}
                                    </span>
                                  );
                                })}
                                {competences.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                                    +{competences.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Barre de progression */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                                style={{ 
                                  width: `${(competences.length / postes.length) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {employeesCuisine.length === 0 && (
                  <div className="text-center py-12">
                    <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun employé cuisine</h3>
                    <p className="text-gray-500">Les employés cuisine apparaîtront ici une fois ajoutés.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Autres onglets à développer */}
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

        {/* Assistant IA spécialisé Cuisine */}
        <CuisineAIAssistant onDataRefresh={loadAllData} />
      </main>

      {/* ===== Fiche employé cuisine (en dehors d'AnimatePresence) ===== */}
      <AnimatePresence>
        {selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEmployee(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden">
                      {selectedEmployee.photo_url ? (
                        <img 
                          src={selectedEmployee.photo_url} 
                          alt={selectedEmployee.nom}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        `${selectedEmployee.nom?.charAt(0) || '?'}${selectedEmployee.prenom?.charAt(0) || ''}`
                      )}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{selectedEmployee.nom} {selectedEmployee.prenom}</h1>
                      <p className="text-orange-100">Fiche employé cuisine</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (editMode) {
                          saveEmployee();
                        } else {
                          setEditMode(true);
                          setEditedEmployee({ ...selectedEmployee });
                        }
                      }}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                    >
                      {editMode ? <Save className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
                      {editMode ? 'Sauvegarder' : 'Modifier'}
                    </button>
                    {editMode && (
                      <button
                        onClick={cancelEdit}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenu modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Informations personnelles */}
                  <div>
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow">
                      <h2 className="text-xl font-bold text-gray-900 mb-6">Informations personnelles</h2>

                      {/* Photo */}
                      <div className="text-center mb-6">
                        <div className="w-32 h-32 mx-auto bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4 overflow-hidden">
                          {(editedEmployee || selectedEmployee).photo_url ? (
                            <img 
                              src={(editedEmployee || selectedEmployee).photo_url} 
                              alt={(editedEmployee || selectedEmployee).nom}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            `${(editedEmployee || selectedEmployee).nom?.charAt(0) || '?'}${(editedEmployee || selectedEmployee).prenom?.charAt(0) || ''}`
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
                          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto transition-colors"
                        >
                          <PhotoIcon className="w-4 h-4 mr-2" />
                          {photoUploading ? 'Upload en cours...' : 'Changer la photo'}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">
                          Formats acceptés : JPG, PNG, GIF, WebP<br />
                          Transparence préservée • Maximum : 10MB
                        </p>
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
                          const isFormé = competence !== null;
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
                                      <label className="flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isFormé}
                                          onChange={(e) => updateCompetencePoste(selectedEmployee.id, poste.id, e.target.checked)}
                                          className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                        />
                                        <span className="text-sm font-medium">
                                          {isFormé ? 'Formé' : 'Non formé'}
                                        </span>
                                      </label>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      {isFormé ? (
                                        <>
                                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                            Formé
                                          </span>
                                          {competence.date_validation && (
                                            <span className="text-xs text-gray-400">
                                              Validé le {new Date(competence.date_validation).toLocaleDateString('fr-FR')}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                                          Non formé
                                        </span>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CuisineManagement; 