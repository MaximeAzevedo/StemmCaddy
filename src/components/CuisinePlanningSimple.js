import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Calendar, 
  Save, 
  Zap,
  ArrowLeft,
  User,
  Monitor,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
// Note: navigation gérée par window.location.href pour plus de fiabilité
import { format, subDays } from 'date-fns';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import { supabaseCuisineAdvanced } from '../lib/supabase-cuisine-advanced';
import { aiPlanningEngine } from '../lib/ai-planning-engine';

const CuisinePlanningSimple = ({ user, onLogout }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planning, setPlanning] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  
  // Données cuisine
  const [employees, setEmployees] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [photoZoom, setPhotoZoom] = useState(null); // Modal zoom photo pour accessibilité
  
  /**
   * 🔄 CONVERSION FORMAT IA → UI
   * Convertit le planning IA vers le format attendu par l'interface
   */
  const convertAIPlanningToUI = async (aiResult, dateString) => {
    const convertedPlanning = {};
    convertedPlanning[dateString] = {
      absents: [] // Section absents
    };
    
    // Initialiser tous les postes vides
    postes.forEach(poste => {
      convertedPlanning[dateString][poste.id] = [];
    });
    
    // Mapper les assignations IA vers les postes UI
    for (const assignment of aiResult.planning_optimal) {
      const posteNom = assignment.poste;
      
      // Trouver l'ID du poste correspondant
      let posteId = null;
      
      // Mapping des noms IA vers IDs UI
      if (posteNom === 'Pain') posteId = 8;
      else if (posteNom === 'Sandwichs') posteId = 1;
      else if (posteNom === 'Self Midi 11h-11h45') posteId = 2;
      else if (posteNom === 'Self Midi 11h45-12h45') posteId = 3;
      else if (posteNom === 'Self Midi') posteId = 2; // Fallback
      else if (posteNom === 'Cuisine chaude') posteId = 4;
      else if (posteNom === 'Vaisselle 8h') posteId = 5;
      else if (posteNom === 'Vaisselle 10h') posteId = 6;
      else if (posteNom === 'Vaisselle midi') posteId = 7;
      else if (posteNom === 'Vaisselle') posteId = 5; // Fallback
      else if (posteNom === 'Légumerie') posteId = 9;
      else if (posteNom === 'Jus de fruits') posteId = 10;
      else if (posteNom === 'Equipe Pina et Saskia') posteId = 11;
      
      if (posteId && assignment.employes_assignes) {
        for (const employeeAI of assignment.employes_assignes) {
          // Trouver l'employé réel dans la base
          const employee = employees.find(emp => 
            emp.prenom && emp.prenom.toLowerCase().includes(employeeAI.prenom.toLowerCase())
          );
          
          if (employee) {
            convertedPlanning[dateString][posteId].push({
              ...employee,
              status: 'assigned',
              role: employeeAI.role || 'Équipier',
              ai_score: employeeAI.score_adequation,
              ai_raison: employeeAI.raison
            });
          }
        }
      }
    }
    
    return convertedPlanning;
  };
  
  // ✅ SIMPLE : Postes fixes mémorisés pour éviter les re-renders
  const postes = useMemo(() => [
    { id: 1, nom: 'Sandwichs', couleur: '#f59e0b', icone: '🥪' },
    { id: 2, nom: 'Self Midi 11h-11h45', couleur: '#8b5cf6', icone: '🍽️' },
    { id: 3, nom: 'Self Midi 11h45-12h45', couleur: '#8b5cf6', icone: '🍽️' },
    { id: 4, nom: 'Cuisine chaude', couleur: '#ef4444', icone: '🔥' },
    { id: 5, nom: 'Vaisselle 8h', couleur: '#3b82f6', icone: '🧽' },
    { id: 6, nom: 'Vaisselle 10h', couleur: '#3b82f6', icone: '🧽' },
    { id: 7, nom: 'Vaisselle midi', couleur: '#3b82f6', icone: '🧽' },
    { id: 8, nom: 'Pain', couleur: '#eab308', icone: '🍞' },
    { id: 9, nom: 'Légumerie', couleur: '#10b981', icone: '🥬' },
    { id: 10, nom: 'Jus de fruits', couleur: '#22c55e', icone: '🧃' },
    { id: 11, nom: 'Equipe Pina et Saskia', couleur: '#ec4899', icone: '👥' }
  ], []);

  /**
   * Chargement des données cuisine
   */
  const loadCuisineData = useCallback(async () => {
    try {
      setLoading(true);
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const [employeesResult, absencesResult] = await Promise.all([
        supabaseCuisineAdvanced.getEmployeesCuisine(),
        supabaseCuisineAdvanced.getAbsencesCuisineAdvanced(dateString, dateString)
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (absencesResult.error) {
        console.warn('⚠️ Erreur chargement absences:', absencesResult.error);
      }
      
      const employees = employeesResult.data || [];
      const absences = absencesResult.data || [];
      
      console.log('📊 Employés chargés:', employees.length);
      console.log('📊 Absences chargées:', absences.length);
      
      // 🔍 DEBUG: Chercher Azmera spécifiquement
      const azmera = employees.find(emp => 
        emp.prenom && emp.prenom.toLowerCase().includes('azmera')
      );
      if (azmera) {
        console.log('✅ Azmera trouvée dans employees:', {
          id: azmera.id,
          prenom: azmera.prenom,
          actif: azmera.actif
        });
        
        // Vérifier si elle est dans les absences
        const azmeraAbsence = absences.find(abs => abs.employee_id === azmera.id);
        if (azmeraAbsence) {
          console.log('⚠️ Azmera marquée absente:', azmeraAbsence);
        } else {
          console.log('✅ Azmera PAS absente');
        }
      } else {
        console.log('❌ Azmera NON trouvée dans employees');
        console.log('📋 Tous les employés:', employees.map(e => e.prenom));
      }
      
      setEmployees(employees);
      setAbsences(absences);
      
    } catch (error) {
      console.error('❌ Erreur chargement données cuisine:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadCuisineData();
  }, [loadCuisineData]);

  /**
   * 🤖 GÉNÉRATION PLANNING IA - Intelligence artificielle optimisée
   */
  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      console.log('🤖 Démarrage génération planning IA...');
      
      // Génération IA optimisée
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const result = await aiPlanningEngine.generateIntelligentPlanning(dateString);
      
      if (result.planning_optimal && result.planning_optimal.length > 0) {
        // Convertir le format IA vers le format planning UI
        const convertedPlanning = await convertAIPlanningToUI(result, dateString);
        setPlanning(convertedPlanning);
        
        const stats = result.statistiques;
        toast.success(
          `🤖 Planning IA généré avec succès !\n` +
          `📊 ${stats.employes_utilises} employés assignés\n` +
          `🎯 ${stats.postes_couverts} postes couverts\n` +
          `⚡ Score global: ${stats.score_global}%`,
          { duration: 4000 }
        );
        
        console.log('✅ Planning IA appliqué:', convertedPlanning);
        
        // Afficher les recommandations IA si disponibles
        if (result.recommandations && result.recommandations.length > 0) {
          console.log('💡 Recommandations IA:', result.recommandations.join(' | '));
        }
      } else {
        throw new Error(result.error || 'Erreur génération IA');
      }
      
    } catch (error) {
      console.error('❌ Erreur génération IA:', error);
      toast.error(`❌ Erreur génération IA: ${error.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  /**
   * ✅ COPIE EXACTE LOGISTIQUE : Créer un planning vide
   */
  const createEmptyPlanning = useCallback(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newPlanning = {};
    
    newPlanning[dateKey] = {
      absents: [] // Section absents comme en logistique
    };
    
    postes.forEach(poste => {
      newPlanning[dateKey][poste.id] = [];
    });
    
    setPlanning(newPlanning);
    console.log('📅 Planning vide initialisé');
  }, [selectedDate]);

  /**
   * ✅ COPIE EXACTE LOGISTIQUE : Initialisation planning
   */
  const initializePlanning = useCallback(async () => {
    if (postes.length === 0) return;
    
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      
      // Charger planning existant et absences
      const [planningResult] = await Promise.all([
        supabaseCuisine.loadPlanningCuisine(selectedDate)
      ]);
      
      const planningData = planningResult.data || {};
      
      // Créer le planning final avec absences
      const finalPlanning = {};
      finalPlanning[dateKey] = {
        absents: [] // Initialiser la section absents
      };
      
      // Initialiser tous les postes avec les données existantes ou vide
      postes.forEach(poste => {
        finalPlanning[dateKey][poste.id] = planningData[poste.id] || [];
      });
      
      // Ajouter les employés absents
      absences.forEach(absence => {
        if (absence.employee) {
          finalPlanning[dateKey].absents.push({
            ...absence.employee,
            status: 'absent',
            type_absence: absence.type_absence,
            motif: absence.motif,
            isReadOnly: true
          });
        }
      });
      
      setPlanning(finalPlanning);
      console.log('✅ Planning initialisé');
      
    } catch (error) {
      console.error('❌ Erreur initialisation planning:', error);
      createEmptyPlanning();
    }
  }, [selectedDate, createEmptyPlanning, absences]);

  useEffect(() => {
    if (!loading && postes.length > 0) {
      initializePlanning();
    }
  }, [loading, selectedDate, initializePlanning]);

  /**
   * 📅 IMPORT PLANNING VEILLE
   * Importe automatiquement le planning de la veille pour faciliter la création
   */
  const importPlanningFromPreviousDay = async () => {
    try {
      setImportLoading(true);
      toast.loading('📅 Import du planning de la veille...', { id: 'import-previous' });
      
      // Calculer la date de la veille
      const previousDay = subDays(selectedDate, 1);
      const previousDayStr = format(previousDay, 'dd/MM/yyyy');
      
      console.log('📅 Import planning de la veille:', format(previousDay, 'yyyy-MM-dd'));
      
      // Charger le planning de la veille
      const result = await supabaseCuisine.loadPlanningCuisine(previousDay);
      
      if (result.error) {
        throw new Error(result.error.message || 'Erreur lors du chargement');
      }
      
      const previousPlanning = result.data || {};
      
      // Vérifier s'il y a des données
      const hasData = Object.keys(previousPlanning).some(posteId => 
        previousPlanning[posteId] && previousPlanning[posteId].length > 0
      );
      
      if (!hasData) {
        toast.error(`❌ Aucun planning trouvé pour le ${previousDayStr}`, { 
          id: 'import-previous',
          duration: 4000 
        });
        return;
      }
      
      // Créer le nouveau planning basé sur celui de la veille
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      const newPlanning = {};
      
      newPlanning[dateKey] = {
        absents: [] // Garder la section absents vide (elle sera rechargée avec les vraies absences du jour)
      };
      
      // Copier les assignations de la veille
      postes.forEach(poste => {
        const previousEmployees = previousPlanning[poste.id] || [];
        newPlanning[dateKey][poste.id] = [...previousEmployees]; // Copie des employés assignés
      });
      
      // Ajouter les employés absents du jour actuel (pas ceux de la veille)
      absences.forEach(absence => {
        if (absence.employee) {
          newPlanning[dateKey].absents.push({
            ...absence.employee,
            status: 'absent',
            type_absence: absence.type_absence,
            motif: absence.motif,
            isReadOnly: true
          });
        }
      });
      
      // Appliquer le nouveau planning
      setPlanning(newPlanning);
      
      // Calculer les statistiques
      const totalAssigned = Object.values(previousPlanning).reduce((total, employees) => 
        total + (employees?.length || 0), 0
      );
      const postesUtilises = Object.keys(previousPlanning).filter(posteId => 
        previousPlanning[posteId] && previousPlanning[posteId].length > 0
      ).length;
      
      toast.success(
        `✅ Planning du ${previousDayStr} importé !\n` +
        `👥 ${totalAssigned} employés assignés\n` +
        `📋 ${postesUtilises} postes couverts\n` +
        `✏️ Vous pouvez maintenant ajuster manuellement`,
        { 
          id: 'import-previous',
          duration: 5000 
        }
      );
      
      console.log('✅ Planning de la veille importé avec succès');
      
    } catch (error) {
      console.error('❌ Erreur import planning veille:', error);
      toast.error(`❌ Erreur import: ${error.message}`, { 
        id: 'import-previous',
        duration: 4000 
      });
    } finally {
      setImportLoading(false);
    }
  };

  /**
   * ✅ COPIE EXACTE LOGISTIQUE : Drag & Drop
   */
  const onDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    
    // Vérifications de base
    if (employees.length === 0) {
      toast.error('Données non chargées, veuillez patienter');
      return;
    }

    if (!planning || Object.keys(planning).length === 0) {
      toast.error('Planning non initialisé');
      return;
    }

    const dateKey = format(selectedDate, 'yyyy-MM-dd');

    // =================== GESTION DES ABSENTS ===================
    if (destination.droppableId.startsWith('absents_') || source.droppableId.startsWith('absents_')) {
      toast.error('👁️ Section absents en lecture seule - Utilisez la gestion des absences', { 
        duration: 3000 
      });
      return;
    }
    
    // Déplacement depuis la liste des employés vers le planning
    if (source.droppableId === 'employees-pool' && draggableId.startsWith('employee-')) {
      const employeeId = parseInt(draggableId.replace('employee-', ''));
      const draggedEmployee = employees.find(emp => emp.id === employeeId);
      
      if (!draggedEmployee) {
        console.error('❌ Employé non trouvé:', employeeId);
        toast.error('Employé non trouvé');
        return;
      }

      // ✅ COPIE LOGISTIQUE : Parser avec underscore
      const parts = destination.droppableId.split('_');
      
      if (parts.length !== 2) {
        console.error('❌ Format droppableId invalide:', destination.droppableId);
        toast.error('Destination invalide');
        return;
      }
      
      const [destDate, destPosteId] = parts;
      const destPoste = parseInt(destPosteId);
      
      if (!planning[destDate] || !planning[destDate][destPoste]) {
        console.error('❌ Destination invalide:', { destDate, destPoste });
        toast.error('Destination invalide');
        return;
      }
      
      const newPlanning = { ...planning };
      
      // Assigner l'employé
      const employeeWithRole = {
        ...draggedEmployee, 
        status: 'assigned',
        role: 'Équipier'
      };
      
      newPlanning[destDate][destPoste] = [
        ...newPlanning[destDate][destPoste],
        employeeWithRole
      ];
      
      // ✅ Mise à jour directe sans délai
      setPlanning(newPlanning);
      
      const posteInfo = postes.find(p => p.id === destPoste);
      toast.success(`${draggedEmployee.prenom || draggedEmployee.nom} assigné à ${posteInfo?.nom}`);
      
      return;
    }
    
    // Déplacement depuis le planning vers la sidebar employés (désassignation)
    if (destination.droppableId === 'employees-pool' && draggableId.startsWith('planning-')) {
      const sourceParts = source.droppableId.split('_');
      if (sourceParts.length !== 2) {
        console.error('❌ Format source droppableId invalide:', source.droppableId);
        toast.error('Source invalide');
        return;
      }
      
      const [sourceDate, sourcePosteId] = sourceParts;
      const sourcePoste = parseInt(sourcePosteId);
      
      const newPlanning = { ...planning };
      
      if (!newPlanning[sourceDate] || !newPlanning[sourceDate][sourcePoste]) {
        console.error('❌ Source invalide:', { sourceDate, sourcePoste });
        toast.error('Source invalide');
        return;
      }
      
      const draggedEmployee = newPlanning[sourceDate][sourcePoste][source.index];
      if (!draggedEmployee) {
        console.error('❌ Employé non trouvé à l\'index:', source.index);
        toast.error('Employé non trouvé');
        return;
      }
      
      // Retirer l'employé du planning
      newPlanning[sourceDate][sourcePoste].splice(source.index, 1);
      
      // ✅ Mise à jour directe sans délai
      setPlanning(newPlanning);
      toast.success(`${draggedEmployee.prenom || draggedEmployee.nom} désassigné`);
      
      return;
    }
    
    // Déplacement entre cases du planning
    if (draggableId.startsWith('planning-')) {
      const sourceParts = source.droppableId.split('_');
      const destParts = destination.droppableId.split('_');
      
      if (sourceParts.length !== 2 || destParts.length !== 2) {
        console.error('❌ Format droppableId invalide');
        toast.error('Format invalide');
        return;
      }
      
      const [sourceDate, sourcePosteId] = sourceParts;
      const [destDate, destPosteId] = destParts;
      const sourcePoste = parseInt(sourcePosteId);
      const destPoste = parseInt(destPosteId);
      
      const newPlanning = { ...planning };
      
      if (!newPlanning[sourceDate] || !newPlanning[sourceDate][sourcePoste]) {
        console.error('❌ Source invalide');
        toast.error('Source invalide');
        return;
      }
      if (!newPlanning[destDate]) newPlanning[destDate] = {};
      if (!newPlanning[destDate][destPoste]) newPlanning[destDate][destPoste] = [];
      
      const draggedEmployee = newPlanning[sourceDate][sourcePoste][source.index];
      if (!draggedEmployee) {
        console.error('❌ Employé non trouvé à l\'index:', source.index);
        toast.error('Employé non trouvé');
        return;
      }
      
      newPlanning[sourceDate][sourcePoste].splice(source.index, 1);
      newPlanning[destDate][destPoste].splice(destination.index, 0, draggedEmployee);
      
      // ✅ Mise à jour directe sans délai
      setPlanning(newPlanning);
      toast.success(`${draggedEmployee.prenom || draggedEmployee.nom} déplacé`);
      
      return;
    }
    
    console.warn('⚠️ Type de drag non reconnu:', draggableId);
    toast.error('Type de déplacement non reconnu');
  }, [selectedDate, employees, planning]);

  /**
   * ✅ COPIE EXACTE LOGISTIQUE : Sauvegarde
   */
  const savePlanning = async () => {
    if (Object.keys(planning).length === 0) {
      toast.error('Aucun planning à sauvegarder');
      return;
    }

    try {
      setSaving(true);
      toast.loading('💾 Sauvegarde en cours...', { id: 'save-planning' });
      
      const result = await supabaseCuisine.savePlanningCuisine(planning, selectedDate);
      
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
   * Reset du planning
   */
  const resetPlanning = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser le planning ?')) {
      createEmptyPlanning();
      toast.success('Planning réinitialisé');
    }
  };

  /**
   * 🔍 ACCESSIBILITÉ: Ouvrir le zoom photo au clic droit
   */
  const handlePhotoZoom = (e, employee) => {
    e.preventDefault(); // Empêche le menu contextuel par défaut
    setPhotoZoom(employee);
  };

  /**
   * 🔍 ACCESSIBILITÉ: Fermer le zoom photo
   */
  const closePhotoZoom = () => {
    setPhotoZoom(null);
  };

  /**
   * 🔍 ACCESSIBILITÉ: Gestion des touches (Échap pour fermer)
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && photoZoom) {
        closePhotoZoom();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [photoZoom]);

  /**
   * ✅ Employés disponibles (non absents)
   */
  const availableEmployees = employees.filter(emp => 
    !absences.some(absence => absence.employee_id === emp.id)
  );

  // Note: getAssignedEmployeeIds retiré car non utilisé actuellement

  /**
   * ✅ COPIE LOGISTIQUE : Rendu employé dans pool
   */
  const renderEmployeeInPool = (employee, index) => (
    <Draggable draggableId={`employee-${employee.id}`} index={index} key={employee.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onContextMenu={(e) => handlePhotoZoom(e, employee)}
          className={`mb-2 p-2 bg-white rounded-lg border cursor-move flex items-center space-x-2 ${
            snapshot.isDragging ? 'shadow-lg bg-blue-50' : 'hover:bg-gray-50'
          }`}
          title="Clic droit pour voir la photo en grand"
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {employee.photo_url ? (
              <img 
                src={employee.photo_url} 
                alt={employee.prenom || employee.nom} 
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 20%' }}
              />
            ) : (
              <span className="text-xs font-bold text-gray-600">
                {(employee.prenom || employee.nom || '??')[0]}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {employee.prenom || employee.nom}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );

  /**
   * ✅ COPIE LOGISTIQUE : Rendu employé assigné
   */
  const renderAssignedEmployee = (employee, index) => (
    <Draggable draggableId={`planning-${employee.id}-${index}`} index={index} key={`${employee.id}-${index}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onContextMenu={(e) => handlePhotoZoom(e, employee)}
          className={`mb-1 p-2 bg-white rounded border text-sm cursor-move ${
            snapshot.isDragging ? 'shadow-lg bg-blue-50' : 'hover:bg-gray-50'
          }`}
          title="Clic droit pour voir la photo en grand"
        >
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {employee.photo_url ? (
                <img 
                  src={employee.photo_url} 
                  alt={employee.prenom || employee.nom} 
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center 20%' }}
                />
              ) : (
                <span className="text-xs font-bold text-gray-600">
                  {(employee.prenom || employee.nom || '?')[0]}
                </span>
              )}
            </div>
            <span className="truncate">{employee.prenom || employee.nom}</span>
          </div>
        </div>
      )}
    </Draggable>
  );

  /**
   * ✅ COPIE LOGISTIQUE : Rendu colonne poste
   */
  const getPosteColumn = (poste, dateKey) => {
    const posteEmployees = planning[dateKey]?.[poste.id] || [];
    const droppableId = `${dateKey}_${poste.id}`;

    return (
      <div key={poste.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header du poste */}
        <div 
          className="p-3 rounded-t-lg text-white font-bold text-center"
          style={{ backgroundColor: poste.couleur }}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>{poste.icone}</span>
            <span className="text-sm">{poste.nom}</span>
          </div>
          <div className="text-xs opacity-80 mt-1">
            {posteEmployees.length} employé{posteEmployees.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Zone de drop */}
        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 min-h-[120px] ${
                snapshot.isDraggingOver 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50'
              }`}
            >
              {posteEmployees.map((emp, idx) => renderAssignedEmployee(emp, idx))}
              {provided.placeholder}
              
              {posteEmployees.length === 0 && (
                <div className="text-center text-gray-400 text-xs py-4">
                  Glisser un employé ici
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Chargement du planning</h3>
          <p className="text-gray-600">Préparation des données cuisine...</p>
        </div>
      </div>
    );
  }

  const dateKey = format(selectedDate, 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔙 Bouton retour cliqué - Navigation directe vers /cuisine');
                // Navigation directe - plus fiable
                window.location.href = '/cuisine';
              }}
              type="button"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </button>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">Planning Cuisine</h1>
            </div>
            
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={savePlanning}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
            
            <button
              onClick={handleGenerateAI}
              disabled={aiLoading}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-200 shadow-lg"
            >
              <span className="text-lg">{aiLoading ? '⚡' : '🤖'}</span>
              <span>{aiLoading ? 'Génération IA...' : 'Générer Planning IA'}</span>
            </button>
            
            <button
              onClick={resetPlanning}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Zap className="w-4 h-4" />
              <span>Reset</span>
            </button>
            
            <button
              onClick={importPlanningFromPreviousDay}
              disabled={importLoading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{importLoading ? 'Importation...' : 'Importer planning veille'}</span>
            </button>

            <button
              onClick={() => {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                window.open(`/cuisine/tv?date=${dateStr}`, '_blank');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Monitor className="w-4 h-4" />
              <span>Mode TV</span>
            </button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6">
          {/* Colonne employés disponibles */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="bg-blue-600 p-4 rounded-t-xl">
                <div className="flex items-center gap-2 text-white">
                  <User className="w-5 h-5" />
                  <h2 className="text-lg font-bold">
                    Employés ({availableEmployees.length})
                  </h2>
                </div>
              </div>
              
              <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <Droppable droppableId="employees-pool">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] ${
                        snapshot.isDraggingOver ? 'bg-blue-50' : ''
                      }`}
                    >
                      {availableEmployees.map((emp, idx) => renderEmployeeInPool(emp, idx))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </div>

          {/* Planning postes */}
          <div className="flex-1 grid grid-cols-4 gap-4">
            {postes.map(poste => getPosteColumn(poste, dateKey))}
          </div>
        </div>
      </DragDropContext>

      {/* 🔍 MODAL ZOOM PHOTO ACCESSIBILITÉ */}
      {photoZoom && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closePhotoZoom}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer */}
            <button
              onClick={closePhotoZoom}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              title="Fermer (ou appuyez sur Échap)"
            >
              ×
            </button>

            {/* Contenu du modal */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {photoZoom.prenom || photoZoom.nom}
              </h3>
              
              <div className="w-64 h-64 mx-auto rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {photoZoom.photo_url ? (
                  <img 
                    src={photoZoom.photo_url} 
                    alt={photoZoom.prenom || photoZoom.nom}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center 20%' }}
                  />
                ) : (
                  <div className="text-6xl font-bold text-gray-400">
                    {(photoZoom.prenom || photoZoom.nom || '?')[0]}
                  </div>
                )}
              </div>

              {/* Informations supplémentaires si disponibles */}
              {photoZoom.fonction && (
                <p className="text-lg text-gray-600 mt-4">
                  {photoZoom.fonction}
                </p>
              )}

              <p className="text-sm text-gray-500 mt-4">
                Clic à côté ou Échap pour fermer
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuisinePlanningSimple; 