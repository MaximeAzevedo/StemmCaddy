import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const useEmployeeManagement = () => {
  // États principaux
  const [employees, setEmployees] = useState([]);
  const [postes, setPostes] = useState([]);
  const [competences, setCompetences] = useState([]);
  const [loading, setLoading] = useState(true);

  // États de recherche et sélection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // États d'édition
  const [editMode, setEditMode] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // États de création
  const [createMode, setCreateMode] = useState(false);
  const [newEmployee, setNewEmployee] = useState(null);
  const [creating, setCreating] = useState(false);

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
        photo_url: emp.photo_url || null,
        // Horaires
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
    setDeleting(false);
  };

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
    setCreating(false);
  };

  /**
   * Sauvegarder les modifications employé
   */
  const saveEmployee = async () => {
    if (!editedEmployee) return;
    
    try {
      setSaving(true);
      
      const updates = {
        prenom: editedEmployee.nom,
        langue_parlee: editedEmployee.langues?.[0] || editedEmployee.profil,
        notes: editedEmployee.notes,
        photo_url: editedEmployee.photo_url || null,
        // Horaires
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
   * Mettre à jour une compétence poste
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

  /**
   * Supprimer un employé avec confirmation
   */
  const handleDeleteEmployee = async () => {
    if (!editedEmployee?.id) {
      console.warn('⚠️ Aucun employé sélectionné pour suppression');
      toast.error('Aucun employé sélectionné');
      return;
    }

    console.log('🗑️ Tentative de suppression employé:', editedEmployee);

    // Confirmation de suppression
    const confirmDelete = window.confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer l'employé "${editedEmployee.prenom || editedEmployee.nom}" ?\n\n` +
      `Cette action est irréversible et supprimera :\n` +
      `• Son profil et ses informations\n` +
      `• Ses compétences\n` +
      `• Son historique de planning\n` +
      `• Sa photo\n\n` +
      `Confirmez-vous la suppression ?`
    );

    if (!confirmDelete) {
      console.log('❌ Suppression annulée par l\'utilisateur');
      return;
    }

    try {
      setDeleting(true);
      console.log('🔄 Début suppression employé ID:', editedEmployee.id);
      
      // Supprimer la photo si elle existe
      if (editedEmployee.photo_url) {
        console.log('📸 Suppression photo employé...');
        try {
          await supabaseCuisine.deleteEmployeePhoto(editedEmployee.photo_url);
          console.log('✅ Photo supprimée');
        } catch (photoError) {
          console.warn('⚠️ Erreur suppression photo (continuons):', photoError);
        }
      }
      
      // Supprimer l'employé de la base
      console.log('🗑️ Suppression employé de la base de données...');
      const result = await supabaseCuisine.deleteEmployeeCuisine(editedEmployee.id);
      
      console.log('📤 Résultat suppression:', result);
      
      if (result.error) {
        // Gestion des erreurs spécifiques
        if (result.error.code === 'EMPLOYEE_HAS_FUTURE_ASSIGNMENTS') {
          toast.error(
            `Impossible de supprimer ${editedEmployee.prenom || editedEmployee.nom} : \n` +
            `Il/Elle est assigné(e) dans des plannings futurs.\n` +
            `Veuillez d'abord retirer ses assignations.`
          );
          return;
        }
        throw new Error(result.error.message);
      }
      
      // Mettre à jour la liste locale (retirer l'employé supprimé)
      console.log('🔄 Mise à jour liste locale...');
      setEmployees(prevEmployees => {
        const newEmployees = prevEmployees.filter(emp => emp.id !== editedEmployee.id);
        console.log(`📊 Liste employés mise à jour: ${prevEmployees.length} → ${newEmployees.length}`);
        return newEmployees;
      });
      
      // Fermer le modal
      console.log('🚪 Fermeture du modal...');
      closeEdit();
      
      // Notification de succès
      toast.success(
        `✅ Employé "${editedEmployee.prenom || editedEmployee.nom}" supprimé avec succès`, 
        { duration: 4000 }
      );
      
      console.log('✅ Suppression terminée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur suppression employé:', error);
      console.error('📊 Détails erreur:', {
        message: error.message,
        stack: error.stack,
        employeeId: editedEmployee.id
      });
      
      // Message d'erreur détaillé
      const errorMessage = error.message || 'Erreur inconnue lors de la suppression';
      toast.error(
        `❌ Erreur lors de la suppression :\n${errorMessage}`, 
        { duration: 6000 }
      );
    } finally {
      setDeleting(false);
      console.log('🏁 Fin du processus de suppression');
    }
  };

  /**
   * Gérer les changements d'employé (pour les photos et horaires)
   */
  const updateEmployeeData = (updates) => {
    if (createMode) {
      setNewEmployee({
        ...newEmployee,
        ...updates
      });
    } else {
      setEditedEmployee({
        ...editedEmployee,
        ...updates
      });
    }
  };

  return {
    // États
    employees,
    postes,
    competences,
    loading,
    searchTerm,
    setSearchTerm,
    selectedEmployee,
    editMode,
    editedEmployee,
    setEditedEmployee,
    saving,
    deleting,
    createMode,
    newEmployee,
    setNewEmployee,
    creating,
    filteredEmployees,
    jours,
    
    // Fonctions
    loadData,
    getEmployeeCompetences,
    openEditEmployee,
    closeEdit,
    openCreateEmployee,
    closeCreate,
    saveEmployee,
    updateCompetence,
    handleCreateEmployee,
    handleDeleteEmployee,
    updateEmployeeData
  };
};

export default useEmployeeManagement; 