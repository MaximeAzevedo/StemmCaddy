import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Calendar, 
  Save, 
  Zap,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  User,
  Truck,
  Monitor,
  X,
  Play,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabaseLogistique } from '../lib/supabase-logistique';
import { aiPlanningEngine } from '../lib/ai-planning-engine';

const PlanningView = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [planning, setPlanning] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Données logistique
  const [employees, setEmployees] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [competences, setCompetences] = useState([]);
  const [absences, setAbsences] = useState([]); // Nouveau état pour les absences
  
  // État pour le menu contextuel des rôles
  const [contextMenu, setContextMenu] = useState(null);

  // État pour le générateur automatique
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [generatorOptions, setGeneratorOptions] = useState({
    replaceExisting: false,
    fillGapsOnly: true
  });

  // État pour la confirmation de reset
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  /**
   * Chargement des données logistique
   */
  const loadLogisticData = useCallback(async () => {
    try {
      console.log('🔄 === CHARGEMENT DONNÉES LOGISTIQUE ===');
      setLoading(true);
      
      const [employeesResult, vehiculesResult, competencesResult] = await Promise.all([
        supabaseLogistique.getEmployeesLogistique(),
        supabaseLogistique.getVehicules(),
        supabaseLogistique.getCompetencesVehicules()
      ]);
      
      console.log('📊 Résultats chargement:', {
        employees: employeesResult.data?.length || 0,
        vehicles: vehiculesResult.data?.length || 0,
        competences: competencesResult.data?.length || 0
      });

      if (employeesResult.error) throw employeesResult.error;
      if (vehiculesResult.error) throw vehiculesResult.error;
      if (competencesResult.error) throw competencesResult.error;
      
      setEmployees(employeesResult.data || []);
      setVehicles(vehiculesResult.data || []);
      setCompetences(competencesResult.data || []);
      
    } catch (error) {
      console.error('❌ Erreur chargement données logistique:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🔄 === useEffect DÉMARRAGE - Chargement données ===');
    loadLogisticData();
  }, [loadLogisticData]);

  /**
   * Créer un planning vide
   */
  const createEmptyPlanning = useCallback(() => {
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
    const newPlanning = {};
    
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      newPlanning[dateKey] = {
        absents: [] // Ajouter la section absents
      };
      
      vehicles.forEach(vehicle => {
        newPlanning[dateKey][vehicle.id] = [];
      });
    });
    
    setPlanning(newPlanning);
    console.log('📅 Planning vide initialisé avec section absents');
  }, [currentWeek, vehicles]);

  /**
   * Initialisation planning
   */
  const initializePlanning = useCallback(async () => {
    console.log('🔄 === APPEL INITIALIZE PLANNING ===');
    console.log('🚗 Véhicules disponibles:', vehicles.length);
    
    if (vehicles.length === 0) {
      console.warn('⚠️ Aucun véhicule chargé - arrêt initialisation');
      return;
    }
    
    try {
      console.log('🔄 Initialisation planning...');
      
      // Calculer les dates de la semaine
      const weekDates = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
      const dateDebut = format(weekDates[0], 'yyyy-MM-dd');
      const dateFin = format(weekDates[4], 'yyyy-MM-dd');
      
      // Charger planning existant et absences en parallèle
      const [planningResult, absencesResult] = await Promise.all([
        supabaseLogistique.loadPlanningHebdomadaire(format(currentWeek, 'yyyy-MM-dd')),
        supabaseLogistique.getAbsencesLogistique(dateDebut, dateFin)
      ]);
      
      const planningData = planningResult.data || {};
      const absents = absencesResult.data || [];
      
      // 🔍 DEBUG : Vérifier les données reçues
      console.log('🔍 Planning data reçu:', planningData);
      console.log('🔍 Nombre de jours dans planning:', Object.keys(planningData).length);
      Object.entries(planningData).forEach(([date, vehicles]) => {
        console.log(`🔍 ${date}: ${Object.keys(vehicles).length} véhicules`);
        Object.entries(vehicles).forEach(([vehicleId, employees]) => {
          console.log(`  🔍 Véhicule ${vehicleId}: ${employees.length} employés`);
        });
      });
      
      // Stocker les absences dans l'état du composant pour les rendez-vous
      setAbsences(absents);
      
      console.log('📅 Absences chargées pour la semaine:', absents.length);
      
      // 🔍 DEBUG RENDEZ-VOUS
      const rendezVous = absents.filter(abs => abs.type_absence === 'Rendez-vous');
      console.log('📅 Rendez-vous trouvés:', rendezVous.length);
      rendezVous.forEach(rdv => {
        console.log(`🔍 RDV: ${rdv.employes_logistique_new?.nom} le ${rdv.date_debut} à ${rdv.heure_debut}`);
      });
      
      // Créer le planning final avec absences
      const finalPlanning = {};
      
      weekDates.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        finalPlanning[dateKey] = {
          absents: [] // Initialiser la section absents
        };
        
        // Initialiser toutes les cases véhicules avec les données existantes ou vide
        vehicles.forEach(vehicle => {
          const vehicleData = planningData[dateKey]?.[vehicle.id] || [];
          finalPlanning[dateKey][vehicle.id] = vehicleData;
          
          // 🔍 DEBUG : Tracer l'assignation des données
          if (vehicleData.length > 0) {
            console.log(`🔍 ${dateKey} - Véhicule ${vehicle.nom} (${vehicle.id}): ${vehicleData.length} employés assignés`);
            vehicleData.forEach(emp => {
              console.log(`  🔍 ${emp.nom} (${emp.role})`);
            });
          }
        });
        
        // Ajouter les employés absents pour ce jour (tenir compte des plages de dates)
        // IMPORTANT: Les rendez-vous ne sont PAS des absences, ils restent assignables aux véhicules
        absents.forEach(absence => {
          // ✅ CORRECTION : Utiliser la bonne structure de données
          const employee = absence.employes_logistique_new;
          
          if (employee && absence.employee_id) {
            // Vérifier si ce jour se trouve dans la plage d'absence
            if (dateKey >= absence.date_debut && dateKey <= absence.date_fin) {
              // ⚠️ SEULES les vraies absences vont dans la section absents
              if (absence.type_absence !== 'Rendez-vous') {
                finalPlanning[dateKey].absents.push({
                  id: employee.nom,
                  nom: employee.nom,
                  employee_id: absence.employee_id,
                  status: 'absent',
                  type_absence: absence.type_absence,
                  motif: absence.motif,
                  isReadOnly: true // 👁️ Lecture seule - géré par interface absences
                });
                console.log(`👤 Absent ajouté: ${employee.nom} le ${dateKey} (${absence.type_absence})`);
              }
              // Les rendez-vous sont stockés séparément pour l'affichage mais n'empêchent pas l'assignation
            }
          } else if (absence.type_absence === 'Fermeture') {
            // Fermeture globale du service (pas d'employé spécifique)
            console.log(`🚫 Service fermé le ${dateKey}: ${absence.motif}`);
          }
        });
      });
      
      // 🔍 DEBUG : État final du planning
      console.log('🔍 Planning final avant setState:', finalPlanning);
      Object.entries(finalPlanning).forEach(([date, dayData]) => {
        const vehicleCount = Object.keys(dayData).filter(key => key !== 'absents').length;
        const employeeCount = Object.values(dayData)
          .filter(data => Array.isArray(data))
          .reduce((sum, employees) => sum + employees.length, 0);
        console.log(`🔍 ${date}: ${vehicleCount} véhicules, ${employeeCount} employés total`);
      });
      
      // 🚨 ALERTE SI SEMAINE VIDE
      const totalEmployees = Object.values(finalPlanning)
        .map(dayData => Object.values(dayData)
          .filter(data => Array.isArray(data))
          .reduce((sum, employees) => sum + employees.length, 0))
        .reduce((sum, count) => sum + count, 0);
        
      if (totalEmployees === 0) {
        console.warn('⚠️ SEMAINE VIDE - Aucune affectation trouvée pour cette semaine');
        console.log('💡 Essayez la semaine précédente ou regénérez le planning');
      }
      
      setPlanning(finalPlanning);
      console.log('✅ Planning initialisé avec absences automatiques');
      
    } catch (error) {
      console.error('❌ Erreur initialisation planning:', error);
      createEmptyPlanning();
    }
  }, [currentWeek, vehicles, createEmptyPlanning]);

  useEffect(() => {
    console.log('🔄 === useEffect TRIGGER ===');
    console.log('📊 État:', { loading, vehiclesCount: vehicles.length, currentWeek: format(currentWeek, 'yyyy-MM-dd') });
    
    if (!loading && vehicles.length > 0) {
      console.log('✅ Conditions OK - Appel initializePlanning');
      initializePlanning();
    } else {
      console.warn('⚠️ Conditions pas réunies:', { loading, vehiclesCount: vehicles.length });
    }
  }, [loading, vehicles, currentWeek, initializePlanning]);

  /**
   * Génération IA
   */
  const generateAIPlanning = async () => {
    if (employees.length === 0 || vehicles.length === 0) {
      toast.error('Données non chargées');
      return;
    }

    try {
      toast.loading('🤖 Génération IA...', { id: 'ai-planning' });
    
      const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
      const optimizedPlanning = {};
      
      for (const day of weekDays) {
        const dateString = format(day, 'yyyy-MM-dd');
        
        const aiResult = await aiPlanningEngine.generateOptimalPlanningLogistique(
          dateString,
          employees,
          vehicles,
          competences
        );
        
        if (aiResult.success && aiResult.planning) {
          optimizedPlanning[dateString] = aiResult.planning;
        } else {
          optimizedPlanning[dateString] = getDefaultPlanningForDay();
        }
      }
      
      setPlanning(optimizedPlanning);
      toast.success('🎯 Planning IA généré !', { id: 'ai-planning' });
      
    } catch (error) {
      console.error('❌ Erreur génération IA:', error);
      toast.error('❌ Erreur génération IA', { id: 'ai-planning' });
    }
  };

  /**
   * Sauvegarder le planning dans la base de données
   */
  const savePlanning = async () => {
    if (Object.keys(planning).length === 0) {
      toast.error('Aucun planning à sauvegarder');
      return;
    }

    try {
      setSaving(true);
      toast.loading('💾 Sauvegarde en cours...', { id: 'save-planning' });
      
      const result = await supabaseLogistique.savePlanningHebdomadaire(planning, currentWeek);
      
      if (result.error) {
        throw result.error;
      }
      
      const totalAssignations = result.data?.length || 0;
      toast.success(`✅ Planning sauvegardé ! (${totalAssignations} assignations)`, { 
        id: 'save-planning',
        duration: 3000 
      });
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde planning:', error);
      toast.error(`❌ Erreur sauvegarde: ${error.message}`, { 
        id: 'save-planning',
        duration: 4000 
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Générer automatiquement le planning pour une semaine
   */
  const generateWeeklyPlanning = async () => {
    if (!selectedStartDate) {
      toast.error('Veuillez sélectionner une date de début');
      return;
    }

    try {
      setGeneratorLoading(true);
      
      console.log('🤖 Démarrage génération planning automatique...');
      toast.loading('Génération du planning en cours...', { id: 'generator' });

      // Utiliser la date de début comme référence pour la semaine
      const startDateStr = format(new Date(selectedStartDate), 'yyyy-MM-dd');
      const result = await supabaseLogistique.generateWeeklyPlanning(startDateStr, generatorOptions);
      
      if (result.success) {
        const { data } = result;
        
        toast.success(
          `✅ Planning généré avec succès !\n` +
          `📅 ${data.daysGenerated} jours • ${data.entriesCreated} assignations\n` +
          `👥 ${data.summary.employeesAssigned} employés sur ${data.summary.vehiclesUsed} véhicules`,
          { 
            id: 'generator',
            duration: 6000
          }
        );

        console.log('✅ PLANNING GÉNÉRÉ:', data);
        
        // Recharger le planning pour afficher les nouvelles données
        await initializePlanning();
        
        // Fermer le modal
        setGeneratorOpen(false);
        
        // Réinitialiser la date
        setSelectedStartDate('');

      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }

    } catch (error) {
      console.error('💥 Erreur génération planning:', error);
      toast.error(
        `❌ Erreur génération planning: ${error.message}`,
        { id: 'generator', duration: 5000 }
      );
    } finally {
      setGeneratorLoading(false);
    }
  };

  /**
   * Obtenir la date du lundi de la semaine courante comme suggestion
   */
  const getCurrentMondayDate = () => {
    // Utiliser la semaine courante affichée dans le planning
    return format(currentWeek, 'yyyy-MM-dd');
  };

  /**
   * Ouvrir le générateur avec une date par défaut
   */
  const openPlanningGenerator = () => {
    setSelectedStartDate(getCurrentMondayDate());
    setGeneratorOpen(true);
  };

  /**
   * Reset du planning avec confirmation
   */
  const resetPlanning = () => {
    setResetConfirmOpen(true);
  };

  /**
   * Confirmer le reset du planning
   */
  const confirmResetPlanning = async () => {
    try {
      // Vider le planning local
      createEmptyPlanning();
      
      // Optionnel : Supprimer aussi de la base de données
      const weekDates = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
      for (const date of weekDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        await supabaseLogistique.clearDayPlanning(dateStr);
      }
      
      setResetConfirmOpen(false);
      toast.success('🔄 Planning remis à zéro !');
      
    } catch (error) {
      console.error('❌ Erreur reset planning:', error);
      toast.error('❌ Erreur lors du reset');
    }
  };

  /**
   * Planning par défaut
   */
  const getDefaultPlanningForDay = () => {
    const dayPlanning = {};
    vehicles.forEach(vehicle => {
      dayPlanning[vehicle.id] = [];
    });
    return dayPlanning;
  };

  /**
   * Section Absents pour un jour donné
   * 👁️ AFFICHAGE SEULEMENT - Pas de drag & drop possible
   */
  const getAbsentsSection = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const absentEmployees = planning[dateKey]?.absents || [];
    
    return (
      <div className="min-h-[80px] p-2 transition-all duration-200 border-2 rounded-lg border-red-200 bg-red-50">
        <div className="space-y-1 h-full">
          {absentEmployees.map((employee, index) => (
            <div
              key={`absent-readonly-${dateKey}-${employee.id}-${index}`}
              className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 border border-red-300 cursor-not-allowed opacity-75"
              title={`${employee.nom} est absent ce jour`}
            >
              {getFirstName(employee.nom)}
            </div>
          ))}
        </div>
        
        <div className="text-xs text-red-600 text-center mt-1">
          {absentEmployees.length} absent{absentEmployees.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  };

  /**
   * Section Rendez-vous pour un jour donné
   * 📅 AFFICHAGE SEULEMENT - Rappel visuel des rendez-vous
   */
  const getRendezVousSection = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    
    // Chercher les rendez-vous pour ce jour
    const rendezVousEmployees = absences.filter(absence => 
      absence.type_absence === 'Rendez-vous' &&
      dateKey >= absence.date_debut && 
      dateKey <= absence.date_fin &&
      absence.employes_logistique_new && // ✅ Correction structure
      absence.employee_id
    );
    
    if (rendezVousEmployees.length === 0) {
      return null; // Pas de section si pas de rendez-vous
    }
    
    return (
      <div className="min-h-[80px] p-2 transition-all duration-200 border-2 rounded-lg border-orange-200 bg-orange-50">
        <div className="space-y-1 h-full">
          {rendezVousEmployees.map((absence, index) => {
            const heure = absence.heure_debut ? absence.heure_debut.split(':')[0] : '';
            const employee = absence.employes_logistique_new; // ✅ Bonne structure
            return (
              <div
                key={`rdv-readonly-${dateKey}-${absence.employee_id}-${index}`}
                className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800 border border-orange-300 cursor-help"
                title={`${employee.nom} a un rendez-vous à ${absence.heure_debut || 'heure non précisée'}`}
              >
                {getFirstName(employee.nom)} - RDV {heure}h
              </div>
            );
          })}
        </div>
        
        <div className="text-xs text-orange-600 text-center mt-1">
          {rendezVousEmployees.length} rendez-vous
        </div>
      </div>
    );
  };

  /**
   * Drag & Drop
   */
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    
    // Vérification que les données sont chargées
    if (employees.length === 0 || vehicles.length === 0) {
      toast.error('Données non chargées, veuillez patienter');
      return;
    }

    // Vérification que le planning est initialisé
    if (!planning || Object.keys(planning).length === 0) {
      toast.error('Planning non initialisé');
      return;
    }

    // =================== GESTION DES ABSENTS ===================
    
    // 👁️ SECTION ABSENTS = AFFICHAGE SEULEMENT
    // Les absences se gèrent uniquement via l'interface dédiée
    
    if (destination.droppableId.startsWith('absents_') || source.droppableId.startsWith('absents_')) {
      toast.error('👁️ Section absents en lecture seule - Utilisez la gestion des absences', { 
        duration: 3000 
      });
      return;
    }
    
    // Déplacement depuis la liste des employés vers le planning
    if (source.droppableId === 'employees-pool' && draggableId.startsWith('employee-')) {
      // Extraire l'ID de l'employé depuis le draggableId
      const employeeId = parseInt(draggableId.replace('employee-', ''));
      const draggedEmployee = employees.find(emp => emp.id === employeeId);
      
      if (!draggedEmployee) {
        console.error('❌ Employé non trouvé:', employeeId);
        toast.error('Employé non trouvé');
        return;
      }
      
      // Parser avec underscore comme séparateur
      const parts = destination.droppableId.split('_');
      
      if (parts.length !== 2) {
        console.error('❌ Format droppableId invalide:', destination.droppableId);
        toast.error('Destination invalide');
        return;
      }
      
      const [destDate, destVehicleId] = parts;
      const destVehicle = parseInt(destVehicleId);
      
      if (!planning[destDate] || !planning[destDate][destVehicle]) {
        console.error('❌ Destination invalide:', { destDate, destVehicle });
        toast.error('Destination invalide');
        return;
      }
      
      const destVehicleInfo = vehicles.find(v => v.id === destVehicle);
      if (destVehicleInfo && planning[destDate][destVehicle].length >= destVehicleInfo.capacite) {
        toast.error(`Capacité max atteinte pour ${destVehicleInfo.nom}`);
        return;
    }
    
      const newPlanning = { ...planning };
      
      // Assigner l'employé avec rôle par défaut (equipier)
      const employeeWithRole = {
        ...draggedEmployee, 
        status: 'assigned',
        role: 'equipier'  // Rôle par défaut
      };
      
      newPlanning[destDate][destVehicle] = [
        ...newPlanning[destDate][destVehicle],
        employeeWithRole
      ];
      
      setPlanning(newPlanning);
      toast.success(`${getFirstName(draggedEmployee.nom)} assigné`);
      
      return;
    }
    
    // Déplacement depuis le planning vers la sidebar employés (désassignation)
    if (destination.droppableId === 'employees-pool' && draggableId.startsWith('planning-')) {
      // Parser avec underscore comme séparateur
      const sourceParts = source.droppableId.split('_');
      if (sourceParts.length !== 2) {
        console.error('❌ Format source droppableId invalide:', source.droppableId);
        toast.error('Source invalide');
        return;
      }
      
      const [sourceDate, sourceVehicleId] = sourceParts;
      const sourceVehicle = parseInt(sourceVehicleId);
      
      const newPlanning = { ...planning };
      
      if (!newPlanning[sourceDate] || !newPlanning[sourceDate][sourceVehicle]) {
        console.error('❌ Source invalide:', { sourceDate, sourceVehicle });
        toast.error('Source invalide');
        return;
      }
      
      const draggedEmployee = newPlanning[sourceDate][sourceVehicle][source.index];
      if (!draggedEmployee) {
        console.error('❌ Employé non trouvé à l\'index:', source.index);
        toast.error('Employé non trouvé');
        return;
      }
      
      try {
        // 🔥 CORRECTION : Supprimer aussi de la base de données
        console.log('🗑️ Suppression assignation en base:', {
          employeeId: draggedEmployee.employee_id || draggedEmployee.id,
          vehiculeId: sourceVehicle,
          date: sourceDate
        });
        
        const removeResult = await supabaseLogistique.removeEmployeeFromPlanning(
          draggedEmployee.employee_id || draggedEmployee.id,
          sourceVehicle,
          sourceDate
        );
        
        if (removeResult.success) {
          // Retirer l'employé du planning local seulement après suppression DB réussie
          newPlanning[sourceDate][sourceVehicle].splice(source.index, 1);
          setPlanning(newPlanning);
          toast.success(`${getFirstName(draggedEmployee.nom)} désassigné et supprimé de la base`);
        } else {
          throw new Error(removeResult.error?.message || 'Erreur suppression DB');
        }
      } catch (error) {
        console.error('❌ Erreur suppression assignation:', error);
        toast.error(`Erreur suppression: ${error.message}`);
        return;
      }
      
      return;
    }
    
    // Déplacement entre cases du planning
    if (draggableId.startsWith('planning-')) {
      // Parser avec underscore comme séparateur
      const sourceParts = source.droppableId.split('_');
      const destParts = destination.droppableId.split('_');
      
      if (sourceParts.length !== 2 || destParts.length !== 2) {
        console.error('❌ Format droppableId invalide:', { source: source.droppableId, dest: destination.droppableId });
        toast.error('Format invalide');
        return;
      }
      
      const [sourceDate, sourceVehicleId] = sourceParts;
      const [destDate, destVehicleId] = destParts;
      const sourceVehicle = parseInt(sourceVehicleId);
      const destVehicle = parseInt(destVehicleId);
      
      const newPlanning = { ...planning };
      
      if (!newPlanning[sourceDate] || !newPlanning[sourceDate][sourceVehicle]) {
        console.error('❌ Source invalide:', { sourceDate, sourceVehicle });
        toast.error('Source invalide');
        return;
      }
      if (!newPlanning[destDate]) newPlanning[destDate] = {};
      if (!newPlanning[destDate][destVehicle]) newPlanning[destDate][destVehicle] = [];
      
    const draggedEmployee = newPlanning[sourceDate][sourceVehicle][source.index];
    if (!draggedEmployee) {
      console.error('❌ Employé non trouvé à l\'index:', source.index);
        toast.error('Employé non trouvé');
        return;
      }
      
      const destVehicleInfo = vehicles.find(v => v.id === destVehicle);
      if (destVehicleInfo && newPlanning[destDate][destVehicle].length >= destVehicleInfo.capacite) {
        toast.error(`Capacité max atteinte`);
        return;
      }
      
      newPlanning[sourceDate][sourceVehicle].splice(source.index, 1);
      newPlanning[destDate][destVehicle].splice(destination.index, 0, draggedEmployee);
      
      setPlanning(newPlanning);
      toast.success(`${getFirstName(draggedEmployee.nom)} déplacé`);
      
      return;
    }
    
    console.warn('⚠️ Type de drag non reconnu:', draggableId);
    toast.error('Type de déplacement non reconnu');
  };

  /**
   * Récupérer le prénom
   */
  const getFirstName = (fullName) => {
    return fullName.split(' ')[0];
  };

  /**
   * Obtenir les rendez-vous d'un employé pour une date donnée
   */
  const getEmployeeRendezVous = (employeeId, date) => {
    // Chercher dans les absences de la semaine les rendez-vous pour cet employé et cette date
    const rendezVous = absences.find(absence => 
      absence.employee_id === employeeId && 
      absence.type_absence === 'Rendez-vous' &&
      date >= absence.date_debut && 
      date <= absence.date_fin
    );

    if (rendezVous && rendezVous.heure_debut) {
      const heure = rendezVous.heure_debut.split(':')[0];
      return {
        hasRendezVous: true,
        display: `RDV ${heure}h`,
        fullInfo: rendezVous
      };
    }

    return {
      hasRendezVous: false,
      display: null,
      fullInfo: null
    };
  };

  /**
   * Obtenir une couleur unique par véhicule
   */
  const getVehicleColor = (vehicleId) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-rose-500'
    ];
    return colors[vehicleId % colors.length];
  };

  /**
   * Calculer la hauteur optimale selon la capacité du véhicule
   */
  const getVehicleColumnHeight = (capacity) => {
    if (capacity <= 3) return 'h-32';       // 128px pour petits véhicules
    if (capacity <= 5) return 'h-40';       // 160px pour véhicules moyens  
    if (capacity <= 8) return 'h-48';       // 192px pour gros véhicules
    return 'h-56';                          // 224px pour très gros véhicules
  };

  /**
   * Obtenir les styles selon le rôle
   */
  const getRoleStyles = (role) => {
    switch (role?.toLowerCase()) {
      case 'conducteur':
        return {
          border: 'border-l-2 border-red-500',
          badge: 'bg-red-500 text-white',
          text: 'C'
        };
      case 'assistant':
        return {
          border: 'border-l-2 border-green-500',
          badge: 'bg-green-500 text-white',
          text: 'A'
        };
      case 'équipier': // Équipiers sans couleur selon les spécifications
      case 'equipier': // Support des deux orthographes
      default: // pas de rôle défini ou équipier
        return {
          border: '',
          badge: '',
          text: ''
        };
    }
  };

  /**
   * Changer le rôle d'un employé avec validation des règles métier
   */
  const changeEmployeeRole = (dateKey, vehicleId, employeeIndex, newRole) => {
    const newPlanning = { ...planning };
    const vehicleTeam = newPlanning[dateKey][vehicleId];
    const employee = vehicleTeam[employeeIndex];
    
    if (!employee) return;
    
    // Validation simple : 1 seul conducteur par véhicule
    const currentConductors = vehicleTeam.filter(emp => emp.role === 'conducteur').length;
    
    if (newRole === 'conducteur' && currentConductors >= 1 && employee.role !== 'conducteur') {
      toast.error('Un seul conducteur par véhicule');
      setContextMenu(null);
      return;
    }
    
    // Appliquer le nouveau rôle
    employee.role = newRole;
    setPlanning(newPlanning);
    
    // Message simple
    const employeeName = getFirstName(employee.nom);
    toast.success(`${employeeName} → ${newRole}`);
    
    // Fermer le menu
    setContextMenu(null);
  };

  /**
   * Ouvrir le menu contextuel
   */
  const openContextMenu = (e, dateKey, vehicleId, employeeIndex) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      dateKey,
      vehicleId,
      employeeIndex
    });
  };

  /**
   * Fermer le menu contextuel
   */
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  /**
   * Véhicule colonne
   */
  const getVehicleColumn = (vehicle, day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const employees = planning[dateKey]?.[vehicle.id] || [];
    
    // 🔍 DEBUG GÉNÉRAL : Voir si planning contient des données
    if (employees.length === 0 && planning[dateKey] && Object.keys(planning[dateKey]).length > 0) {
      console.log(`⚠️ Véhicule ${vehicle.nom} (ID: ${vehicle.id}) vide mais données existent:`, {
        vehicleId: vehicle.id,
        vehicleIdType: typeof vehicle.id,
        availableKeys: Object.keys(planning[dateKey]),
        availableKeysTypes: Object.keys(planning[dateKey]).map(k => typeof k)
      });
    }
    
    // 🔍 DEBUG : Tracer le problème d'affichage vide
    if (dateKey === '2025-07-28') {
      console.log(`🔍 VEHICLE DEBUG - ${vehicle.nom} (ID: ${vehicle.id}):`, {
        dateKey,
        vehicleId: vehicle.id,
        planningForDate: planning[dateKey],
        employeesFound: employees.length,
        employees: employees
      });
      
      if (planning[dateKey]) {
        console.log(`🔍 Véhicules disponibles le ${dateKey}:`, Object.keys(planning[dateKey]));
        console.log(`🔍 Données véhicule ${vehicle.id}:`, planning[dateKey][vehicle.id]);
      }
    }
    
    const droppableId = `${dateKey}_${vehicle.id}`;
    const columnHeight = getVehicleColumnHeight(vehicle.capacite);
    const isFerme = isServiceFerme(day);
    const fermetureInfo = getFermetureInfo(day);
    
    return (
      <div className="relative">
        <Droppable droppableId={droppableId} isDropDisabled={isFerme}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`${columnHeight} p-2 transition-all duration-200 border-2 rounded-lg ${
                isFerme 
                  ? 'border-gray-400 bg-gray-100 opacity-50' 
                  : snapshot.isDraggingOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="space-y-1 h-full overflow-y-auto">
                {!isFerme && employees.map((employee, index) => {
                  const roleStyles = getRoleStyles(employee.role);
                  const isAbsent = employee.absent === true; // Lire directement la colonne absent
                  const rendezVousInfo = getEmployeeRendezVous(employee.id, dateKey);
                  
                  return (
                    <Draggable 
                      key={`${dateKey}-${vehicle.id}-${employee.id}-${index}`} 
                      draggableId={`planning-${dateKey}-${vehicle.id}-${employee.id}-${index}`} 
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onContextMenu={(e) => openContextMenu(e, dateKey, vehicle.id, index)}
                          className={`px-2 py-1 text-xs rounded transition-all cursor-grab active:cursor-grabbing relative ${roleStyles.border} ${
                            snapshot.isDragging
                              ? 'bg-blue-500 text-white shadow-lg transform rotate-1'
                              : isAbsent
                                ? 'bg-gray-200 text-gray-600 opacity-75 border border-red-300' // Style pour absent
                                : employee.profil === 'Fort' ? 'bg-emerald-100 text-emerald-800' :
                                  employee.profil === 'Moyen' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                          }`}
                          title={
                            isAbsent 
                              ? `⚠️ ${employee.nom} est absent ce jour - Réassigner urgence !`
                              : rendezVousInfo.hasRendezVous
                                ? `📅 ${employee.nom} a un rendez-vous (${rendezVousInfo.display})`
                                : `Clic droit pour changer le rôle (${employee.role || 'equipier'})`
                          }
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center">
                              {getFirstName(employee.nom)}
                              {isAbsent && (
                                <span className="ml-1 text-xs bg-red-500 text-white px-1 rounded">
                                  Absent
                                </span>
                              )}
                              {!isAbsent && rendezVousInfo.hasRendezVous && (
                                <span className="ml-1 text-xs bg-orange-500 text-white px-1 rounded">
                                  {rendezVousInfo.display}
                                </span>
                              )}
                            </span>
                            {roleStyles.badge && !isAbsent && (
                              <span className={`w-4 h-4 rounded-full text-xs flex items-center justify-center ${roleStyles.badge}`}>
                                {roleStyles.text}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                
                {isFerme && (
                  <div className="text-center py-8">
                    <div className="text-gray-600 text-sm font-medium mb-2">
                      🚫 Service fermé
                    </div>
                    {fermetureInfo && (
                      <div className="text-xs text-gray-500">
                        {fermetureInfo.motif}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {provided.placeholder}
              
              <div className="text-xs text-gray-400 text-center mt-1">
                {isFerme ? 'FERMÉ' : `${employees.length}/${vehicle.capacite}`}
              </div>
            </div>
          )}
        </Droppable>
        
        {/* Overlay de fermeture */}
        {isFerme && (
          <div className="absolute inset-0 bg-gray-600 bg-opacity-20 rounded-lg flex items-center justify-center pointer-events-none">
            <div className="bg-white px-3 py-2 rounded-lg shadow-lg text-center border-2 border-gray-400">
              <div className="text-sm font-bold text-gray-700">🚫 FERMÉ</div>
              {fermetureInfo && (
                <div className="text-xs text-gray-500 mt-1">{fermetureInfo.motif}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Vérifier si le service est fermé un jour donné
   */
  const isServiceFerme = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return absences.some(absence => 
      absence.type_absence === 'Fermeture' &&
      dateKey >= absence.date_debut && 
      dateKey <= absence.date_fin
    );
  };

  /**
   * Obtenir les informations de fermeture pour un jour donné
   */
  const getFermetureInfo = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const fermeture = absences.find(absence => 
      absence.type_absence === 'Fermeture' &&
      dateKey >= absence.date_debut && 
      dateKey <= absence.date_fin
    );
    return fermeture;
  };

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
      
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header Tesla-style */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/logistique')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Planning Logistique</h1>
                <p className="text-sm text-gray-500">{employees.length} employés • {vehicles.length} véhicules</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={savePlanning}
                disabled={saving || Object.keys(planning).length === 0}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
              <button
                onClick={openPlanningGenerator}
                disabled={employees.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Générer IA</span>
              </button>
              <button
                onClick={resetPlanning}
                disabled={Object.keys(planning).length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button
                onClick={() => navigate('/logistique/tv')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                title="Mode TV - Affichage télévision"
              >
                <Monitor className="w-4 h-4" />
                <span>Mode TV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-[calc(100vh-73px)]">
          {/* Sidebar Employés */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Employés ({employees.length})
                  </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <Droppable droppableId="employees-pool">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'bg-blue-50 border-2 border-blue-300 border-dashed' 
                        : ''
                    }`}
                  >
                    {employees.map((employee, index) => {
                      return (
                        <Draggable 
                          key={employee.id} 
                          draggableId={`employee-${employee.id}`} 
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging
                                  ? 'bg-blue-500 text-white shadow-xl transform rotate-2'
                                  : employee.profil === 'Fort' ? 'bg-emerald-50 border-emerald-200' :
                                    employee.profil === 'Moyen' ? 'bg-amber-50 border-amber-200' :
                                    'bg-rose-50 border-rose-200'
                              }`}
                              title={`Employé ${employee.nom}`}
                            >
                              <div className="font-medium text-sm">
                                {getFirstName(employee.nom)}
                              </div>
                              <div className={`text-xs mt-1 ${
                                snapshot.isDragging ? 'text-blue-100' :
                                employee.profil === 'Fort' ? 'text-emerald-600' :
                                employee.profil === 'Moyen' ? 'text-amber-600' :
                                'text-rose-600'
                              }`}>
                                {employee.profil}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    
                    {/* Texte d'aide quand on survole */}
                    {snapshot.isDraggingOver && (
                      <div className="text-center text-blue-600 text-sm font-medium py-4">
                        👋 Relâchez pour désassigner l'employé
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
                  </div>
                </div>
                
          {/* Zone Planning Full-Width */}
          <div className="flex-1 flex flex-col">
            {/* Navigation Semaine */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-semibold text-gray-900">
                    {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
                  </h3>
                  <button
                    onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <Calendar className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              
            {/* Grille Planning */}
            <div className="flex-1 overflow-auto p-6">
              <div className="min-w-full">
                {/* Headers jours */}
                <div className="grid grid-cols-6 gap-4 mb-4">
                  <div className="text-sm font-medium text-gray-700 flex items-center">
                    <Truck className="w-4 h-4 mr-2" />
                    Véhicules
                  </div>
                  {weekDays.map(day => (
                    <div key={day.toISOString()} className="text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        {format(day, 'EEEE', { locale: fr })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(day, 'dd/MM')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lignes véhicules */}
                <div className="space-y-3">
                {vehicles.map(vehicle => (
                    <div key={vehicle.id} className="grid grid-cols-6 gap-4">
                      <div className="flex items-center space-x-3 py-2">
                        <div className={`w-3 h-3 rounded-full ${getVehicleColor(vehicle.id)}`}></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{vehicle.nom}</div>
                          <div className="text-xs text-gray-500">{vehicle.capacite} places</div>
                        </div>
                    </div>
                    {weekDays.map(day => (
                      <div key={`${vehicle.id}-${day.toISOString()}`}>
                        {getVehicleColumn(vehicle, day)}
                      </div>
                    ))}
                  </div>
                ))}
                  
                  {/* LIGNE ABSENTS */}
                  <div className="grid grid-cols-6 gap-4 border-t-2 border-red-200 pt-3">
                    <div className="flex items-center space-x-3 py-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div>
                        <div className="text-sm font-medium text-red-700">Absents</div>
                        <div className="text-xs text-red-500">Employés absents</div>
                      </div>
                    </div>
                    {weekDays.map(day => (
                      <div key={`absents-${day.toISOString()}`}>
                        {getAbsentsSection(day)}
                      </div>
                    ))}
                  </div>

                  {/* LIGNE RENDEZ-VOUS */}
                  <div className="grid grid-cols-6 gap-4 border-t-2 border-orange-200 pt-3">
                    <div className="flex items-center space-x-3 py-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <div>
                        <div className="text-sm font-medium text-orange-700">Rendez-vous</div>
                        <div className="text-xs text-orange-500">Rappel des rendez-vous</div>
                      </div>
                    </div>
                    {weekDays.map(day => (
                      <div key={`rdvs-${day.toISOString()}`}>
                        {getRendezVousSection(day)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </DragDropContext>

      {/* Menu contextuel */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={closeContextMenu}
          onContextMenu={closeContextMenu}
        >
          <div
            className="absolute bg-white p-2 rounded-md shadow-lg"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => changeEmployeeRole(contextMenu.dateKey, contextMenu.vehicleId, contextMenu.employeeIndex, 'conducteur')}
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100"
            >
              Conducteur
            </button>
            <button
              onClick={() => changeEmployeeRole(contextMenu.dateKey, contextMenu.vehicleId, contextMenu.employeeIndex, 'assistant')}
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100"
            >
              Assistant
            </button>
            <button
              onClick={() => changeEmployeeRole(contextMenu.dateKey, contextMenu.vehicleId, contextMenu.employeeIndex, 'equipier')}
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100"
            >
              Équipier
            </button>
          </div>
        </div>
      )}

      {/* Modal Générateur IA */}
      {generatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Générateur de Planning IA</h3>
            <p className="text-sm text-gray-700 mb-4">
              Sélectionnez une date de début pour générer le planning hebdomadaire.
              Le planning généré remplacera les données existantes.
            </p>
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="date"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              />
              <button
                onClick={generateWeeklyPlanning}
                disabled={!selectedStartDate || generatorLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {generatorLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{generatorLoading ? 'Génération...' : 'Générer Planning'}</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setGeneratorOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de reset */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirmation de Reset</h3>
            <p className="text-sm text-gray-700 mb-4">
              Êtes-vous sûr de vouloir remettre le planning à zéro pour cette semaine ?
              Cela supprimera toutes les assignations et absences existantes.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={confirmResetPlanning}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Oui, Reset
              </button>
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView; 