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
  Monitor
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
  
  // État pour le menu contextuel des rôles
  const [contextMenu, setContextMenu] = useState(null);

  /**
   * Chargement des données logistique
   */
  const loadLogisticData = useCallback(async () => {
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
    if (vehicles.length === 0) return;
    
    try {
      console.log('🔄 Initialisation planning...');
      
      // Calculer les dates de la semaine
      const weekDates = Array.from({ length: 5 }, (_, i) => addDays(currentWeek, i));
      const dateDebut = format(weekDates[0], 'yyyy-MM-dd');
      const dateFin = format(weekDates[4], 'yyyy-MM-dd');
      
      // Charger planning existant et absences en parallèle
      const [planningResult, absencesResult] = await Promise.all([
        supabaseLogistique.loadPlanningHebdomadaire(currentWeek),
        supabaseLogistique.getAbsencesLogistique(dateDebut, dateFin)
      ]);
      
      const planningData = planningResult.data || {};
      const absents = absencesResult.data || [];
      
      console.log('📅 Absences chargées pour la semaine:', absents.length);
      
      // Créer le planning final avec absences
      const finalPlanning = {};
      
      weekDates.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        finalPlanning[dateKey] = {
          absents: [] // Initialiser la section absents
        };
        
        // Initialiser toutes les cases véhicules avec les données existantes ou vide
        vehicles.forEach(vehicle => {
          finalPlanning[dateKey][vehicle.id] = planningData[dateKey]?.[vehicle.id] || [];
        });
        
        // Ajouter les employés absents pour ce jour (tenir compte des plages de dates)
        absents.forEach(absence => {
          if (absence.employee) {
            // Vérifier si ce jour se trouve dans la plage d'absence
            if (dateKey >= absence.date_debut && dateKey <= absence.date_fin) {
              finalPlanning[dateKey].absents.push({
                ...absence.employee,
                status: 'absent',
                type_absence: absence.type_absence,
                motif: absence.motif,
                isReadOnly: true // 👁️ Lecture seule - géré par interface absences
              });
            }
          }
        });
      });
      
      setPlanning(finalPlanning);
      console.log('✅ Planning initialisé avec absences automatiques');
      
    } catch (error) {
      console.error('❌ Erreur initialisation planning:', error);
      createEmptyPlanning();
    }
  }, [currentWeek, vehicles, createEmptyPlanning]);

  useEffect(() => {
    if (!loading && vehicles.length > 0) {
    initializePlanning();
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
      
      // Retirer l'employé du planning (désassignation)
      newPlanning[sourceDate][sourceVehicle].splice(source.index, 1);
      
      setPlanning(newPlanning);
      toast.success(`${getFirstName(draggedEmployee.nom)} désassigné`);
      
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
      default: // equipier
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
    const droppableId = `${dateKey}_${vehicle.id}`;
    const columnHeight = getVehicleColumnHeight(vehicle.capacite);
    
    return (
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`${columnHeight} p-2 transition-all duration-200 border-2 rounded-lg ${
              snapshot.isDraggingOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="space-y-1 h-full overflow-y-auto">
              {employees.map((employee, index) => {
                const roleStyles = getRoleStyles(employee.role);
                const isAbsent = employee.absent === true; // Lire directement la colonne absent
                
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
            </div>
            {provided.placeholder}
            
            <div className="text-xs text-gray-400 text-center mt-1">
              {employees.length}/{vehicle.capacite}
              </div>
          </div>
        )}
      </Droppable>
    );
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
            
            <div className="flex items-center space-x-4">
              <button
                onClick={generateAIPlanning}
                disabled={employees.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>IA</span>
              </button>
              <button 
                onClick={savePlanning}
                disabled={saving || Object.keys(planning).length === 0}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
              </button>
              <button
                onClick={() => navigate('/logistique/tv')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                title="Mode TV - Affichage télévision"
              >
                <Monitor className="w-4 h-4" />
                <span>Mode TV</span>
              </button>
              <button
                onClick={onLogout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Déconnexion
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
    </div>
  );
};

export default PlanningView; 