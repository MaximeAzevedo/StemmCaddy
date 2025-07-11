import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Star,
  Award,
  CheckCircle,
  Languages,
  ArrowLeft,
  Edit,
  Save,
  Camera,
  Users,
  Calendar,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import CuisinePlanningInteractive from './CuisinePlanningInteractive';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const CuisineManagement = ({ user, onLogout, defaultTab = 'planning' }) => {
  const fileInputRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [employees, setEmployees] = useState([]);
  const [postesDispobibles, setPostesDisponibles] = useState([]);
  const [competences, setCompetences] = useState({});
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProfile, setFilterProfile] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const profiles = ['Débutant', 'Intermédiaire', 'Expérimenté', 'Expert'];
  const languages = ['Français', 'Arabe', 'Anglais', 'Tigrinya', 'Perse', 'Turc', 'Yougoslave', 'Allemand', 'Créole', 'Luxembourgeois'];

  const tabs = [
    {
      id: 'planning',
      name: 'Planning Cuisine',
      icon: Calendar,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      id: 'employees',
      name: 'Équipe Cuisine',
      icon: UserCheck,
      color: 'text-blue-600 bg-blue-100'
    }
  ];

  useEffect(() => {
    if (activeTab === 'employees') {
      loadData();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
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
      
      setEmployees(employeesResult.data || []);
      setPostesDisponibles(postesResult.data || []);
      setCompetences(competencesMap);
      
      console.log('📊 Données cuisine chargées:', {
        employés: employeesResult.data?.length,
        postes: postesResult.data?.length,
        compétences: Object.keys(competencesMap).length
      });
      
    } catch (error) {
      console.error('❌ Erreur chargement données cuisine:', error);
      toast.error('Erreur lors du chargement des données cuisine');
      
      // Données fallback pour développement
      setEmployees([
        {
          employee_id: 1,
          employee: {
            id: 1,
            nom: 'Marie Dubois',
            profil: 'Expert',
            langues: ['Français', 'Anglais'],
            statut: 'Actif'
          },
          photo_url: null
        },
        {
          employee_id: 2,
          employee: {
            id: 2,
            nom: 'Ahmed Hassan',
            profil: 'Expérimenté',
            langues: ['Français', 'Arabe'],
            statut: 'Actif'
          },
          photo_url: null
        }
      ]);
      
      setPostesDisponibles([
        { id: 1, nom: 'Cuisine chaude' },
        { id: 2, nom: 'Sandwichs' },
        { id: 3, nom: 'Pain' },
        { id: 4, nom: 'Jus de fruits' },
        { id: 5, nom: 'Vaisselle' },
        { id: 6, nom: 'Légumerie' },
        { id: 7, nom: 'Self Midi' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Quand on sélectionne un employé, initialiser l'état d'édition
    if (selectedEmployee) {
      setEditedEmployee({ ...selectedEmployee });
    }
  }, [selectedEmployee]);

  const getEmployeeCompetence = (employeeId, posteId) => {
    const empCompetences = competences[employeeId] || [];
    const competence = empCompetences.find(c => c.poste_id === posteId);
    
    if (competence) {
      return {
        niveau: competence.niveau === 'Expert' ? 2 : 1,
        valide: true
      };
    } else {
      return { 
        niveau: 0, 
        valide: false 
      };
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.employee.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProfile = !filterProfile || emp.employee.profil === filterProfile;
    return matchesSearch && matchesProfile;
  });

  const getProfileColor = (profil) => {
    switch (profil) {
      case 'Débutant': return 'bg-red-50 border-red-200 text-red-700';
      case 'Intermédiaire': return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'Expérimenté': return 'bg-green-50 border-green-200 text-green-700';
      case 'Expert': return 'bg-purple-50 border-purple-200 text-purple-700';
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

  const updateCompetence = async (employeeId, posteId, field, value) => {
    try {
      const currentCompetences = competences[employeeId] || [];
      const existingCompetence = currentCompetences.find(c => c.poste_id === posteId);
      
      let dbSaveSuccessful = false;
      try {
        if (field === 'valide') {
          if (value) {
            const niveau = existingCompetence?.niveau === 'Expert' ? 'Expert' : 'Intermédiaire';
            const competenceData = {
              niveau: niveau,
              date_validation: new Date().toISOString().split('T')[0]
            };
            const result = await supabaseCuisine.updateCompetenceCuisine(employeeId, posteId, competenceData);
            if (!result.error) {
              dbSaveSuccessful = true;
              console.log('✅ Compétence cuisine validée:', result.data);
            }
          }
        } else if (field === 'niveau') {
          if (value === 0) {
            console.log('🗑️ Suppression compétence cuisine niveau 0');
          } else {
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
            const niveau = existingCompetence?.niveau === 'Expert' ? 'Expert' : 'Intermédiaire';
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

  const handleEmployeeChange = (field, value) => {
    if (editedEmployee) {
      setEditedEmployee(prev => ({
        ...prev,
        employee: {
          ...prev.employee,
          [field]: value
        }
      }));
    }
  };

  const handleLanguageToggle = (langue) => {
    if (editedEmployee) {
      const currentLangues = editedEmployee.employee.langues || [];
      const newLangues = currentLangues.includes(langue)
        ? currentLangues.filter(l => l !== langue)
        : [...currentLangues, langue];
      
      setEditedEmployee(prev => ({
        ...prev,
        employee: {
          ...prev.employee,
          langues: newLangues
        }
      }));
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La taille de l\'image ne doit pas dépasser 5MB');
      return;
    }

    try {
      setPhotoUploading(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Photo = e.target.result;
        
        try {
          setEditedEmployee(prev => ({
            ...prev,
            photo_url: base64Photo
          }));
          
          if (!editMode) {
            const updatedEmployee = { ...selectedEmployee, photo_url: base64Photo };
            
            try {
              const result = await supabaseCuisine.updateEmployeeCuisine(selectedEmployee.employee_id, {
                photo_url: base64Photo
              });
              
              if (!result.error) {
                console.log('✅ Photo cuisine sauvegardée:', result.data);
                toast.success('Photo mise à jour avec succès !');
              } else {
                toast.success('Photo mise à jour localement');
              }
            } catch (dbError) {
              console.warn('⚠️ Erreur photo cuisine:', dbError);
              toast.success('Photo mise à jour localement');
            }
            
            setEmployees(prev => 
              prev.map(emp => 
                emp.employee_id === selectedEmployee.employee_id ? updatedEmployee : emp
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
      const employeeData = {
        nom: editedEmployee.employee.nom,
        profil: editedEmployee.employee.profil,
        langues: editedEmployee.employee.langues || [],
        statut: editedEmployee.employee.statut || 'Actif',
        photo_url: editedEmployee.photo_url || null
      };
      
      let dbSaveSuccessful = false;
      try {
        const result = await supabaseCuisine.updateEmployeeCuisine(editedEmployee.employee_id, employeeData);
        
        if (!result.error) {
          dbSaveSuccessful = true;
          console.log('✅ Employé cuisine sauvegardé:', result.data);
        } else {
          console.warn('⚠️ Erreur Supabase employé cuisine:', result.error);
        }
      } catch (dbError) {
        console.warn('⚠️ Base de données non accessible:', dbError);
      }
      
      setEmployees(prev => 
        prev.map(emp => 
          emp.employee_id === editedEmployee.employee_id ? { 
            ...emp, 
            employee: { ...emp.employee, ...employeeData },
            photo_url: employeeData.photo_url
          } : emp
        )
      );
      
      setSelectedEmployee(prev => ({
        ...prev,
        employee: { ...prev.employee, ...employeeData },
        photo_url: employeeData.photo_url
      }));
      
      setEditMode(false);
      
      if (dbSaveSuccessful) {
        toast.success('Employé mis à jour avec succès !');
      } else {
        toast.success('Employé mis à jour localement');
      }
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde employé:', error);
      toast.error('Erreur lors de la sauvegarde de l\'employé');
    }
  };

  const cancelEdit = () => {
    setEditedEmployee({ ...selectedEmployee });
    setEditMode(false);
  };

  if (loading && activeTab === 'employees') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'équipe cuisine...</p>
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
      className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border border-orange-100"
      onClick={() => setSelectedEmployee(employee)}
    >
      <div className="flex items-start space-x-4 mb-4">
        <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center">
          {employee.photo_url ? (
            <img src={employee.photo_url} alt={employee.employee.nom} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-orange-600">
              {employee.employee.nom.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{employee.employee.nom}</h3>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getProfileColor(employee.employee.profil)}`}>
            {employee.employee.profil}
          </div>
          <div className="flex items-center mt-2">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-sm text-gray-600">
              {employee.employee.statut || 'Actif'}
            </span>
          </div>
        </div>
      </div>

      {/* Langues */}
      {employee.employee.langues && employee.employee.langues.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Languages className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Langues</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {employee.employee.langues.slice(0, 3).map((langue, index) => (
              <span key={index} className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded border border-orange-200">
                {langue}
              </span>
            ))}
            {employee.employee.langues.length > 3 && (
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200">
                +{employee.employee.langues.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Compétences cuisine aperçu */}
      <div>
        <div className="flex items-center mb-2">
          <Award className="w-4 h-4 text-gray-500 mr-2" />
          <span className="text-sm font-medium text-gray-700">Compétences cuisine</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {postesDispobibles.slice(0, 4).map(poste => {
            const competence = getEmployeeCompetence(employee.employee_id, poste.id);
            return (
              <div key={poste.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate">{poste.nom}</span>
                {competence.valide ? (
                  <div className="flex">{renderStars(competence.niveau)}</div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
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
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedEmployee(null)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold">Fiche Employé Cuisine</h1>
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
          {/* Informations personnelles */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Informations Générales</h2>
              
              {/* Photo */}
              <div className="text-center mb-6">
                <div className="w-32 h-32 mx-auto bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mb-4 relative overflow-hidden">
                  {(editedEmployee?.photo_url || selectedEmployee?.photo_url) ? (
                    <img src={editedEmployee?.photo_url || selectedEmployee?.photo_url} alt={editedEmployee?.employee?.nom || selectedEmployee?.employee?.nom} className="w-32 h-32 rounded-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-orange-600">
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
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
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
                    value={editedEmployee?.employee?.nom || ''}
                    onChange={(e) => handleEmployeeChange('nom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                ) : (
                  <p className="text-lg font-semibold">{editedEmployee?.employee?.nom || selectedEmployee?.employee?.nom}</p>
                )}
              </div>

              {/* Profil */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
                {editMode ? (
                  <select
                    value={editedEmployee?.employee?.profil || ''}
                    onChange={(e) => handleEmployeeChange('profil', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    {profiles.map(profile => (
                      <option key={profile} value={profile}>
                        {profile}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getProfileColor(editedEmployee?.employee?.profil || selectedEmployee?.employee?.profil)}`}>
                    {editedEmployee?.employee?.profil || selectedEmployee?.employee?.profil}
                  </div>
                )}
              </div>

              {/* Statut */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                {editMode ? (
                  <select
                    value={editedEmployee?.employee?.statut || 'Actif'}
                    onChange={(e) => handleEmployeeChange('statut', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                    <option value="En formation">En formation</option>
                  </select>
                ) : (
                  <p className="text-sm">{editedEmployee?.employee?.statut || selectedEmployee?.employee?.statut || 'Actif'}</p>
                )}
              </div>

              {/* Langues */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Langues parlées</label>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    {languages.map(langue => (
                      <label key={langue} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={(editedEmployee?.employee?.langues || []).includes(langue)}
                          onChange={() => handleLanguageToggle(langue)}
                          className="mr-2 text-orange-500 focus:ring-orange-500"
                        />
                        {langue}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(editedEmployee?.employee?.langues || selectedEmployee?.employee?.langues || []).map((langue, index) => (
                      <span key={index} className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded border border-orange-200">
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
            <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Compétences par Poste de Cuisine</h2>
              
              <div className="space-y-4">
                {postesDispobibles.map(poste => {
                  const competence = getEmployeeCompetence(employee.employee_id, poste.id);
                  
                  return (
                    <div key={poste.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 font-bold text-sm">
                            {poste.nom.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{poste.nom}</h3>
                          <p className="text-sm text-gray-500">Poste de cuisine</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {editMode ? (
                          <>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={competence.valide}
                                onChange={(e) => updateCompetence(employee.employee_id, poste.id, 'valide', e.target.checked)}
                                className="mr-2 text-orange-500 focus:ring-orange-500"
                              />
                              Validé
                            </label>
                            <select
                              value={competence.niveau}
                              onChange={(e) => updateCompetence(employee.employee_id, poste.id, 'niveau', parseInt(e.target.value))}
                              className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                              disabled={!competence.valide}
                            >
                              <option value={0}>Non autorisé</option>
                              <option value={1}>Intermédiaire</option>
                              <option value={2}>Expert</option>
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
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderEmployeeManagement = () => {
    return (
      <div className="space-y-6">
        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher un employé..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={filterProfile}
                onChange={(e) => setFilterProfile(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* En-tête avec navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
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
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-orange-600' : 'text-gray-400'}`} />
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
        </div>
      </div>
    </div>
  );
};

export default CuisineManagement; 