import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Edit3,
  Save,
  X,
  User,
  Languages,
  Truck,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Trash2,
  AlertTriangle,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabaseLogistique } from '../lib/supabase-logistique';

const LogistiqueManagement = ({ user, onLogout }) => {
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [competences, setCompetences] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [saving, setSaving] = useState(false);

  // États pour la suppression
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // États pour la création
  const [createMode, setCreateMode] = useState(false);
  const [creating, setCreating] = useState(false);

  const profiles = ['Faible', 'Moyen', 'Fort'];
  const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

  /**
   * Chargement des données
   */
  const loadData = async () => {
    try {
      setLoading(true);
      
      const [employeesResult, vehiculesResult, competencesResult] = await Promise.all([
        supabaseLogistique.getEmployeesLogistique(),
        supabaseLogistique.getVehicules(),
        supabaseLogistique.getCompetencesVehicules()
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (vehiculesResult.error) throw vehiculesResult.error;
      if (competencesResult.error) throw competencesResult.error;
      
      setEmployees(employeesResult.data || []);
      setVehicules(vehiculesResult.data || []);
      setCompetences(competencesResult.data || []);
      
    } catch (error) {
      console.error('❌ Erreur chargement données logistique:', error);
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
   * Ouvrir la modal d'édition
   */
  const openEdit = (employee) => {
    setSelectedEmployee(employee);
    setEditedEmployee({...employee});
    setEditMode(true);
  };

  /**
   * Ouvrir le mode création avec valeurs par défaut
   */
  const openCreate = () => {
    const defaultEmployee = {
      nom: '',
      profil: 'Moyen',
      permis: false,
      langues: [],
      notes: '',
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
    setEditedEmployee(defaultEmployee);
    setCreateMode(true);
  };

  /**
   * Fermer les modals
   */
  const closeEdit = () => {
    setSelectedEmployee(null);
    setEditedEmployee(null);
    setEditMode(false);
    setCreateMode(false);
    setDeleteConfirmOpen(false); // Fermer aussi la confirmation
  };

  /**
   * Sauvegarder les modifications employé
   */
  const saveEmployee = async () => {
    if (!editedEmployee) return;

    try {
      setSaving(true);
      
      // ✅ SEULEMENT LES CHAMPS RÉELS DE LA DB
      const updates = {
        nom: editedEmployee.nom,
        profil: editedEmployee.profil,
        permis: editedEmployee.permis,
        langues: editedEmployee.langues,
        notes: editedEmployee.notes,
        // Horaires par jour
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

      const result = await supabaseLogistique.updateEmployeeLogistique(editedEmployee.id, updates);
      
      if (result.error) throw result.error;
      
      // Mettre à jour la liste locale
      setEmployees(employees.map(emp => 
        emp.id === editedEmployee.id ? { ...emp, ...updates } : emp
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
   * Créer un nouvel employé
   */
  const createEmployee = async () => {
    if (!editedEmployee || !editedEmployee.nom.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    try {
      setCreating(true);
      
      // Préparer les compétences véhicules
      const competencesVehicules = vehicules.map(vehicule => {
        const competence = editedEmployee[`competence_${vehicule.id}`];
        return {
          vehicule_id: vehicule.id,
          niveau: competence || 'Aucune'
        };
      });

      const employeeData = {
        ...editedEmployee,
        competencesVehicules
      };

      const result = await supabaseLogistique.createEmployeeLogistique(employeeData);
      
      if (result.error) {
        if (result.error.code === 'EMPLOYEE_NAME_EXISTS') {
          toast.error(result.error.message);
        } else {
          throw result.error;
        }
        return;
      }
      
      // Mettre à jour la liste locale
      setEmployees([...employees, result.data]);
      
      toast.success(`${result.data.nom} a été créé avec succès`);
      closeEdit();
      
    } catch (error) {
      console.error('❌ Erreur création employé:', error);
      toast.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  /**
   * Ouvrir la confirmation de suppression
   */
  const openDeleteConfirm = () => {
    setDeleteConfirmOpen(true);
  };

  /**
   * Fermer la confirmation de suppression
   */
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
  };

  /**
   * Supprimer l'employé après confirmation
   */
  const deleteEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      setDeleting(true);
      
      const result = await supabaseLogistique.deleteEmployeeLogistique(selectedEmployee.id);
      
      if (result.error) {
        if (result.error.code === 'FUTURE_ASSIGNMENTS_EXIST') {
          toast.error(result.error.message, { duration: 5000 });
        } else {
          throw result.error;
        }
        return;
      }
      
      // Mettre à jour la liste locale
      setEmployees(employees.filter(emp => emp.id !== selectedEmployee.id));
      
      toast.success(`${selectedEmployee.nom} a été supprimé avec succès`);
      closeEdit();
      closeDeleteConfirm();
      
    } catch (error) {
      console.error('❌ Erreur suppression employé:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Mettre à jour une compétence véhicule
   */
  const updateCompetence = async (employeeId, vehiculeId, niveau) => {
    try {
      console.log('🔧 Mise à jour compétence:', { employeeId, vehiculeId, niveau });
      
      // Utiliser la fonction updateCompetenceVehicule qui gère tout (création, mise à jour, suppression)
      const result = await supabaseLogistique.updateCompetenceVehicule(employeeId, vehiculeId, niveau);
      
      if (result.error) throw result.error;
      
      // Recharger les compétences pour mettre à jour l'interface
      const competencesResult = await supabaseLogistique.getCompetencesVehicules();
      if (!competencesResult.error) {
        setCompetences(competencesResult.data);
      }
      
      if (niveau && niveau !== 'Aucune') {
        toast.success(`Compétence mise à jour: ${niveau}`);
      } else {
        toast.success('Compétence supprimée');
      }
      
    } catch (error) {
      console.error('❌ Erreur updateCompetence:', error);
      toast.error('Erreur lors de la mise à jour de la compétence');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-slate-200 max-w-md w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-blue-600 mx-auto mb-8"></div>
          <h3 className="text-2xl font-bold text-slate-800 mb-4">Chargement</h3>
          <p className="text-slate-600">Préparation des données logistique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Premium Responsive */}
      <div className="bg-white/80 backdrop-blur-xl shadow-xl border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 md:space-x-6">
              <button
                onClick={() => navigate('/logistique')}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-all duration-200 hover:bg-slate-100 px-3 md:px-4 py-2 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-medium text-sm md:text-base">Retour</span>
              </button>
              <div className="hidden md:block h-8 w-px bg-slate-300"></div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                  Gestion Équipe Logistique
                </h1>
                <p className="text-slate-600 mt-1 text-sm md:text-base">
                  {employees.length} employés • {vehicules.length} véhicules
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onLogout()}
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors text-sm md:text-base"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header avec recherche et bouton nouveau */}
        <div className="mb-6 md:mb-8">
          {/* Bouton Nouveau employé */}
          <div className="flex justify-end mb-4">
            <button
              onClick={openCreate}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau employé</span>
            </button>
          </div>

          {/* Barre de recherche premium responsive */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 md:h-6 md:w-6 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un employé par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-12 md:pl-16 pr-4 md:pr-6 py-4 md:py-5 bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-2xl text-base md:text-lg placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-xl transition-all duration-200"
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 pr-4 md:pr-6 flex items-center">
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            )}
          </div>
          
          {searchTerm && (
            <div className="text-center mt-4">
              <p className="text-slate-600 text-sm md:text-base">
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
                  <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    {/* Header carte */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 md:p-6 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg ${
                            employee.profil === 'Fort' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                            employee.profil === 'Moyen' ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 
                            'bg-gradient-to-br from-rose-500 to-rose-600'
                          }`}>
                            {employee.nom.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg md:text-xl font-bold text-slate-800 truncate">{employee.nom}</h3>
                            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3 mt-2">
                              <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium w-fit ${
                                employee.profil === 'Fort' ? 'bg-emerald-100 text-emerald-700' :
                                employee.profil === 'Moyen' ? 'bg-amber-100 text-amber-700' : 
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {employee.profil}
                              </span>
                              {employee.permis && (
                                <span className="bg-blue-100 text-blue-700 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium flex items-center w-fit">
                                  <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                                  Permis
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => openEdit(employee)}
                          className="p-2 md:p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group-hover:scale-110 flex-shrink-0"
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
                          <Clock className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">Horaires</span>
                        </div>
                        <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
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
                            <Languages className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-700">Langues</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {employee.langues.slice(0, 3).map((langue, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-700 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium">
                                {langue}
                              </span>
                            ))}
                            {employee.langues.length > 3 && (
                              <span className="bg-slate-200 text-slate-600 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium">
                                +{employee.langues.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Compétences véhicules */}
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Truck className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700">
                            Compétences ({employeeCompetences.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {employeeCompetences.length > 0 ? (
                            employeeCompetences.slice(0, 3).map((comp, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-slate-50 rounded-xl">
                                <span className="text-xs md:text-sm font-medium text-slate-700 truncate mr-2">
                                  {comp.vehicule?.nom}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                  comp.niveau === 'XX' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {comp.niveau === 'XX' ? 'Autonome' : 'En formation'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-slate-500 italic text-center py-3">
                              Aucune compétence
                            </div>
                          )}
                          {employeeCompetences.length > 3 && (
                            <div className="text-xs text-slate-500 text-center">
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
            <User className="w-16 h-16 md:w-20 md:h-20 text-slate-300 mx-auto mb-6" />
            <h3 className="text-lg md:text-xl font-medium text-slate-700 mb-2">
              {searchTerm ? 'Aucun employé trouvé' : 'Aucun employé'}
            </h3>
            <p className="text-slate-500 text-sm md:text-base">
              {searchTerm ? 'Essayez de modifier votre recherche' : 'Chargement en cours...'}
            </p>
          </div>
        )}
      </div>

      {/* Modal d'édition/création employé */}
      <AnimatePresence>
        {(editMode || createMode) && (
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
              className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 md:p-8 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg md:text-xl ${
                      (selectedEmployee?.profil || editedEmployee?.profil) === 'Fort' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                      (selectedEmployee?.profil || editedEmployee?.profil) === 'Moyen' ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 
                      'bg-gradient-to-br from-rose-500 to-rose-600'
                    }`}>
                      {createMode ? (
                        editedEmployee?.nom ? 
                          editedEmployee.nom.split(' ').map(n => n[0]).join('').substring(0, 2) : 
                          '?'
                      ) : (
                        selectedEmployee?.nom?.split(' ').map(n => n[0]).join('').substring(0, 2)
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-slate-800">
                        {editMode ? 'Modifier l\'employé' : 'Nouvel employé'}
                      </h2>
                      <p className="text-slate-600 mt-1 text-sm md:text-base">
                        {createMode ? (editedEmployee?.nom || 'Saisissez le nom') : selectedEmployee?.nom}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeEdit}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
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
                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                      Informations générales
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nom complet</label>
                      <input
                        type="text"
                        value={editedEmployee?.nom || ''}
                        onChange={(e) => setEditedEmployee({...editedEmployee, nom: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Profil</label>
                      <select
                        value={editedEmployee?.profil || ''}
                        onChange={(e) => setEditedEmployee({...editedEmployee, profil: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {profiles.map(profile => (
                          <option key={profile} value={profile}>{profile}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={editedEmployee?.permis || false}
                          onChange={(e) => setEditedEmployee({...editedEmployee, permis: e.target.checked})}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-slate-700">Possède un permis de conduire</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                      <textarea
                        value={editedEmployee?.notes || ''}
                        onChange={(e) => setEditedEmployee({...editedEmployee, notes: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Notes supplémentaires..."
                      />
                    </div>
                  </div>

                  {/* Horaires par jour */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">
                      Horaires par jour
                    </h3>
                    
                    <div className="space-y-4">
                      {jours.map(jour => (
                        <div key={jour} className="bg-slate-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-700 capitalize">
                              {jour}
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Début</label>
                              <input
                                type="time"
                                value={editedEmployee?.[`${jour}_debut`] || '08:00'}
                                onChange={(e) => setEditedEmployee({
                                  ...editedEmployee, 
                                  [`${jour}_debut`]: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Fin</label>
                              <input
                                type="time"
                                value={editedEmployee?.[`${jour}_fin`] || '16:00'}
                                onChange={(e) => setEditedEmployee({
                                  ...editedEmployee, 
                                  [`${jour}_fin`]: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Compétences véhicules */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                    Compétences véhicules
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicules.map(vehicule => {
                      const competence = competences.find(comp => 
                        comp.employee_id === selectedEmployee?.id && comp.vehicule_id === vehicule.id
                      );
                      
                      return (
                        <div key={vehicule.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div>
                            <span className="font-medium text-slate-800">{vehicule.nom}</span>
                            <div className="text-sm text-slate-600">{vehicule.capacite} places</div>
                          </div>
                          <select
                            value={competence?.niveau || editedEmployee?.[`competence_${vehicule.id}`] || 'Aucune'}
                            onChange={(e) => {
                              if (createMode) {
                                // Mode création : mettre à jour l'état local
                                setEditedEmployee({
                                  ...editedEmployee,
                                  [`competence_${vehicule.id}`]: e.target.value
                                });
                              } else {
                                // Mode édition : appel API
                                updateCompetence(selectedEmployee?.id, vehicule.id, e.target.value);
                              }
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="Aucune">Aucune</option>
                            <option value="en formation">En formation</option>
                            <option value="XX">Autonome</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 mt-8 pt-6 border-t border-slate-200">
                  {/* Bouton supprimer à gauche (seulement en mode édition) */}
                  {editMode && (
                    <button
                      onClick={openDeleteConfirm}
                      className="w-full md:w-auto px-6 py-3 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 font-medium rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer l'employé</span>
                    </button>
                  )}
                  
                  {/* Actions principales à droite */}
                  <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4 ml-auto">
                    <button
                      onClick={closeEdit}
                      className="w-full md:w-auto px-6 py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={createMode ? createEmployee : saveEmployee}
                      disabled={saving || creating}
                      className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {saving || creating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>{saving ? 'Sauvegarde...' : 'Création...'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{editMode ? 'Sauvegarder' : 'Créer'}</span>
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

      {/* Modal de confirmation de suppression */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeDeleteConfirm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-red-50 px-6 py-4 border-b border-red-100">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Confirmer la suppression</h3>
                    <p className="text-sm text-red-700">Cette action est irréversible</p>
                  </div>
                </div>
              </div>

              {/* Contenu */}
              <div className="px-6 py-4">
                <p className="text-slate-600 mb-4">
                  Êtes-vous sûr de vouloir supprimer <strong>{selectedEmployee?.nom}</strong> ?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Cette action va supprimer :</p>
                      <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                        <li>L'employé et ses informations</li>
                        <li>Ses compétences véhicules</li>
                        <li>Ses absences</li>
                        <li>Son historique de plannings</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={deleteEmployee}
                  disabled={deleting}
                  className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer définitivement</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogistiqueManagement; 