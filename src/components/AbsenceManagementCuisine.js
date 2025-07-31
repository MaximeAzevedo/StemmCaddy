import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  ArrowLeft,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Home,
  ChefHat
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabaseCuisine } from '../lib/supabase-cuisine';
// import CuisineAIAssistant from './CuisineAIAssistant'; // ❌ SUPPRIMÉ - Remplacé par Rémy global

const AbsenceManagementCuisine = ({ user, onLogout }) => {
  const [absences, setAbsences] = useState([]);
  const [employeesCuisine, setEmployeesCuisine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dataError, setDataError] = useState(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    date_debut: '',
    date_fin: '',
    motif: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setDataError(null);
      
      // Charger employés cuisine et absences en parallèle
      const [employeesResult, absencesResult] = await Promise.all([
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getAbsencesCuisine()
      ]);

      // Vérifier les erreurs spécifiques
      if (employeesResult.error) {
        console.error('Erreur employés cuisine:', employeesResult.error);
        throw new Error(`Erreur lors du chargement des employés cuisine: ${employeesResult.error.message}`);
      }
      
      if (absencesResult.error) {
        // Si la table absences_cuisine n'existe pas, c'est un cas spécial
        if (absencesResult.error.code === '42P01') {
          setDataError('La table des absences cuisine n\'existe pas encore. Veuillez exécuter le schéma SQL dans Supabase.');
          console.warn('Table absences_cuisine non trouvée - utilisation données de démo');
          setAbsences([]);
        } else {
          console.error('Erreur absences cuisine:', absencesResult.error);
          throw new Error(`Erreur lors du chargement des absences: ${absencesResult.error.message}`);
        }
      } else {
        setAbsences(absencesResult.data || []);
      }

      // 🔧 STRUCTURE CORRIGÉE : employés directs sans imbrication
      const employees = (employeesResult.data || [])
        .filter(emp => emp && emp.id && emp.prenom)
        .map(emp => ({
          id: emp.id,
          nom: emp.prenom,
          prenom: emp.prenom,
          photo_url: emp.photo_url,
          langue_parlee: emp.langue_parlee
        }));
      
      setEmployeesCuisine(employees);
      
      // Log pour debug
      console.log('✅ Employés cuisine chargés:', employees.length);
      console.log('✅ Absences cuisine chargées:', absencesResult.data?.length || 0);

    } catch (error) {
      console.error('Erreur chargement données cuisine:', error);
      setDataError(error.message);
      toast.error(`Erreur: ${error.message}`);
      
      // Données de démonstration en cas d'erreur
      setEmployeesCuisine([
        { id: 1, nom: 'Salah', prenom: 'Salah', langue_parlee: 'Arabe' },
        { id: 2, nom: 'Majda', prenom: 'Majda', langue_parlee: 'Yougoslave' },
        { id: 3, nom: 'Mahmoud', prenom: 'Mahmoud', langue_parlee: 'Arabe' },
        { id: 4, nom: 'Mohammad', prenom: 'Mohammad', langue_parlee: 'Arabe' },
        { id: 5, nom: 'Amar', prenom: 'Amar', langue_parlee: 'Arabe' }
      ]);
      
      setAbsences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.date_debut || !formData.date_fin) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (new Date(formData.date_fin) < new Date(formData.date_debut)) {
      toast.error('La date de fin doit être postérieure à la date de début');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // 🔧 STRUCTURE CORRIGÉE : pas de colonne statut
      const absenceData = {
        employee_id: parseInt(formData.employee_id),
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        type_absence: 'Absent',
        motif: formData.motif || null
        // ❌ Supprimé : statut (colonne n'existe pas)
      };

      let result;
      
      if (selectedAbsence) {
        // Modification via l'API cuisine
        result = await supabaseCuisine.updateAbsenceCuisine(selectedAbsence.id, absenceData);
        if (result.error) throw result.error;
        toast.success('Absence modifiée avec succès');
      } else {
        // Création via l'API cuisine
        result = await supabaseCuisine.createAbsenceCuisine(absenceData);
        if (result.error) throw result.error;
        toast.success('Absence ajoutée avec succès');
      }
      
      setShowModal(false);
      resetForm();
      await loadData(); // Recharger les données
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      
      // Messages d'erreur spécifiques
      if (error.code === '42P01') {
        toast.error('La table des absences cuisine n\'existe pas. Veuillez configurer la base de données.');
        setDataError('Base de données non configurée');
      } else if (error.code === '23503') {
        toast.error('Employé invalide sélectionné');
      } else {
        toast.error(`Erreur lors de la sauvegarde: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette absence ?')) return;
    
    try {
      const result = await supabaseCuisine.deleteAbsenceCuisine(id);
      if (result.error) throw result.error;
      
      toast.success('Absence supprimée avec succès');
      await loadData(); // Recharger les données
      
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date_debut: '',
      date_fin: '',
      motif: ''
    });
    setSelectedAbsence(null);
  };

  const openModal = (absence = null) => {
    if (absence) {
      setFormData({
        employee_id: absence.employee_id.toString(),
        date_debut: absence.date_debut,
        date_fin: absence.date_fin,
        motif: absence.motif || ''
      });
      setSelectedAbsence(absence);
    } else {
      resetForm();
      // Pré-remplir avec la date d'aujourd'hui
      const today = format(new Date(), 'yyyy-MM-dd');
      setFormData(prev => ({
        ...prev,
        date_debut: today,
        date_fin: today
      }));
    }
    setShowModal(true);
  };

  const filteredAbsences = absences.filter(absence => {
    // 🔧 STRUCTURE CORRIGÉE : employe.prenom au lieu de employee_nom
    const employeeName = absence.employe?.prenom || 
                        employeesCuisine.find(e => e.id === absence.employee_id)?.nom || 
                        'Inconnu';
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (absence.motif || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getEmployeesWithAbsences = () => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
    
    return employeesCuisine.filter(employee => employee && employee.id).map(employee => {
      const employeeAbsences = absences.filter(absence => 
        absence.employee_id === employee.id &&
        weekDays.some(day => 
          day >= parseISO(absence.date_debut) && day <= parseISO(absence.date_fin)
        )
      );
      
      return {
        ...employee,
        absences: employeeAbsences,
        daysAbsent: weekDays.map(day => ({
          date: day,
          absent: employeeAbsences.some(absence => 
            day >= parseISO(absence.date_debut) && day <= parseISO(absence.date_fin)
          )
        }))
      };
    });
  };

  const getDaysDuration = (dateDebut, dateFin) => {
    const debut = parseISO(dateDebut);
    const fin = parseISO(dateFin);
    const diffTime = Math.abs(fin - debut);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getEmployeeNameById = (id) => {
    const employee = employeesCuisine.find(e => e.id === id);
    return employee ? employee.nom : 'Employé inconnu';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des absences cuisine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => window.location.href = '/cuisine'}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
                title="Retour au module cuisine"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <ChefHat className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Absences - Cuisine</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadData}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg"
                title="Actualiser"
              >
                <Home className="w-5 h-5" />
              </button>
              <span className="text-gray-600">{user?.email || 'Utilisateur'}</span>
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
        
        {/* Alertes d'erreur */}
        {dataError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <h3 className="font-medium text-red-900">Problème de configuration</h3>
                <p className="text-red-700 text-sm mt-1">{dataError}</p>
                {dataError.includes('table') && (
                  <p className="text-red-600 text-sm mt-2">
                    💡 Solution : Créez la table <code>absences_cuisine</code> dans votre Supabase SQL Editor.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions et filtres */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par employé ou motif..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => openModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center"
              disabled={employeesCuisine.length === 0}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle absence
            </button>
          </div>
        </div>

        {/* Vue calendrier hebdomadaire */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Vue hebdomadaire - Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Précédente
              </button>
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                Suivante →
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium text-gray-700">Employé Cuisine</th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(currentWeek, i);
                    return (
                      <th key={i} className="text-center p-2 font-medium text-gray-700">
                        <div>{format(day, 'EEE', { locale: fr })}</div>
                        <div className="text-xs text-gray-500">{format(day, 'dd/MM')}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {getEmployeesWithAbsences().map(employee => (
                  <tr key={employee.id} className="border-t border-gray-200">
                    <td className="p-2 font-medium">
                      <div className="flex items-center space-x-2">
                        <ChefHat className="w-4 h-4 text-blue-600" />
                        <span>{employee?.nom || 'N/A'} {employee?.prenom || ''}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {employee?.profil || 'N/A'}
                        </span>
                      </div>
                    </td>
                    {employee.daysAbsent.map((day, i) => (
                      <td key={i} className="p-2 text-center">
                        {day.absent ? (
                          <div className="w-8 h-8 mx-auto rounded-full bg-red-100 flex items-center justify-center border border-red-200">
                            <Clock className="w-4 h-4 text-red-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {employeesCuisine.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ChefHat className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun employé cuisine trouvé</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white shadow-lg rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{employeesCuisine.length}</div>
            <div className="text-sm text-gray-600">Employés cuisine</div>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {employeesCuisine.length - filteredAbsences.filter(a => 
                new Date() >= parseISO(a.date_debut) && new Date() <= parseISO(a.date_fin)
              ).length}
            </div>
            <div className="text-sm text-gray-600">Disponibles aujourd'hui</div>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {filteredAbsences.filter(a => 
                new Date() >= parseISO(a.date_debut) && new Date() <= parseISO(a.date_fin)
              ).length}
            </div>
            <div className="text-sm text-gray-600">Absents aujourd'hui</div>
          </div>
        </div>

        {/* Liste des absences */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Liste des Absences Cuisine</h2>
          
          <div className="space-y-4">
            {filteredAbsences.map(absence => (
              <motion.div
                key={absence.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-violet-200 rounded-full flex items-center justify-center">
                      <ChefHat className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {absence.employe?.prenom || getEmployeeNameById(absence.employee_id)}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{format(parseISO(absence.date_debut), 'dd/MM/yyyy')}</span>
                        <span>→</span>
                        <span>{format(parseISO(absence.date_fin), 'dd/MM/yyyy')}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {getDaysDuration(absence.date_debut, absence.date_fin)} jour{getDaysDuration(absence.date_debut, absence.date_fin) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="px-3 py-1 rounded-full text-sm font-medium border bg-blue-100 text-blue-800 border-blue-200">
                      {absence.type_absence || 'Absent'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openModal(absence)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Modifier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(absence.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {absence.motif && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <strong>Motif :</strong> {absence.motif}
                  </div>
                )}
              </motion.div>
            ))}
            
            {filteredAbsences.length === 0 && !dataError && (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                <p>Aucune absence enregistrée</p>
                {searchTerm && <p className="text-sm mt-2">Aucun résultat pour "{searchTerm}"</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal formulaire */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {selectedAbsence ? 'Modifier l\'absence' : 'Nouvelle absence cuisine'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employé Cuisine <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un employé</option>
                    {employeesCuisine.filter(employee => employee && employee.id && employee.nom).map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.nom} {employee.langue_parlee ? `(${employee.langue_parlee})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date début <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) => setFormData({...formData, date_debut: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) => setFormData({...formData, date_fin: e.target.value})}
                      required
                      min={formData.date_debut}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Motif (optionnel)</label>
                  <textarea
                    value={formData.motif}
                    onChange={(e) => setFormData({...formData, motif: e.target.value})}
                    placeholder="Raison de l'absence (maladie, congés, formation...)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    disabled={submitting}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Sauvegarde...' : (selectedAbsence ? 'Modifier' : 'Ajouter')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assistant IA spécialisé Cuisine */}
              {/* <CuisineAIAssistant onDataRefresh={loadData} /> */}
        {/* ❌ SUPPRIMÉ - Rémy (HRChatbotAutonome) est maintenant global dans App.js */}
    </div>
  );
};

export default AbsenceManagementCuisine; 