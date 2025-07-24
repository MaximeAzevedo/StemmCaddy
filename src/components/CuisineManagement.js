import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, 
  Edit3,
  Save,
  X,
  User,
  Languages,
  ChefHat,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  Camera,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const CuisineManagement = ({ user, onLogout }) => {
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState([]);
  const [postes, setPostes] = useState([]);
  const [competences, setCompetences] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // 📸 PHOTO - States pour l'upload
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // 🗑️ SUPPRESSION - State pour la suppression
  const [deleting, setDeleting] = useState(false);

  // ➕ CRÉATION - States pour la création d'employé
  const [createMode, setCreateMode] = useState(false);
  const [newEmployee, setNewEmployee] = useState(null);
  const [creating, setCreating] = useState(false);

  const profiles = ['Débutant', 'Intermédiaire', 'Expérimenté', 'Expert'];
  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

  /**
   * Chargement des données
   */
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
      
      // Adapter les employés au format de logistique
      const adaptedEmployees = (employeesResult.data || []).map(emp => ({
        id: emp.id,
        nom: emp.prenom,
        profil: emp.langue_parlee || 'Non défini',
        permis: false, // La cuisine n'a pas de permis
        langues: emp.langue_parlee ? [emp.langue_parlee] : [],
        notes: emp.notes || '',
        photo_url: emp.photo_url || null, // 📸 PHOTO - Inclure l'URL de la photo
        // 🕒 HORAIRES - Utiliser les vraies valeurs de la DB avec fallback
        lundi_debut: emp.lundi_debut?.substring(0,5) || '08:00',
        lundi_fin: emp.lundi_fin?.substring(0,5) || '16:00',
        mardi_debut: emp.mardi_debut?.substring(0,5) || '08:00',
        mardi_fin: emp.mardi_fin?.substring(0,5) || '16:00',
        mercredi_debut: emp.mercredi_debut?.substring(0,5) || '08:00',
        mercredi_fin: emp.mercredi_fin?.substring(0,5) || '16:00',
        jeudi_debut: emp.jeudi_debut?.substring(0,5) || '08:00',
        jeudi_fin: emp.jeudi_fin?.substring(0,5) || '16:00',
        vendredi_debut: emp.vendredi_debut?.substring(0,5) || '08:00',
        vendredi_fin: emp.vendredi_fin?.substring(0,5) || '16:00'
      }));
      
      setEmployees(adaptedEmployees);
      setPostes(postesResult.data || []);
      setCompetences(competencesResult.data || []);
      
    } catch (error) {
      console.error('❌ Erreur chargement données cuisine:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Employés filtrés par recherche
   */
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    
    return employees.filter(emp => 
      emp.nom.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  /**
   * Obtenir les compétences d'un employé
   */
  const getEmployeeCompetences = (employeeId) => {
    return competences.filter(comp => comp.employee_id === employeeId);
  };

  /**
   * Ouvrir la modification d'un employé
   */
  const openEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEditedEmployee({...employee});
    setEditMode(true);
      };
      
    /**
   * Fermer la modification
   */
  const closeEdit = () => {
    setSelectedEmployee(null);
    setEditedEmployee(null);
    setEditMode(false);
    // 📸 PHOTO - Réinitialiser les states photo
    setPhotoPreview(null);
    setPhotoUploading(false);
    // 🗑️ SUPPRESSION - Réinitialiser l'état de suppression
    setDeleting(false);
  };

  /**
   * Sauvegarder les modifications employé
   */
  const saveEmployee = async () => {
    if (!editedEmployee) return;
    
    try {
      setSaving(true);
      
            // ✅ SEULEMENT LES CHAMPS RÉELS DE LA DB CUISINE
      const updates = {
        prenom: editedEmployee.nom,
        langue_parlee: editedEmployee.langues?.[0] || editedEmployee.profil,
        notes: editedEmployee.notes,
        photo_url: editedEmployee.photo_url || null, // 📸 PHOTO - Inclus dans la sauvegarde
        // 🕒 HORAIRES - Inclus dans la sauvegarde
        lundi_debut: editedEmployee.lundi_debut,
        lundi_fin: editedEmployee.lundi_fin,
        mardi_debut: editedEmployee.mardi_debut,
        mardi_fin: editedEmployee.mardi_fin,
        mercredi_debut: editedEmployee.mercredi_debut,
        mercredi_fin: editedEmployee.mercredi_fin,
        jeudi_debut: editedEmployee.jeudi_debut,
        jeudi_fin: editedEmployee.jeudi_fin,
        vendredi_debut: editedEmployee.vendredi_debut,
        vendredi_fin: editedEmployee.vendredi_fin
      };

      const result = await supabaseCuisine.updateEmployeeCuisine(editedEmployee.id, updates);
      
      if (result.error) throw result.error;
      
      // Mettre à jour la liste locale
      setEmployees(employees.map(emp => 
        emp.id === editedEmployee.id ? { ...emp, ...editedEmployee } : emp
      ));
      
      toast.success('Employé mis à jour avec succès');
      closeEdit();
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde employé:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
      }
  };

  /**
   * Mettre à jour une compétence poste (table séparée)
   */
  const updateCompetence = async (employeeId, posteId, niveau) => {
    try {
            const competenceData = {
        niveau: niveau === '' ? '' : niveau,
        date_validation: niveau === '' ? null : new Date().toISOString().split('T')[0]
            };
      
            const result = await supabaseCuisine.updateCompetenceCuisine(employeeId, posteId, competenceData);
      
      if (result.error) throw result.error;
      
      // Recharger les compétences
      const competencesResult = await supabaseCuisine.getCompetencesCuisineSimple();
      if (!competencesResult.error) {
        setCompetences(competencesResult.data || []);
            }
      
      toast.success('Compétence mise à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour compétence:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  /**
   * Mettre à jour un champ des langues
   */
  const updateLanguages = (languages) => {
    setEditedEmployee({
      ...editedEmployee, 
      langues: languages
    });
  };

  // ==================== GESTION PHOTOS ====================
  
  /**
   * Ouvrir le sélecteur de fichier
   */
  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  /**
   * Gérer la sélection de fichier et upload
   */
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Déterminer quel employé nous éditons (création ou modification)
    const currentEmployee = editedEmployee || newEmployee;
    if (!currentEmployee) return;

    try {
      setPhotoUploading(true);
      
      // Créer un aperçu immédiat
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);

      // Pour la création, on stocke temporairement la photo sans upload immédiat
      if (createMode) {
        // En mode création, on garde juste l'aperçu et le fichier
        // L'upload se fera lors de la création de l'employé
        const tempUrl = URL.createObjectURL(file);
        setNewEmployee({
          ...newEmployee,
          photo_url: tempUrl,
          photoFile: file // Stocker le fichier pour upload plus tard
        });
        toast.success('Photo sélectionnée !');
        return;
      }

      // Pour la modification, upload immédiat
      if (editedEmployee?.id) {
        // Supprimer l'ancienne photo si elle existe
        if (editedEmployee.photo_url) {
          await supabaseCuisine.deleteEmployeePhoto(editedEmployee.photo_url);
        }

        // Upload la nouvelle photo
        const result = await supabaseCuisine.uploadEmployeePhoto(file, editedEmployee.id);
        
        if (result.error) {
          throw new Error(result.error.message);
        }

        // Mettre à jour l'employé avec la nouvelle URL
        setEditedEmployee({
          ...editedEmployee,
          photo_url: result.data.url
        });

        toast.success('Photo uploadée avec succès !');
      }
      
    } catch (error) {
      console.error('❌ Erreur upload photo:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
      setPhotoPreview(null);
    } finally {
      setPhotoUploading(false);
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Supprimer la photo actuelle
   */
  const handleRemovePhoto = async () => {
    const currentEmployee = editedEmployee || newEmployee;
    if (!currentEmployee?.photo_url) return;

    try {
      setPhotoUploading(true);
      
      // En mode création, supprimer juste l'aperçu
      if (createMode) {
        setNewEmployee({
          ...newEmployee,
          photo_url: null,
          photoFile: null
        });
        setPhotoPreview(null);
        toast.success('Photo supprimée');
        return;
      }
      
      // En mode édition, supprimer de Supabase Storage
      if (editedEmployee?.photo_url) {
        await supabaseCuisine.deleteEmployeePhoto(editedEmployee.photo_url);
        
        setEditedEmployee({
          ...editedEmployee,
          photo_url: null
        });
      }
      
      setPhotoPreview(null);
      toast.success('Photo supprimée');
      
    } catch (error) {
      console.error('❌ Erreur suppression photo:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setPhotoUploading(false);
    }
  };

  // ==================== CRÉATION EMPLOYÉ ====================
  
  /**
   * Ouvrir la création d'un nouvel employé
   */
  const openCreateEmployee = () => {
    const initialEmployee = {
      nom: '',
      profil: 'Français',
      langues: ['Français'],
      notes: '',
      photo_url: null,
      // Horaires par défaut
      lundi_debut: '08:00',
      lundi_fin: '16:00',
      mardi_debut: '08:00',
      mardi_fin: '16:00',
      mercredi_debut: '08:00',
      mercredi_fin: '16:00',
      jeudi_debut: '08:00',
      jeudi_fin: '16:00',
      vendredi_debut: '08:00',
      vendredi_fin: '16:00'
    };
    
    setNewEmployee(initialEmployee);
    setCreateMode(true);
  };

  /**
   * Fermer la création
   */
  const closeCreate = () => {
    setNewEmployee(null);
    setCreateMode(false);
    // 📸 PHOTO - Réinitialiser les states photo
    setPhotoPreview(null);
    setPhotoUploading(false);
    // ➕ CRÉATION - Réinitialiser l'état de création
    setCreating(false);
  };

  /**
   * Créer un nouvel employé
   */
  const handleCreateEmployee = async () => {
    if (!newEmployee?.nom?.trim()) {
      toast.error('Le nom/prénom est requis');
      return;
    }

    try {
      setCreating(true);
      
      // D'abord créer l'employé en base de données sans photo
      const result = await supabaseCuisine.createEmployeeCuisine({
        prenom: newEmployee.nom.trim(),
        langue_parlee: newEmployee.langues?.[0] || newEmployee.profil,
        notes: newEmployee.notes || '',
        photo_url: null, // On uploade la photo après
        // Horaires
        lundi_debut: newEmployee.lundi_debut,
        lundi_fin: newEmployee.lundi_fin,
        mardi_debut: newEmployee.mardi_debut,
        mardi_fin: newEmployee.mardi_fin,
        mercredi_debut: newEmployee.mercredi_debut,
        mercredi_fin: newEmployee.mercredi_fin,
        jeudi_debut: newEmployee.jeudi_debut,
        jeudi_fin: newEmployee.jeudi_fin,
        vendredi_debut: newEmployee.vendredi_debut,
        vendredi_fin: newEmployee.vendredi_fin
      });
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      let finalPhotoUrl = null;
      
      // Si une photo a été sélectionnée, l'uploader maintenant
      if (newEmployee.photoFile) {
        const photoResult = await supabaseCuisine.uploadEmployeePhoto(newEmployee.photoFile, result.data.id);
        
        if (photoResult.error) {
          console.warn('⚠️ Erreur upload photo (non bloquant):', photoResult.error);
          toast.warning('Employé créé mais erreur lors de l\'upload de la photo');
        } else {
          finalPhotoUrl = photoResult.data.url;
          
          // Mettre à jour l'employé avec l'URL de la photo
          await supabaseCuisine.updateEmployeeCuisine(result.data.id, {
            photo_url: finalPhotoUrl
          });
        }
      }
      
      // Adapter le nouvel employé au format local et l'ajouter à la liste
      const adaptedNewEmployee = {
        id: result.data.id,
        nom: result.data.prenom,
        profil: result.data.langue_parlee || 'Non défini',
        permis: false,
        langues: result.data.langue_parlee ? [result.data.langue_parlee] : [],
        notes: result.data.notes || '',
        photo_url: finalPhotoUrl || null,
        lundi_debut: result.data.lundi_debut?.substring(0,5) || '08:00',
        lundi_fin: result.data.lundi_fin?.substring(0,5) || '16:00',
        mardi_debut: result.data.mardi_debut?.substring(0,5) || '08:00',
        mardi_fin: result.data.mardi_fin?.substring(0,5) || '16:00',
        mercredi_debut: result.data.mercredi_debut?.substring(0,5) || '08:00',
        mercredi_fin: result.data.mercredi_fin?.substring(0,5) || '16:00',
        jeudi_debut: result.data.jeudi_debut?.substring(0,5) || '08:00',
        jeudi_fin: result.data.jeudi_fin?.substring(0,5) || '16:00',
        vendredi_debut: result.data.vendredi_debut?.substring(0,5) || '08:00',
        vendredi_fin: result.data.vendredi_fin?.substring(0,5) || '16:00'
      };
      
      // Ajouter à la liste locale
      setEmployees([...employees, adaptedNewEmployee]);
      
      // Fermer le modal
      closeCreate();
      
      toast.success(`Employé "${newEmployee.nom}" créé avec succès !`);
      
    } catch (error) {
      console.error('❌ Erreur création employé:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  // ==================== SUPPRESSION EMPLOYÉ ====================
  
  /**
   * Supprimer un employé avec confirmation
   */
  const handleDeleteEmployee = async () => {
    if (!editedEmployee?.id) return;

    // Confirmation de suppression
    const confirmDelete = window.confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer l'employé "${editedEmployee.nom}" ?\n\n` +
      `Cette action est irréversible et supprimera :\n` +
      `• Son profil et ses informations\n` +
      `• Ses compétences\n` +
      `• Son historique de planning\n` +
      `• Sa photo\n\n` +
      `Confirmez-vous la suppression ?`
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      
      // Supprimer la photo si elle existe
      if (editedEmployee.photo_url) {
        await supabaseCuisine.deleteEmployeePhoto(editedEmployee.photo_url);
      }
      
      // Supprimer l'employé de la base
      const result = await supabaseCuisine.deleteEmployeeCuisine(editedEmployee.id);
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      // Mettre à jour la liste locale (retirer l'employé supprimé)
      setEmployees(employees.filter(emp => emp.id !== editedEmployee.id));
      
      // Fermer le modal
      closeEdit();
      
      toast.success(`Employé "${editedEmployee.nom}" supprimé avec succès`);
      
    } catch (error) {
      console.error('❌ Erreur suppression employé:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-blue-200 max-w-md w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-8"></div>
          <h3 className="text-2xl font-bold text-blue-800 mb-4">Chargement</h3>
          <p className="text-blue-600">Préparation des données cuisine...</p>
          </div>
            </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50">
      {/* Header Premium Responsive */}
      <div className="bg-white/80 backdrop-blur-xl shadow-xl border-b border-blue-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 md:space-x-6">
                  <button
                onClick={() => navigate('/cuisine')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-900 transition-all duration-200 hover:bg-blue-100 px-3 md:px-4 py-2 rounded-xl"
                  >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-medium text-sm md:text-base">Retour</span>
                  </button>
              <div className="hidden md:block h-8 w-px bg-blue-300"></div>
              <div>
                                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-800 to-violet-600 bg-clip-text text-transparent">
                  Gestion Équipe Cuisine
                </h1>
                <p className="text-blue-600 mt-1 text-sm md:text-base">
                  {employees.length} employés • {postes.length} postes
                </p>
              </div>
            </div>
            
            {/* ➕ Bouton de création d'employé */}
            <div className="flex items-center space-x-3">
              <button
                onClick={openCreateEmployee}
                className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm md:text-base">Nouvel employé</span>
              </button>
              
              <button
              onClick={() => onLogout()}
              className="text-blue-600 hover:text-blue-900 font-medium transition-colors text-sm md:text-base"
                  >
              Déconnexion
                  </button>
                </div>
              </div>
            </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Barre de recherche premium responsive */}
        <div className="mb-6 md:mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
                      </div>
                      <input
              type="text"
              placeholder="Rechercher un employé par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-12 md:pl-16 pr-4 md:pr-6 py-4 md:py-5 bg-white/70 backdrop-blur-sm border border-blue-200/50 rounded-2xl text-base md:text-lg placeholder-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-xl transition-all duration-200"
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 pr-4 md:pr-6 flex items-center">
                      <button 
                  onClick={() => setSearchTerm('')}
                  className="text-blue-400 hover:text-blue-600 transition-colors"
                      >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
              </div>
            )}
                    </div>

          {searchTerm && (
            <div className="text-center mt-4">
              <p className="text-blue-600 text-sm md:text-base">
                {filteredEmployees.length} résultat{filteredEmployees.length > 1 ? 's' : ''} pour "{searchTerm}"
              </p>
            </div>
                      )}
                    </div>

        {/* Liste des employés responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence>
            {filteredEmployees.map(employee => {
              const employeeCompetences = getEmployeeCompetences(employee.id);
              
              return (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="group"
                >
                  <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    {/* Header carte */}
                    <div className="bg-gradient-to-r from-blue-50 to-violet-50 p-4 md:p-6 border-b border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          {/* 📸 PHOTO - Affichage de la photo ou initiales */}
                          {employee.photo_url ? (
                            <img 
                              src={employee.photo_url}
                              alt={employee.nom}
                              className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover shadow-lg ring-2 ring-white"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg ${
                            employee.profil === 'Expert' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                            employee.profil === 'Expérimenté' ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                            employee.profil === 'Intermédiaire' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                            'bg-gradient-to-br from-rose-500 to-rose-600'
                          } ${employee.photo_url ? 'hidden' : 'flex'}`}>
                            {employee.nom.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg md:text-xl font-bold text-blue-800 truncate">{employee.nom}</h3>
                            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3 mt-2">
                              <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium w-fit ${
                                employee.profil === 'Expert' ? 'bg-emerald-100 text-emerald-700' :
                                employee.profil === 'Expérimenté' ? 'bg-amber-100 text-amber-700' :
                                employee.profil === 'Intermédiaire' ? 'bg-blue-100 text-blue-700' :
                                'bg-rose-100 text-rose-700'
                        }`}>
                                {employee.profil}
                        </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => openEditEmployee(employee)}
                          className="p-2 md:p-3 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group-hover:scale-110 flex-shrink-0"
                        >
                          <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Contenu carte */}
                    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                      {/* Horaires */}
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-700">Horaires</span>
                          </div>
                        <div className="text-sm text-blue-600 bg-blue-50 rounded-xl p-3">
                          {employee.lundi_debut && employee.lundi_fin ? 
                            `${employee.lundi_debut.substring(0,5)} - ${employee.lundi_fin.substring(0,5)}` : 
                            '8h00 - 16h00'
                          }
                        </div>
                      </div>

                      {/* Langues */}
                      {employee.langues && employee.langues.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-2 mb-3">
                            <Languages className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-blue-700">Langues</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {employee.langues.slice(0, 3).map((langue, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-700 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium">
                              {langue}
                            </span>
                          ))}
                            {employee.langues.length > 3 && (
                              <span className="bg-blue-200 text-blue-600 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium">
                                +{employee.langues.length - 3}
                              </span>
                      )}
                    </div>
                  </div>
                      )}

                      {/* Compétences postes */}
                      <div>
                                                 <div className="flex items-center space-x-2 mb-3">
                           <ChefHat className="w-4 h-4 text-blue-500" />
                           <span className="text-sm font-medium text-blue-700">
                             Compétences ({employeeCompetences.length})
                                </span>
                              </div>
                        <div className="space-y-2">
                          {employeeCompetences.length > 0 ? (
                            employeeCompetences.slice(0, 3).map((comp, idx) => {
                              const poste = postes.find(p => p.id === comp.poste_id);
                              return (
                                <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-blue-50 rounded-xl">
                                  <span className="text-xs md:text-sm font-medium text-blue-700 truncate mr-2">
                                    {poste?.nom || 'Poste inconnu'}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                    comp.niveau === 'Expert' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {comp.niveau === 'Expert' ? 'Formé' : 'Non formé'}
                                </span>
                          </div>
                        );
                            })
                          ) : (
                            <div className="text-sm text-blue-500 italic text-center py-3">
                              Aucune formation
                    </div>
                          )}
                          {employeeCompetences.length > 3 && (
                            <div className="text-xs text-blue-500 text-center">
                              +{employeeCompetences.length - 3} autres
                            </div>
                          )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 md:py-16">
            <User className="w-16 h-16 md:w-20 md:h-20 text-blue-300 mx-auto mb-6" />
            <h3 className="text-lg md:text-xl font-medium text-blue-700 mb-2">
              {searchTerm ? 'Aucun employé trouvé' : 'Aucun employé'}
            </h3>
            <p className="text-blue-500 text-sm md:text-base">
              {searchTerm ? 'Essayez de modifier votre recherche' : 'Chargement en cours...'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de modification responsive */}
      <AnimatePresence>
        {editMode && selectedEmployee && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeEdit}
    >
      <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
              {/* Header modal */}
              <div className="bg-gradient-to-r from-blue-50 to-violet-50 p-6 md:p-8 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* 📸 PHOTO - Affichage dans le modal */}
              {selectedEmployee.photo_url ? (
                <img 
                  src={selectedEmployee.photo_url}
                  alt={selectedEmployee.nom}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover shadow-lg ring-2 ring-white"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg md:text-xl ${
                selectedEmployee.profil === 'Expert' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                selectedEmployee.profil === 'Expérimenté' ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                selectedEmployee.profil === 'Intermédiaire' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                'bg-gradient-to-br from-rose-500 to-rose-600'
              } ${selectedEmployee.photo_url ? 'hidden' : 'flex'}`}>
                {selectedEmployee.nom.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-blue-800">Modifier l'employé</h2>
                      <p className="text-blue-600 mt-1 text-sm md:text-base">{selectedEmployee.nom}</p>
                    </div>
            </div>
            <button
                    onClick={closeEdit}
                    className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
            >
                    <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

              {/* Contenu modal */}
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  {/* Informations générales */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-blue-800 border-b border-blue-200 pb-2">
                      Informations générales
                    </h3>
                    
                                        <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Nom/Prénom</label>
                      <input
                        type="text"
                        value={editedEmployee?.nom || ''}
                        onChange={(e) => setEditedEmployee({...editedEmployee, nom: e.target.value})}
                        className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* 📸 PHOTO - Upload de fichier */}
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-3">Photo de l'employé</label>
                      
                      {/* Input file caché */}
                <input
                        ref={fileInputRef}
                  type="file"
                  accept="image/*"
                        onChange={handlePhotoChange}
                  className="hidden"
                      />
                      
                      {/* Zone d'upload/aperçu */}
                      <div className="space-y-3">
                        {(editedEmployee?.photo_url || photoPreview) ? (
                          // Aperçu de la photo existante ou nouvelle
                          <div className="relative">
                            <img 
                              src={photoPreview || editedEmployee.photo_url}
                              alt="Photo employé"
                              className="w-32 h-32 rounded-xl object-cover border-2 border-blue-200 shadow-md"
                            />
                            {photoUploading && (
                              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Zone d'upload vide
                          <div className="w-32 h-32 border-2 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 transition-colors">
                            <Camera className="w-8 h-8 text-blue-400 mb-2" />
                            <p className="text-xs text-blue-600 text-center">Pas de photo</p>
                          </div>
                        )}
                        
                        {/* Boutons d'action */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSelectPhoto}
                            disabled={photoUploading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                          >
                            {photoUploading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            {editedEmployee?.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
                          </button>
                          
                          {(editedEmployee?.photo_url || photoPreview) && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              disabled={photoUploading}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Supprimer
                            </button>
                          )}
              </div>

                        {/* Aide */}
                        <p className="text-xs text-blue-500">
                          Formats acceptés : JPG, PNG, WebP (max 5MB)
                        </p>
                      </div>
              </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Profil/Langue</label>
                <select
                        value={editedEmployee?.profil || ''}
                        onChange={(e) => setEditedEmployee({...editedEmployee, profil: e.target.value, langues: [e.target.value]})}
                        className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                        <option value="Français">Français</option>
                        <option value="Anglais">Anglais</option>
                        <option value="Espagnol">Espagnol</option>
                        <option value="Arabe">Arabe</option>
                        <option value="Italien">Italien</option>
                        <option value="Portugais">Portugais</option>
                        <option value="Allemand">Allemand</option>
                        <option value="Russe">Russe</option>
                        <option value="Chinois">Chinois</option>
                        <option value="Yougoslave">Yougoslave</option>
                </select>
              </div>

              <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Notes</label>
                <textarea
                        value={editedEmployee?.notes || ''}
                        onChange={(e) => setEditedEmployee({...editedEmployee, notes: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Notes supplémentaires..."
                />
              </div>
            </div>

                  {/* Horaires par jour (gardé pour cohérence avec logistique) */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-blue-800 border-b border-blue-200 pb-2">
                      Horaires de travail
                    </h3>
              
              <div className="space-y-4">
                      {jours.map(jour => (
                        <div key={jour} className="bg-blue-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-blue-700 capitalize">
                              {jour}
                            </label>
                        </div>
                          <div className="grid grid-cols-2 gap-3">
                        <div>
                              <label className="block text-xs text-blue-600 mb-1">Début</label>
                          <input
                                type="time"
                                value={editedEmployee?.[`${jour}_debut`] || '08:00'}
                                onChange={(e) => setEditedEmployee({
                                  ...editedEmployee, 
                                  [`${jour}_debut`]: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                      </div>
                            <div>
                              <label className="block text-xs text-blue-600 mb-1">Fin</label>
                              <input
                                type="time"
                                value={editedEmployee?.[`${jour}_fin`] || '16:00'}
                                onChange={(e) => setEditedEmployee({
                                  ...editedEmployee, 
                                  [`${jour}_fin`]: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
              </div>
            </div>
          </div>
                      ))}
          </div>
              </div>
            </div>

                {/* Compétences postes cuisine */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-blue-800 border-b border-blue-200 pb-2 mb-4">
                    Compétences par poste de cuisine
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {postes.map(poste => {
                      const competence = competences.find(comp => 
                        comp.employee_id === selectedEmployee.id && comp.poste_id === poste.id
                      );
                      
                      return (
                        <div key={poste.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div>
                            <span className="font-medium text-blue-800">{poste.nom}</span>
                            <div className="text-sm text-blue-600">{poste.icone}</div>
                  </div>
                          <select
                            value={competence?.niveau || ''}
                            onChange={(e) => updateCompetence(selectedEmployee.id, poste.id, e.target.value)}
                            className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="">Non formé</option>
                            <option value="Expert">Formé</option>
                          </select>
                        </div>
                      );
                    })}
                </div>
              </div>

                {/* Actions */}
                <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 mt-8 pt-6 border-t border-blue-200">
                  {/* 🗑️ Bouton de suppression à gauche */}
                  <div className="w-full md:w-auto">
                    <button
                      onClick={handleDeleteEmployee}
                      disabled={saving || deleting}
                      className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Suppression...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Supprimer l'employé</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Boutons principaux à droite */}
                  <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4">
                    <button
                      onClick={closeEdit}
                      className="w-full md:w-auto px-6 py-3 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={saveEmployee}
                      disabled={saving || deleting}
                      className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-violet-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-violet-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Sauvegarde...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Sauvegarder</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
            </div>
      </motion.div>
    </motion.div>
          )}
        </AnimatePresence>

        {/* ➕ Modal de création d'employé */}
        <AnimatePresence>
          {createMode && newEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={closeCreate}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header modal création */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 md:p-8 border-b border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* 📸 PHOTO - Affichage dans le modal de création */}
                      {newEmployee.photo_url || photoPreview ? (
                        <img 
                          src={photoPreview || newEmployee.photo_url}
                          alt="Nouvelle photo"
                          className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover shadow-lg ring-2 ring-white"
                        />
                      ) : (
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg md:text-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-emerald-800">Créer un nouvel employé</h2>
                        <p className="text-emerald-600 mt-1 text-sm md:text-base">Ajouter un membre à l'équipe cuisine</p>
                      </div>
                    </div>
                    <button
                      onClick={closeCreate}
                      className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                </div>

                {/* Contenu modal création */}
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {/* Informations générales */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-emerald-800 border-b border-emerald-200 pb-2">
                        Informations générales
                      </h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-emerald-700 mb-2">Nom/Prénom *</label>
                        <input
                          type="text"
                          value={newEmployee?.nom || ''}
                          onChange={(e) => setNewEmployee({...newEmployee, nom: e.target.value})}
                          placeholder="Entrez le nom et prénom"
                          className="w-full px-4 py-3 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>

                      {/* 📸 PHOTO - Upload de fichier pour création */}
                      <div>
                        <label className="block text-sm font-medium text-emerald-700 mb-3">Photo de l'employé</label>
                        
                        {/* Input file caché */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                        
                        {/* Zone d'upload/aperçu */}
                        <div className="space-y-3">
                          {(newEmployee?.photo_url || photoPreview) ? (
                            // Aperçu de la photo
                            <div className="relative">
                              <img 
                                src={photoPreview || newEmployee.photo_url}
                                alt="Photo employé"
                                className="w-32 h-32 rounded-xl object-cover border-2 border-emerald-200 shadow-md"
                              />
                              {photoUploading && (
                                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Zone d'upload vide
                            <div className="w-32 h-32 border-2 border-dashed border-emerald-300 rounded-xl flex flex-col items-center justify-center bg-emerald-50 hover:bg-emerald-100 transition-colors">
                              <Camera className="w-8 h-8 text-emerald-400 mb-2" />
                              <p className="text-xs text-emerald-600 text-center">Pas de photo</p>
                            </div>
                          )}
                          
                          {/* Boutons d'action */}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSelectPhoto}
                              disabled={photoUploading}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              {photoUploading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              {newEmployee?.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
                            </button>
                            
                            {(newEmployee?.photo_url || photoPreview) && (
                              <button
                                type="button"
                                onClick={handleRemovePhoto}
                                disabled={photoUploading}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </button>
                            )}
                          </div>
                          
                          {/* Aide */}
                          <p className="text-xs text-emerald-500">
                            Formats acceptés : JPG, PNG, WebP (max 5MB)
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-emerald-700 mb-2">Profil/Langue</label>
                        <select
                          value={newEmployee?.profil || ''}
                          onChange={(e) => setNewEmployee({...newEmployee, profil: e.target.value, langues: [e.target.value]})}
                          className="w-full px-4 py-3 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="Français">Français</option>
                          <option value="Anglais">Anglais</option>
                          <option value="Espagnol">Espagnol</option>
                          <option value="Arabe">Arabe</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-emerald-700 mb-2">Notes</label>
                        <textarea
                          value={newEmployee?.notes || ''}
                          onChange={(e) => setNewEmployee({...newEmployee, notes: e.target.value})}
                          rows={4}
                          placeholder="Notes supplémentaires..."
                          className="w-full px-4 py-3 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Horaires par jour */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-emerald-800 border-b border-emerald-200 pb-2">
                        Horaires de travail
                      </h3>
                
                      <div className="space-y-4">
                        {jours.map(jour => (
                          <div key={jour} className="bg-emerald-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <label className="text-sm font-medium text-emerald-700 capitalize">
                                {jour}
                              </label>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-emerald-600 mb-1">Début</label>
                                <input
                                  type="time"
                                  value={newEmployee?.[`${jour}_debut`] || '08:00'}
                                  onChange={(e) => setNewEmployee({
                                    ...newEmployee, 
                                    [`${jour}_debut`]: e.target.value
                                  })}
                                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-emerald-600 mb-1">Fin</label>
                                <input
                                  type="time"
                                  value={newEmployee?.[`${jour}_fin`] || '16:00'}
                                  onChange={(e) => setNewEmployee({
                                    ...newEmployee, 
                                    [`${jour}_fin`]: e.target.value
                                  })}
                                  className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col md:flex-row items-center justify-end space-y-3 md:space-y-0 md:space-x-4 mt-8 pt-6 border-t border-emerald-200">
                    <button
                      onClick={closeCreate}
                      className="w-full md:w-auto px-6 py-3 text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleCreateEmployee}
                      disabled={creating || photoUploading}
                      className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-700 text-white font-medium rounded-xl hover:from-emerald-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {creating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Création...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Créer l'employé</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CuisineManagement;
