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
  Truck,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabaseLogistique } from '../lib/supabase-logistique';

const AbsenceManagementLogistique = ({ user, onLogout }) => {
  const [absences, setAbsences] = useState([]);
  const [employeesLogistique, setEmployeesLogistique] = useState([]);
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
    type_absence: 'Absent',
    motif: '',
    heure_debut: ''
    // heure_fin supprimé - on n'en a plus besoin
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setDataError(null);
      
      // Charger employés logistique et absences en parallèle
      const [employeesResult, absencesResult] = await Promise.all([
        supabaseLogistique.getEmployeesLogistique(),
        supabaseLogistique.getAbsencesLogistique()
      ]);

      // Vérifier les erreurs spécifiques
      if (employeesResult.error) {
        console.error('❌ Erreur employés:', employeesResult.error);
        if (employeesResult.error.code === '42P01') {
          setDataError('La table des employés logistique n\'existe pas');
          toast.error('Configuration de base de données requise');
        } else {
          setDataError('Erreur de chargement des employés');
          toast.error('Impossible de charger les employés');
        }
        setEmployeesLogistique([]);
      } else {
        setEmployeesLogistique(employeesResult.data || []);
      }

      if (absencesResult.error) {
        console.error('❌ Erreur absences:', absencesResult.error);
        if (absencesResult.error.code === '42P01') {
          setDataError('La table des absences logistique n\'existe pas');
          toast.error('Configuration de base de données requise');
        } else {
          setDataError('Erreur de chargement des absences');
          toast.error('Impossible de charger les absences');
        }
        setAbsences([]);
      } else {
        setAbsences(absencesResult.data || []);
      }

    } catch (error) {
      console.error('💥 Erreur critique loadData:', error);
      setDataError('Erreur de connexion');
      toast.error('Erreur de connexion à la base de données');
      setEmployeesLogistique([]);
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
    
    // Validation
    if (formData.type_absence !== 'Fermeture' && !formData.employee_id) {
      toast.error('Veuillez sélectionner un employé');
      return;
    }
    
    if (!formData.date_debut) {
      toast.error('Veuillez sélectionner une date');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Préparer les données d'absence
      const absenceData = {
        employee_id: formData.type_absence === 'Fermeture' ? null : parseInt(formData.employee_id),
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || formData.date_debut, // Par défaut, absence d'un jour
        type_absence: formData.type_absence,
        motif: formData.motif || null,
        heure_debut: (formData.type_absence === 'Rendez-vous' && formData.heure_debut) ? formData.heure_debut : null,
        heure_fin: null // Toujours null pour simplifier
      };
      
      let result;
      
      if (selectedAbsence) {
        // Modification d'une absence existante
        result = await supabaseLogistique.updateAbsence(selectedAbsence.id, absenceData);
      } else {
        // Création d'une nouvelle absence
        result = await supabaseLogistique.addAbsence(absenceData);
      }
      
      if (result.error) throw result.error;
      
      toast.success(selectedAbsence ? 'Absence modifiée !' : 'Absence enregistrée !');
      setShowModal(false);
      resetForm();
      await loadData(); // Recharger les données
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      
      if (error.code === '42P01') {
        toast.error('Table absences non configurée');
        setDataError('Base de données non configurée');
      } else if (error.code === '23503') {
        toast.error('Employé invalide sélectionné');
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette absence ?')) return;
    
    try {
      const result = await supabaseLogistique.deleteAbsence(id);
      if (result.error) throw result.error;
      
      toast.success('Absence supprimée !');
      await loadData();
      
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date_debut: '',
      date_fin: '',
      type_absence: 'Absent',
      motif: '',
      heure_debut: ''
    });
    setSelectedAbsence(null);
  };

  const openModal = (absence = null) => {
    if (absence) {
      setFormData({
        employee_id: absence.employee_id?.toString() || '',
        date_debut: absence.date_debut || '',
        date_fin: absence.date_fin || '',
        type_absence: absence.type_absence || 'Absent',
        motif: absence.motif || '',
        heure_debut: absence.heure_debut || ''
      });
      setSelectedAbsence(absence);
    } else {
      // Pré-remplir avec la date du jour
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        employee_id: '',
        date_debut: today,
        date_fin: today,
        type_absence: 'Absent',
        motif: '',
        heure_debut: ''
      });
      setSelectedAbsence(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Filtrer les absences selon le terme de recherche ET la semaine sélectionnée
  const filteredAbsences = absences.filter(absence => {
    // Filtre par semaine : absences qui intersectent avec la semaine sélectionnée
    const weekStart = format(currentWeek, 'yyyy-MM-dd');
    const weekEnd = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
    
    const absenceStart = absence.date_debut;
    const absenceEnd = absence.date_fin;
    
    // Une absence est visible si elle chevauche avec la semaine
    const isInWeek = (absenceStart <= weekEnd) && (absenceEnd >= weekStart);
    
    if (!isInWeek) return false;
    
    // Filtre par terme de recherche
    if (!searchTerm) return true;
    
    const employee = employeesLogistique.find(emp => emp.id === absence.employee_id);
    const employeeName = employee?.nom || '';
    
    return (
      employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.motif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      absence.type_absence?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Obtenir le nom de l'employé
  const getEmployeeName = (employeeId) => {
    const employee = employeesLogistique.find(emp => emp.id === employeeId);
    return employee?.nom || 'Employé inconnu';
  };

  // Obtenir le statut de l'absence (active, passée, future)
  const getAbsenceStatus = (absence) => {
    const today = new Date();
    const absenceDate = new Date(absence.date_debut);
    
    // Comparer seulement les dates (pas l'heure)
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetDate = new Date(absenceDate.getFullYear(), absenceDate.getMonth(), absenceDate.getDate());
    
    if (targetDate < todayDate) {
      return { type: 'passed', label: 'Terminée', color: 'bg-gray-500' };
    } else if (targetDate.getTime() === todayDate.getTime()) {
      return { type: 'active', label: 'Aujourd\'hui', color: 'bg-red-500' };
    } else {
      return { type: 'future', label: 'Planifiée', color: 'bg-blue-500' };
    }
  };

  // Fonction pour obtenir le statut d'un employé un jour donné
  const getEmployeeStatusOnDay = (employeeId, day) => {
    const dayString = format(day, 'yyyy-MM-dd');
    
    // 🚫 PRIORITÉ 1: Vérifier d'abord s'il y a une fermeture du service ce jour-là
    const fermeture = absences.find(absence => {
      return absence.type_absence === 'Fermeture' &&
             absence.employee_id === null &&
             dayString >= absence.date_debut && 
             dayString <= absence.date_fin;
    });
    
    if (fermeture) {
      // Service fermé = tous les employés sont "fermés"
      return {
        isAbsent: true,
        type: 'Fermeture',
        label: 'Service fermé',
        color: 'bg-gray-600',
        abbreviation: 'FERMÉ'
      };
    }
    
    // ⚠️ PRIORITÉ 2: Chercher une absence individuelle pour cet employé ce jour-là
    const absence = absences.find(absence => {
      if (absence.employee_id !== employeeId) return false;
      if (absence.type_absence === 'Fermeture') return false; // Déjà traité ci-dessus
      
      // Vérifier si le jour se trouve dans la plage d'absence
      const dateDebut = absence.date_debut;
      const dateFin = absence.date_fin;
      
      return dayString >= dateDebut && dayString <= dateFin;
    });
    
    if (absence) {
      // Retourner les infos de l'absence avec couleur et abréviation
      const typeInfo = typeAbsenceOptions.find(opt => opt.value === absence.type_absence) || 
                       { value: 'Absent', label: 'Absent', color: 'bg-red-500' };
      
      return {
        isAbsent: true,
        type: absence.type_absence,
        label: typeInfo.label,
        color: typeInfo.color,
        abbreviation: getAbsenceAbbreviation(absence.type_absence, absence.heure_debut)
      };
    } else {
      // Employé présent
      return {
        isAbsent: false,
        type: 'Présent',
        label: 'Présent',
        color: 'bg-green-500',
        abbreviation: '✓'
      };
    }
  };

  // Fonction pour obtenir l'abréviation du type d'absence
  const getAbsenceAbbreviation = (type, heure_debut = null) => {
    switch(type) {
      case 'Absent': return 'ABS';
      case 'Congé': return 'CONG';
      case 'Maladie': return 'MAL';
      case 'Formation': return 'FORM';
      case 'Rendez-vous': 
        if (heure_debut) {
          const heure = heure_debut.split(':')[0]; // Extraire l'heure (ex: "10" de "10:30")
          return `RDV ${heure}h`;
        }
        return 'RDV';
      case 'Fermeture': return 'FERMÉ';
      default: return 'ABS';
    }
  };

  // Fonction pour savoir si un employé est absent un jour donné (pour compatibilité)
  const isEmployeeAbsentOnDay = (employeeId, day) => {
    return getEmployeeStatusOnDay(employeeId, day).isAbsent;
  };

  // Fonction pour obtenir les stats
  const getStats = () => {
    const today = new Date();
    const todayString = format(today, 'yyyy-MM-dd');
    
    // Compter les employés absents aujourd'hui en tenant compte des plages de dates
    const todayAbsentEmployees = new Set(); // Utiliser un Set pour éviter les doublons
    
    absences.forEach(absence => {
      // Vérifier si aujourd'hui se trouve dans la plage d'absence
      if (todayString >= absence.date_debut && todayString <= absence.date_fin) {
        todayAbsentEmployees.add(absence.employee_id);
      }
    });
    
    const totalAbsents = todayAbsentEmployees.size;
    const totalPresents = Math.max(0, employeesLogistique.length - totalAbsents);
    
    return {
      totalPresents,
      totalAbsents
    };
  };

  // Types d'absence disponibles
  const typeAbsenceOptions = [
    { value: 'Absent', label: 'Absent', color: 'bg-red-500' },
    { value: 'Congé', label: 'Congé', color: 'bg-blue-500' },
    { value: 'Maladie', label: 'Maladie', color: 'bg-yellow-500' },
    { value: 'Formation', label: 'Formation', color: 'bg-green-500' },
    { value: 'Rendez-vous', label: 'Rendez-vous', color: 'bg-orange-500' },
    { value: 'Fermeture', label: 'Fermeture service', color: 'bg-gray-600' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des absences...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour
              </button>
              <div className="flex items-center space-x-3">
                <Truck className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Absences Logistique</h1>
                  <p className="text-sm text-gray-500">
                    {filteredAbsences.length} absence{filteredAbsences.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => openModal()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouvelle absence
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Message d'erreur */}
        {dataError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{dataError}</span>
            </div>
          </div>
        )}

        {/* Vue calendrier hebdomadaire */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Vue hebdomadaire - Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Précédente
              </button>
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Suivante →
              </button>
            </div>
          </div>

          {/* Légende des statuts */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Légende des statuts :</h3>
            <div className="flex flex-wrap gap-4">
              {/* Présent */}
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-300">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-sm text-gray-600">Présent</span>
              </div>
              
              {/* Types d'absence */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-6 rounded-lg bg-red-100 border-2 border-red-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-red-700">ABS</span>
                </div>
                <span className="text-sm text-gray-600">Absent</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-6 rounded-lg bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700">CONG</span>
                </div>
                <span className="text-sm text-gray-600">Congé</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-6 rounded-lg bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-yellow-700">MAL</span>
                </div>
                <span className="text-sm text-gray-600">Maladie</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-6 rounded-lg bg-purple-100 border-2 border-purple-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-700">FORM</span>
                </div>
                <span className="text-sm text-gray-600">Formation</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-6 rounded-lg bg-orange-100 border-2 border-orange-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-700">RDV</span>
                </div>
                <span className="text-sm text-gray-600">Rendez-vous</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-8 h-6 rounded-lg bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700">FERMÉ</span>
                </div>
                <span className="text-sm text-gray-600">Service fermé</span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="sticky top-0 bg-white shadow-sm z-10 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700 bg-white border-r border-gray-200">Employé Logistique</th>
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(currentWeek, i);
                    return (
                      <th key={i} className="text-center p-3 font-medium text-gray-700 bg-white border-r border-gray-200 last:border-r-0">
                        <div>{format(day, 'EEE', { locale: fr })}</div>
                        <div className="text-xs text-gray-500">{format(day, 'dd/MM')}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {employeesLogistique.map(employee => (
                  <tr key={employee.id} className="border-t border-gray-200">
                    <td className="p-3 font-medium">
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span>{employee.nom}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {employee.profil}
                        </span>
                      </div>
                    </td>
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = addDays(currentWeek, i);
                      const status = getEmployeeStatusOnDay(employee.id, day);
                      
                      return (
                        <td key={i} className="p-3 text-center">
                          {status.isAbsent ? (
                            <div className={`w-12 h-8 mx-auto rounded-lg flex items-center justify-center border-2 ${
                              status.type === 'Absent' ? 'bg-red-100 border-red-300' :
                              status.type === 'Congé' ? 'bg-blue-100 border-blue-300' :
                              status.type === 'Maladie' ? 'bg-yellow-100 border-yellow-300' :
                              status.type === 'Formation' ? 'bg-purple-100 border-purple-300' :
                              status.type === 'Rendez-vous' ? 'bg-orange-100 border-orange-300' :
                              status.type === 'Fermeture' ? 'bg-gray-100 border-gray-300' :
                              'bg-red-100 border-red-300'
                            }`}>
                              <span className={`text-xs font-bold ${
                                status.type === 'Absent' ? 'text-red-700' :
                                status.type === 'Congé' ? 'text-blue-700' :
                                status.type === 'Maladie' ? 'text-yellow-700' :
                                status.type === 'Formation' ? 'text-purple-700' :
                                status.type === 'Rendez-vous' ? 'text-orange-700' :
                                status.type === 'Fermeture' ? 'text-gray-700' :
                                'text-red-700'
                              }`}>
                                {status.abbreviation}
                              </span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 mx-auto rounded-full bg-green-100 flex items-center justify-center border-2 border-green-300">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {employeesLogistique.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun employé logistique trouvé</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white shadow-lg rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{employeesLogistique.length}</div>
            <div className="text-sm text-gray-600">Employés logistique</div>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {getStats().totalPresents}
            </div>
            <div className="text-sm text-gray-600">Présents aujourd'hui</div>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {getStats().totalAbsents}
            </div>
            <div className="text-sm text-gray-600">Absents aujourd'hui</div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Absences de la semaine ({format(currentWeek, 'dd/MM')} - {format(addDays(currentWeek, 6), 'dd/MM')})
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par nom d'employé, motif ou type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Liste des absences */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredAbsences.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune absence</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Aucune absence ne correspond à votre recherche.' : 'Aucune absence enregistrée pour le moment.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motif
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAbsences.map((absence) => {
                    const status = getAbsenceStatus(absence);
                    const typeOption = typeAbsenceOptions.find(opt => opt.value === absence.type_absence);
                    
                    return (
                      <motion.tr
                        key={absence.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {getEmployeeName(absence.employee_id)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${typeOption?.color || 'bg-gray-500'}`}
                          >
                            {absence.type_absence}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            const dateDebut = parseISO(absence.date_debut);
                            const dateFin = parseISO(absence.date_fin);
                            
                            // Si même date, afficher juste la date
                            if (absence.date_debut === absence.date_fin) {
                              return format(dateDebut, 'dd/MM/yyyy', { locale: fr });
                            } else {
                              // Sinon afficher la période
                              return `Du ${format(dateDebut, 'dd/MM/yyyy', { locale: fr })} au ${format(dateFin, 'dd/MM/yyyy', { locale: fr })}`;
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {absence.motif || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => openModal(absence)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(absence.id)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {selectedAbsence ? 'Modifier l\'absence' : 'Nouvelle absence'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Sélection employé (sauf pour fermetures) */}
                {formData.type_absence !== 'Fermeture' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employé *
                    </label>
                    <select
                      value={formData.employee_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionner un employé</option>
                      {employeesLogistique.map(employee => (
                        <option key={employee.id} value={employee.id}>
                          {employee.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Message pour fermetures */}
                {formData.type_absence === 'Fermeture' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center text-gray-700">
                      <AlertCircle className="w-5 h-5 mr-2 text-gray-500" />
                      <span className="text-sm font-medium">🚫 Fermeture du service logistique</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Cette déclaration concerne l'ensemble du service (tous les employés et véhicules)
                    </p>
                  </div>
                )}

                {/* Type d'absence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'absence *
                  </label>
                  <select
                    value={formData.type_absence}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        type_absence: newType,
                        // Nettoyer l'heure si ce n'est pas un rendez-vous
                        heure_debut: newType === 'Rendez-vous' ? prev.heure_debut : ''
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {typeAbsenceOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Horaires (seulement pour les rendez-vous) */}
                {formData.type_absence === 'Rendez-vous' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-800 mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Heure du rendez-vous
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Heure du rendez-vous *
                      </label>
                      <input
                        type="time"
                        value={formData.heure_debut}
                        onChange={(e) => setFormData(prev => ({ ...prev, heure_debut: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date {formData.type_absence === 'Rendez-vous' ? 'du rendez-vous' : 'de début'} *
                  </label>
                  <input
                    type="date"
                    value={formData.date_debut}
                    onChange={(e) => {
                      const newDateDebut = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        date_debut: newDateDebut,
                        // Pour les rendez-vous, date_fin = date_debut (même jour)
                        date_fin: formData.type_absence === 'Rendez-vous' ? newDateDebut : (prev.date_fin || newDateDebut)
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Date de fin (seulement pour les absences multi-jours) */}
                {formData.type_absence !== 'Rendez-vous' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de fin
                      <span className="text-xs text-gray-500 ml-1">(optionnel, par défaut = date début)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_fin: e.target.value }))}
                      min={formData.date_debut}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Motif */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.type_absence === 'Fermeture' ? 'Raison de la fermeture *' : 'Motif'}
                  </label>
                  
                  {formData.type_absence === 'Fermeture' ? (
                    <select
                      value={formData.motif}
                      onChange={(e) => setFormData(prev => ({ ...prev, motif: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionner une raison</option>
                      <option value="Sortie annuelle">Sortie annuelle</option>
                      <option value="Intempéries">Intempéries</option>
                      <option value="Maintenance véhicules">Maintenance véhicules</option>
                      <option value="Formation collective">Formation collective</option>
                      <option value="Jour férié">Jour férié</option>
                      <option value="Grève">Grève</option>
                      <option value="Autre">Autre raison</option>
                    </select>
                  ) : (
                    <textarea
                      value={formData.motif}
                      onChange={(e) => setFormData(prev => ({ ...prev, motif: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Détails de l'absence (optionnel)"
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                  >
                    {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                    {selectedAbsence ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AbsenceManagementLogistique; 