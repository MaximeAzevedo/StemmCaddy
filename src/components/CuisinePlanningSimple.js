import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Calendar, 
  Save, 
  Zap,
  ArrowLeft,
  User,
  Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import { businessPlanningEngine } from '../lib/business-planning-engine';

const CuisinePlanningSimple = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planning, setPlanning] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Données cuisine
  const [employees, setEmployees] = useState([]);
  const [absences, setAbsences] = useState([]);
  
  // ✅ SIMPLE : Postes fixes comme les véhicules en logistique
  const postes = [
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
  ];

  /**
   * Chargement des données cuisine
   */
  const loadCuisineData = useCallback(async () => {
    try {
      setLoading(true);
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const [employeesResult, absencesResult] = await Promise.all([
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getAbsencesCuisine(dateString, dateString)
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
   * 🎯 GÉNÉRATION PLANNING MÉTIER - Compatible nouveau format
   */
  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      console.log('🎯 Démarrage génération planning métier...');
      
      // Génération métier
      const result = await businessPlanningEngine.generateOptimalPlanning(selectedDate);
      
      if (result.success && result.planning) {
        // ✅ Résultat déjà au bon format planning[dateKey][posteId] = [employees]
        setPlanning(result.planning);
        
        const stats = result.statistiques;
        toast.success(
          `✅ Planning métier généré !\n` +
          `📊 ${stats.employes_utilises} employés assignés\n` +
          `🎯 ${stats.postes_couverts} postes couverts\n` +
          `⚡ Méthode: ${stats.methode}`,
          { duration: 4000 }
        );
        
        console.log('✅ Planning métier appliqué:', result.planning);
      } else {
        throw new Error(result.error || 'Erreur génération métier');
      }
      
    } catch (error) {
      console.error('❌ Erreur génération métier:', error);
      toast.error(`❌ Erreur génération métier: ${error.message}`);
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
      
      // ✅ SOLUTION SIMPLE : Délai minimal pour éviter conflit avec react-beautiful-dnd
      setTimeout(() => {
        setPlanning(newPlanning);
      }, 50);
      
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
      
      // ✅ SOLUTION SIMPLE : Délai minimal pour éviter conflit avec react-beautiful-dnd
      setTimeout(() => {
        setPlanning(newPlanning);
      }, 50);
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
      
      // ✅ SOLUTION SIMPLE : Délai minimal pour éviter conflit avec react-beautiful-dnd
      setTimeout(() => {
        setPlanning(newPlanning);
      }, 50);
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
   * ✅ Employés disponibles (non absents)
   */
  const availableEmployees = employees.filter(emp => 
    !absences.some(absence => absence.employee_id === emp.id)
  );

  /**
   * ✅ Obtenir les employés assignés
   */
  const getAssignedEmployeeIds = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const assignedIds = new Set();
    
    if (planning[dateKey]) {
      Object.entries(planning[dateKey]).forEach(([key, employeeList]) => {
        if (key !== 'absents') {
          employeeList.forEach(emp => {
            assignedIds.add(emp.id);
          });
        }
      });
    }
    
    return assignedIds;
  };

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
          className={`mb-2 p-2 bg-white rounded-lg border cursor-move flex items-center space-x-2 ${
            snapshot.isDragging ? 'shadow-lg bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {employee.photo_url ? (
              <img 
                src={employee.photo_url} 
                alt={employee.prenom || employee.nom} 
                className="w-full h-full object-cover"
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
          className={`mb-1 p-2 bg-white rounded border text-sm cursor-move ${
            snapshot.isDragging ? 'shadow-lg bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {employee.photo_url ? (
                <img 
                  src={employee.photo_url} 
                  alt={employee.prenom || employee.nom} 
                  className="w-full h-full object-cover"
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
              onClick={() => navigate('/cuisine')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
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
              <span className="text-lg">{aiLoading ? '⚡' : '🎯'}</span>
              <span>{aiLoading ? 'Génération Métier...' : 'Générer Planning Métier'}</span>
            </button>
            
            <button
              onClick={resetPlanning}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Zap className="w-4 h-4" />
              <span>Reset</span>
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
    </div>
  );
};

export default CuisinePlanningSimple; 