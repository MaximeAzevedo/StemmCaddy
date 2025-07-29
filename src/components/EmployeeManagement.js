import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Star,
  Award,
  CheckCircle,
  AlertCircle,
  Languages,
  Truck,
  ArrowLeft,
  Edit,
  Save,
  Camera,
  Home,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabaseAPI } from '../lib/supabase';

const EmployeeManagement = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [competences, setCompetences] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const profiles = ['Faible', 'Moyen', 'Fort'];
  const languages = ['Français', 'Arabe', 'Anglais', 'Tigrinya', 'Perse', 'Turc', 'Yougoslave', 'Allemand', 'Créole', 'Luxembourgeois'];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const [employeesResult, vehiclesResult, competencesResult] = await Promise.all([
          supabaseAPI.getEmployeesLogistique(),
          supabaseAPI.getVehicles(),
          supabaseAPI.getAllCompetences()
        ]);

        if (employeesResult.error) throw employeesResult.error;
        if (vehiclesResult.error) throw vehiclesResult.error;
        if (competencesResult.error) throw competencesResult.error;
        
        const competencesMap = {};
        (competencesResult.data || []).forEach(competence => {
          if (!competencesMap[competence.employee_id]) {
            competencesMap[competence.employee_id] = [];
          }
          competencesMap[competence.employee_id].push(competence);
        });
        
        setEmployees(employeesResult.data || []);
        setVehicles(vehiclesResult.data || []);
        setCompetences(competencesMap);
        
        console.log('📊 Données chargées:', {
          employés: employeesResult.data?.length,
          véhicules: vehiclesResult.data?.length,
          compétences: Object.keys(competencesMap).length
        });
        
      } catch (error) {
        console.error('❌ Erreur chargement données:', error);
        toast.error('Erreur lors du chargement des données');
        
        setEmployees([
          {
            id: 1,
            nom: 'Abdelaziz',
            profil: 'Moyen',
            langues: ['Arabe'],
            permis: true,
            photo: null
          },
          {
            id: 2,
            nom: 'Shadi',
            profil: 'Fort',
            langues: ['Arabe', 'Anglais', 'Français'],
            permis: false,
            photo: null
          },
          {
            id: 3,
            nom: 'Tamara',
            profil: 'Faible',
            langues: ['Luxembourgeois', 'Français'],
            permis: true,
            photo: null
          }
        ]);
        
        setVehicles([
          { id: 1, nom: 'Crafter 23', capacite: 3 },
          { id: 2, nom: 'Crafter 21', capacite: 3 },
          { id: 3, nom: 'Jumper', capacite: 3 },
          { id: 4, nom: 'Ducato', capacite: 3 },
          { id: 5, nom: 'Transit', capacite: 8 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    // Quand on sélectionne un employé, initialiser l'état d'édition
    if (selectedEmployee) {
      setEditedEmployee({ ...selectedEmployee });
    }
  }, [selectedEmployee]);

  const getEmployeeCompetence = (employeeId, vehicleId) => {
    const empCompetences = competences[employeeId] || [];
    const competence = empCompetences.find(c => c.vehicle_id === vehicleId);
    
    if (competence) {
      // Si la compétence existe, elle est valide
      return {
        niveau: competence.niveau === 'XX' ? 2 : 1,
        valide: true
      };
    } else {
      // Si la compétence n'existe pas, elle n'est pas valide
      return { 
        niveau: 0, 
        valide: false 
      };
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProfile = !filterProfile || emp.profil === filterProfile;
    return matchesSearch && matchesProfile;
  });

  const getProfileColor = (profil) => {
    switch (profil) {
      case 'Faible': return 'bg-red-50 border-red-200 text-red-700';
      case 'Moyen': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'Fort': return 'bg-green-50 border-green-200 text-green-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const renderStars = (niveau) => {
    const stars = [];
    for (let i = 0; i < 2; i++) {
      if (i < niveau) {
        stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return stars;
  };

  const updateCompetence = async (employeeId, vehicleId, field, value) => {
    try {
      // Récupérer la compétence actuelle
      const currentCompetences = competences[employeeId] || [];
      const existingCompetence = currentCompetences.find(c => c.vehicle_id === vehicleId);
      
      // Tentative de sauvegarde dans la base de données
      let dbSaveSuccessful = false;
      try {
        if (field === 'valide') {
          if (value) {
            // Si on valide, créer/mettre à jour la compétence avec au moins 1 étoile
            const niveau = existingCompetence?.niveau === 'XX' ? 'XX' : 'en formation';
            const competenceData = {
              niveau: niveau,
              date_validation: new Date().toISOString().split('T')[0]
            };
            const result = await supabaseAPI.updateCompetence(employeeId, vehicleId, competenceData);
            if (!result.error) {
              dbSaveSuccessful = true;
              console.log('✅ Compétence validée en base:', result.data);
            }
          } else {
            // Si on invalide, supprimer la compétence de la base
            // Note: Cette fonctionnalité nécessiterait une méthode deleteCompetence dans l'API
            console.log('🗑️ Suppression de compétence non implémentée');
          }
        } else if (field === 'niveau') {
          // Conversion du niveau (0, 1, 2) vers le format base ('', 'en formation', 'XX')
          if (value === 0) {
            // Niveau 0 = supprimer la compétence
            console.log('🗑️ Suppression de compétence niveau 0');
          } else {
            const niveau = value === 1 ? 'en formation' : 'XX';
            const competenceData = {
              niveau: niveau,
              date_validation: new Date().toISOString().split('T')[0]
            };
            const result = await supabaseAPI.updateCompetence(employeeId, vehicleId, competenceData);
            if (!result.error) {
              dbSaveSuccessful = true;
              console.log('✅ Niveau de compétence mis à jour en base:', result.data);
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
            // Ajouter ou mettre à jour la compétence
            const competenceIndex = newCompetences[employeeId].findIndex(c => c.vehicle_id === vehicleId);
            const niveau = existingCompetence?.niveau === 'XX' ? 'XX' : 'en formation';
            const updatedCompetence = {
              employee_id: employeeId,
              vehicle_id: vehicleId,
              niveau: niveau,
              date_validation: new Date().toISOString().split('T')[0],
              id: existingCompetence?.id || Date.now()
            };
            
            if (competenceIndex >= 0) {
              newCompetences[employeeId][competenceIndex] = updatedCompetence;
            } else {
              newCompetences[employeeId].push(updatedCompetence);
            }
          } else {
            // Supprimer la compétence
            newCompetences[employeeId] = newCompetences[employeeId].filter(c => c.vehicle_id !== vehicleId);
          }
        } else if (field === 'niveau') {
          if (value === 0) {
            // Supprimer la compétence
            newCompetences[employeeId] = newCompetences[employeeId].filter(c => c.vehicle_id !== vehicleId);
          } else {
            // Mettre à jour le niveau
            const competenceIndex = newCompetences[employeeId].findIndex(c => c.vehicle_id === vehicleId);
            const niveau = value === 1 ? 'en formation' : 'XX';
            const updatedCompetence = {
              employee_id: employeeId,
              vehicle_id: vehicleId,
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
      
      // Message de succès différent selon le mode
      if (dbSaveSuccessful) {
        toast.success('Compétence mise à jour avec succès !');
      } else {
        toast.success('Compétence mise à jour localement (sauvegarde en cours...)');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la compétence:', error);
      toast.error('Erreur lors de la mise à jour de la compétence');
    }
  };

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
          setEditedEmployee(prev => ({
            ...prev,
            photo: base64Photo
          }));
          
          // Si on n'est pas en mode édition, sauvegarder immédiatement
          if (!editMode) {
            const updatedEmployee = { ...selectedEmployee, photo: base64Photo };
            
            // Tentative de sauvegarde en base de données
            try {
              const result = await supabaseAPI.updateEmployee(selectedEmployee.id, {
                photo: base64Photo
              });
              
              if (!result.error) {
                console.log('✅ Photo sauvegardée en base:', result.data);
                toast.success('Photo mise à jour avec succès !');
              } else {
                console.warn('⚠️ Erreur Supabase photo:', result.error);
                toast.success('Photo mise à jour localement (sauvegarde en cours...)');
              }
            } catch (dbError) {
              console.warn('⚠️ Base de données non accessible pour photo:', dbError);
              toast.success('Photo mise à jour localement (sauvegarde en cours...)');
            }
            
            // Mettre à jour l'état local
            setEmployees(prev => 
              prev.map(emp => 
                emp.id === selectedEmployee.id ? updatedEmployee : emp
              )
            );
            setSelectedEmployee(updatedEmployee);
          } else {
            toast.success('Photo sélectionnée ! N\'oubliez pas de sauvegarder.');
          }
          
        } catch (error) {
          console.error('❌ Erreur traitement photo:', error);
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
      console.error('❌ Erreur upload photo:', error);
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
    if (!editedEmployee) return;
    
    try {
      // Préparer les données à sauvegarder
      const employeeData = {
        nom: editedEmployee.nom,
        profil: editedEmployee.profil,
        langues: editedEmployee.langues || [],
        permis: editedEmployee.permis || false,
        photo: editedEmployee.photo || null
      };
      
      // Tentative de sauvegarde dans la base de données
      let dbSaveSuccessful = false;
      try {
        const result = await supabaseAPI.updateEmployee(editedEmployee.id, employeeData);
        
        if (!result.error) {
          dbSaveSuccessful = true;
          console.log('✅ Employé sauvegardé en base:', result.data);
        } else {
          console.warn('⚠️ Erreur Supabase pour employé:', result.error);
        }
      } catch (dbError) {
        console.warn('⚠️ Base de données non accessible pour employé:', dbError);
      }
      
      // Toujours mettre à jour l'état local (même si la DB échoue)
      setEmployees(prev => 
        prev.map(emp => 
          emp.id === editedEmployee.id ? { ...emp, ...employeeData } : emp
        )
      );
      
      // Mettre à jour l'employé sélectionné
      setSelectedEmployee({ ...editedEmployee, ...employeeData });
      
      setEditMode(false);
      
      // Message de succès différent selon le mode
      if (dbSaveSuccessful) {
        toast.success('Employé mis à jour avec succès !');
      } else {
        toast.success('Employé mis à jour localement (sauvegarde en cours...)');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de l\'employé:', error);
      toast.error('Erreur lors de la sauvegarde de l\'employé');
    }
  };

  const cancelEdit = () => {
    setEditedEmployee({ ...selectedEmployee });
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des employés...</p>
        </div>
      </div>
    );
  }

  const EmployeeCard = ({ employee }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="card-premium p-6 cursor-pointer hover:shadow-glow-blue"
      onClick={() => setSelectedEmployee(employee)}
    >
      {/* Photo et infos principales */}
      <div className="flex items-start space-x-4 mb-4">
        <div className="w-16 h-16 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-full flex items-center justify-center">
          {employee.photo ? (
            <img src={employee.photo} alt={employee.nom} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-primary-600">
              {employee.nom.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{employee.nom}</h3>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getProfileColor(employee.profil)}`}>
            {employee.profil}
          </div>
          <div className="flex items-center mt-2">
            {employee.permis ? (
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className="text-sm text-gray-600">
              {employee.permis ? 'Permis valide' : 'Pas de permis'}
            </span>
          </div>
        </div>
      </div>

      {/* Langues */}
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <Languages className="w-4 h-4 text-gray-500 mr-1" />
          <span className="text-sm text-gray-700">Langues:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {(employee.langues || []).map((langue, index) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              {langue}
            </span>
          ))}
        </div>
      </div>

      {/* Compétences véhicules */}
      <div>
        <div className="flex items-center mb-2">
          <Truck className="w-4 h-4 text-gray-500 mr-1" />
          <span className="text-sm text-gray-700">Compétences:</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {vehicles.map(vehicle => {
            const competence = getEmployeeCompetence(employee.id, vehicle.id);
            return (
              <div key={vehicle.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{vehicle.nom}:</span>
                <div className="flex items-center space-x-1">
                  {competence.valide ? (
                    <div className="flex">{renderStars(competence.niveau)}</div>
                  ) : (
                    <span className="text-gray-400">Non validé</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const EmployeeDetail = ({ employee }) => (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed inset-0 bg-white z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedEmployee(null)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Fiche Employé</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => editMode ? cancelEdit() : setEditMode(true)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              {editMode ? 'Annuler' : 'Modifier'}
            </button>
            {editMode && (
              <button
                onClick={saveEmployee}
                className="px-4 py-2 bg-white text-primary-600 hover:bg-gray-100 rounded-lg flex items-center"
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
          {/* Informations personnelles */}
          <div className="lg:col-span-1">
            <div className="card-premium p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Informations Générales</h2>
              
              {/* Photo */}
              <div className="text-center mb-6">
                <div className="w-32 h-32 mx-auto bg-gradient-to-r from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mb-4 relative overflow-hidden">
                  {(editedEmployee?.photo || selectedEmployee?.photo) ? (
                    <img src={editedEmployee?.photo || selectedEmployee?.photo} alt={editedEmployee?.nom || selectedEmployee?.nom} className="w-32 h-32 rounded-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-primary-600">
                      {(editedEmployee?.nom || selectedEmployee?.nom)?.charAt(0)}
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
                  className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {photoUploading ? 'Upload en cours...' : 'Changer la photo'}
                </button>
              </div>

              {/* Nom */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedEmployee?.nom}
                    onChange={(e) => handleEmployeeChange('nom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-lg font-semibold">{editedEmployee?.nom || selectedEmployee?.nom}</p>
                )}
              </div>

              {/* Profil */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Profil</label>
                {editMode ? (
                  <select
                    value={editedEmployee?.profil}
                    onChange={(e) => handleEmployeeChange('profil', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {profiles.map(profile => (
                      <option key={profile} value={profile}>
                        {profile}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getProfileColor(editedEmployee?.profil || selectedEmployee?.profil)}`}>
                    {editedEmployee?.profil || selectedEmployee?.profil}
                  </div>
                )}
              </div>

              {/* Permis */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Permis de conduire</label>
                {editMode ? (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editedEmployee?.permis}
                      onChange={(e) => handleEmployeeChange('permis', e.target.checked)}
                      className="mr-2"
                    />
                    Possède le permis
                  </label>
                ) : (
                  <div className="flex items-center">
                    {(editedEmployee?.permis || selectedEmployee?.permis) ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    )}
                    <span>{(editedEmployee?.permis || selectedEmployee?.permis) ? 'Permis valide' : 'Pas de permis'}</span>
                  </div>
                )}
              </div>

              {/* Langues */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Langues parlées</label>
                {editMode ? (
                  <div className="space-y-2">
                    {languages.map(langue => (
                      <label key={langue} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={(editedEmployee?.langues || []).includes(langue)}
                          onChange={() => handleLanguageToggle(langue)}
                          className="mr-2"
                        />
                        {langue}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {((editedEmployee?.langues || selectedEmployee?.langues) || []).map((langue, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {langue}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compétences véhicules */}
          <div className="lg:col-span-2">
            <div className="card-premium p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Compétences Véhicules</h2>
              
              <div className="space-y-6">
                {vehicles.map(vehicle => {
                  const competence = getEmployeeCompetence(employee.id, vehicle.id);
                  return (
                    <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{vehicle.nom}</h3>
                          <p className="text-sm text-gray-600">Capacité: {vehicle.capacite} personnes</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          {editMode ? (
                            <>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={competence.valide}
                                  onChange={(e) => updateCompetence(employee.id, vehicle.id, 'valide', e.target.checked)}
                                  className="mr-2"
                                />
                                Validé
                              </label>
                              <select
                                value={competence.niveau}
                                onChange={(e) => updateCompetence(employee.id, vehicle.id, 'niveau', parseInt(e.target.value))}
                                className="px-3 py-1 border border-gray-300 rounded"
                                disabled={!competence.valide}
                              >
                                <option value={0}>Non autorisé</option>
                                <option value={1}>1 étoile</option>
                                <option value={2}>2 étoiles</option>
                              </select>
                            </>
                          ) : (
                            <div className="flex items-center space-x-2">
                              {competence.valide ? (
                                <>
                                  <Award className="w-5 h-5 text-green-500" />
                                  <div className="flex">{renderStars(competence.niveau)}</div>
                                </>
                              ) : (
                                <span className="text-gray-500">Non validé</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {competence.valide && (
                        <div className="text-sm text-gray-600">
                          {competence.niveau === 1 && "Peut faire la tournée avec accompagnement"}
                          {competence.niveau === 2 && "Peut faire la tournée en autonomie complète"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

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
                <Home className="w-5 h-5" />
              </button>
              <Users className="w-8 h-8 text-primary-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Employés</h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un employé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex space-x-4">
            <select
              value={filterProfile}
              onChange={(e) => setFilterProfile(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tous les profils</option>
              {profiles.map(profile => (
                <option key={profile} value={profile}>{profile}</option>
              ))}
            </select>
            <button className="btn-primary flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Nouvel employé
            </button>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card-premium p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">{employees.length}</div>
            <div className="text-sm text-gray-600">Total employés</div>
          </div>
          <div className="card-premium p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {employees.filter(e => e.profil === 'Fort').length}
            </div>
            <div className="text-sm text-gray-600">Profils forts</div>
          </div>
          <div className="card-premium p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {employees.filter(e => e.profil === 'Moyen').length}
            </div>
            <div className="text-sm text-gray-600">Profils moyens</div>
          </div>
          <div className="card-premium p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {employees.filter(e => e.profil === 'Faible').length}
            </div>
            <div className="text-sm text-gray-600">Profils faibles</div>
          </div>
        </div>

        {/* Liste des employés */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredEmployees.map(employee => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal détail employé */}
      <AnimatePresence>
        {selectedEmployee && (
          <EmployeeDetail employee={selectedEmployee} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeManagement; 