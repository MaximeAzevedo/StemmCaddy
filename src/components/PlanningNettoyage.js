import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Calendar, 
  Save, 
  Zap,
  ArrowLeft,
  User,
  Sparkles,
  Tv
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabaseCuisine } from '../lib/supabase-cuisine'; // Planning nettoyage
import { supabaseCuisineAdvanced } from '../lib/supabase-cuisine-advanced'; // Absences avancées

const PlanningNettoyage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planning, setPlanning] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Données employés
  const [employees, setEmployees] = useState([]);
  const [absences, setAbsences] = useState([]);
  
  // ✅ 6 ZONES DE NETTOYAGE avec images
  const zones = [
    { 
      id: 1, 
      nom: 'Plonge', 
      couleur: '#3b82f6', 
      image: '/images/nettoyage/plonge.jpg',
      icone: '🧽'
    },
    { 
      id: 2, 
      nom: 'Couloir sale et frigo', 
      couleur: '#ef4444', 
      image: '/images/nettoyage/couloir-sale-frigo.jpg',
      icone: '🚪'
    },
    { 
      id: 3, 
      nom: 'Légumerie', 
      couleur: '#10b981', 
      image: '/images/nettoyage/legumerie.jpg',
      icone: '🥬'
    },
    { 
      id: 4, 
      nom: 'Cuisine chaude', 
      couleur: '#f59e0b', 
      image: '/images/nettoyage/cuisine-chaude.jpg',
      icone: '🔥'
    },
    { 
      id: 5, 
      nom: 'Sandwicherie et sous vide', 
      couleur: '#8b5cf6', 
      image: '/images/nettoyage/sandwicherie-sous-vide.jpg',
      icone: '🥪'
    },
    { 
      id: 6, 
      nom: 'Couloir propre et frigo', 
      couleur: '#22c55e', 
      image: '/images/nettoyage/couloir-propre-frigo.jpg',
      icone: '✨'
    }
  ];

  /**
   * Chargement des données employés (même logique que cuisine)
   */
  const loadData = useCallback(async () => {
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
      
      console.log('🧹 Employés chargés pour nettoyage:', employees.length);
      console.log('🧹 Absences chargées:', absences.length);
      
      setEmployees(employees);
      setAbsences(absences);
      
    } catch (error) {
      console.error('❌ Erreur chargement données nettoyage:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * ✅ Créer un planning vide
   */
  const createEmptyPlanning = useCallback(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newPlanning = {};
    
    newPlanning[dateKey] = {
      absents: [] // Section absents
    };
    
    zones.forEach(zone => {
      newPlanning[dateKey][zone.id] = [];
    });
    
    setPlanning(newPlanning);
    console.log('🧹 Planning nettoyage vide initialisé');
  }, [selectedDate]);

  /**
   * ✅ Initialisation planning avec chargement DB et absences
   */
  const initializePlanning = useCallback(async () => {
    if (zones.length === 0) return;
    
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      
      // Charger planning existant depuis la DB
      const planningResult = await supabaseCuisine.loadPlanningNettoyage(selectedDate);
      
      const finalPlanning = {};
      finalPlanning[dateKey] = {
        absents: [] // Initialiser la section absents
      };
      
      // Initialiser toutes les zones avec les données existantes ou vide
      zones.forEach(zone => {
        finalPlanning[dateKey][zone.id] = planningResult.data[zone.id] || [];
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
      console.log('✅ Planning nettoyage initialisé avec données DB');
      
    } catch (error) {
      console.error('❌ Erreur initialisation planning nettoyage:', error);
      createEmptyPlanning();
    }
  }, [selectedDate, createEmptyPlanning, absences]);

  useEffect(() => {
    if (!loading && zones.length > 0) {
      initializePlanning();
    }
  }, [loading, selectedDate, initializePlanning]);

  /**
   * 🎯 Génération automatique simple : répartir équitablement
   */
  const handleGenerateAuto = async () => {
    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      const availableEmployees = employees.filter(emp => 
        emp.actif && !absences.some(absence => absence.employee_id === emp.id)
      );

      if (availableEmployees.length === 0) {
        toast.error('Aucun employé disponible pour le nettoyage');
        return;
      }

      const newPlanning = { ...planning };
      if (!newPlanning[dateKey]) {
        newPlanning[dateKey] = { absents: [] };
        zones.forEach(zone => {
          newPlanning[dateKey][zone.id] = [];
        });
      }

      // Vider toutes les zones
      zones.forEach(zone => {
        newPlanning[dateKey][zone.id] = [];
      });

      // Répartition équitable
      const employeesPerZone = Math.floor(availableEmployees.length / zones.length);
      const remainingEmployees = availableEmployees.length % zones.length;

      let employeeIndex = 0;
      
      zones.forEach((zone, zoneIndex) => {
        const employeesForThisZone = employeesPerZone + (zoneIndex < remainingEmployees ? 1 : 0);
        
        for (let i = 0; i < employeesForThisZone && employeeIndex < availableEmployees.length; i++) {
          newPlanning[dateKey][zone.id].push({
            ...availableEmployees[employeeIndex],
            status: 'assigned',
            role: 'Nettoyage'
          });
          employeeIndex++;
        }
      });

      setPlanning(newPlanning);
      
      toast.success(
        `✅ Planning nettoyage généré !\n` +
        `🧹 ${availableEmployees.length} employés répartis\n` +
        `📍 ${zones.length} zones couvertes`,
        { duration: 3000 }
      );
      
    } catch (error) {
      console.error('❌ Erreur génération auto nettoyage:', error);
      toast.error('Erreur lors de la génération automatique');
    }
  };

  /**
   * ✅ Drag & Drop (même logique que cuisine, sans vérification compétences)
   */
  const onDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    
    if (employees.length === 0) {
      toast.error('Données non chargées, veuillez patienter');
      return;
    }

    if (!planning || Object.keys(planning).length === 0) {
      toast.error('Planning non initialisé');
      return;
    }

    const dateKey = format(selectedDate, 'yyyy-MM-dd');

    // Gestion des absents (lecture seule)
    if (destination.droppableId.startsWith('absents_') || source.droppableId.startsWith('absents_')) {
      toast.error('👁️ Section absents en lecture seule', { duration: 3000 });
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

      const parts = destination.droppableId.split('_');
      
      if (parts.length !== 2) {
        console.error('❌ Format droppableId invalide:', destination.droppableId);
        toast.error('Destination invalide');
        return;
      }
      
      const [destDate, destZoneId] = parts;
      const destZone = parseInt(destZoneId);
      
      if (!planning[destDate] || !planning[destDate][destZone]) {
        console.error('❌ Destination invalide:', { destDate, destZone });
        toast.error('Destination invalide');
        return;
      }
      
      const newPlanning = { ...planning };
      
      const employeeWithRole = {
        ...draggedEmployee, 
        status: 'assigned',
        role: 'Nettoyage'
      };
      
      newPlanning[destDate][destZone] = [
        ...newPlanning[destDate][destZone],
        employeeWithRole
      ];
      
      setPlanning(newPlanning);
      
      const zoneInfo = zones.find(z => z.id === destZone);
      toast.success(`${draggedEmployee.prenom || draggedEmployee.nom} assigné à ${zoneInfo?.nom}`);
      
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
      
      const [sourceDate, sourceZoneId] = sourceParts;
      const sourceZone = parseInt(sourceZoneId);
      
      const newPlanning = { ...planning };
      
      if (!newPlanning[sourceDate] || !newPlanning[sourceDate][sourceZone]) {
        console.error('❌ Source invalide:', { sourceDate, sourceZone });
        toast.error('Source invalide');
        return;
      }
      
      const draggedEmployee = newPlanning[sourceDate][sourceZone][source.index];
      if (!draggedEmployee) {
        console.error('❌ Employé non trouvé à l\'index:', source.index);
        toast.error('Employé non trouvé');
        return;
      }
      
      newPlanning[sourceDate][sourceZone].splice(source.index, 1);
      
      setPlanning(newPlanning);
      toast.success(`${draggedEmployee.prenom || draggedEmployee.nom} désassigné`);
      
      return;
    }
    
    // Déplacement entre zones du planning
    if (draggableId.startsWith('planning-')) {
      const sourceParts = source.droppableId.split('_');
      const destParts = destination.droppableId.split('_');
      
      if (sourceParts.length !== 2 || destParts.length !== 2) {
        console.error('❌ Format droppableId invalide');
        toast.error('Format invalide');
        return;
      }
      
      const [sourceDate, sourceZoneId] = sourceParts;
      const [destDate, destZoneId] = destParts;
      const sourceZone = parseInt(sourceZoneId);
      const destZone = parseInt(destZoneId);
      
      const newPlanning = { ...planning };
      
      if (!newPlanning[sourceDate] || !newPlanning[sourceDate][sourceZone]) {
        console.error('❌ Source invalide');
        toast.error('Source invalide');
        return;
      }
      if (!newPlanning[destDate]) newPlanning[destDate] = {};
      if (!newPlanning[destDate][destZone]) newPlanning[destDate][destZone] = [];
      
      const draggedEmployee = newPlanning[sourceDate][sourceZone][source.index];
      if (!draggedEmployee) {
        console.error('❌ Employé non trouvé à l\'index:', source.index);
        toast.error('Employé non trouvé');
        return;
      }
      
      newPlanning[sourceDate][sourceZone].splice(source.index, 1);
      newPlanning[destDate][destZone].splice(destination.index, 0, draggedEmployee);
      
      setPlanning(newPlanning);
      toast.success(`${draggedEmployee.prenom || draggedEmployee.nom} déplacé`);
      
      return;
    }
    
    console.warn('⚠️ Type de drag non reconnu:', draggableId);
    toast.error('Type de déplacement non reconnu');
  }, [selectedDate, employees, planning]);

  /**
   * ✅ Sauvegarde en base de données
   */
  const savePlanning = async () => {
    if (Object.keys(planning).length === 0) {
      toast.error('Aucun planning à sauvegarder');
      return;
    }

    try {
      setSaving(true);
      toast.loading('💾 Sauvegarde planning nettoyage...', { id: 'save-nettoyage' });
      
      const result = await supabaseCuisine.savePlanningNettoyage(planning, selectedDate);
      
      if (result.error) {
        throw result.error;
      }
      
      const totalAssignations = result.data?.length || 0;
      toast.success(`✅ Planning nettoyage sauvegardé ! (${totalAssignations} assignations)`, { 
        id: 'save-nettoyage',
        duration: 3000 
      });
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde planning nettoyage:', error);
      toast.error(`❌ Erreur sauvegarde: ${error.message}`, { 
        id: 'save-nettoyage',
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
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser le planning nettoyage ?')) {
      createEmptyPlanning();
      toast.success('Planning nettoyage réinitialisé');
    }
  };

  /**
   * ✅ Employés disponibles (non absents)
   */
  const availableEmployees = employees.filter(emp => 
    emp.actif && !absences.some(absence => absence.employee_id === emp.id)
  );

  /**
   * ✅ Rendu employé dans pool
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
   * ✅ Rendu employé assigné
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
   * ✅ Rendu colonne zone
   */
  const getZoneColumn = (zone, dateKey) => {
    const zoneEmployees = planning[dateKey]?.[zone.id] || [];
    const droppableId = `${dateKey}_${zone.id}`;

    return (
      <div key={zone.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header de la zone avec image */}
        <div 
          className="p-4 text-white font-bold text-center relative"
          style={{ backgroundColor: zone.couleur }}
        >
          {/* Image de fond si disponible */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ 
              backgroundImage: `url(${zone.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          ></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <span className="text-2xl">{zone.icone}</span>
              <h3 className="text-lg font-bold">{zone.nom}</h3>
            </div>
            <div className="text-sm opacity-90">
              {zoneEmployees.length} employé{zoneEmployees.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Zone de drop */}
        <Droppable droppableId={droppableId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-4 min-h-[120px] ${
                snapshot.isDraggingOver 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50'
              }`}
            >
              {zoneEmployees.map((emp, idx) => renderAssignedEmployee(emp, idx))}
              {provided.placeholder}
              
              {zoneEmployees.length === 0 && (
                <div className="text-center text-gray-400 text-xs py-8">
                  <div className="mb-2">{zone.icone}</div>
                  <div>Glisser un employé ici</div>
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
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-green-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Chargement du planning nettoyage</h3>
          <p className="text-gray-600">Préparation des données...</p>
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
              <Sparkles className="w-5 h-5 text-green-600" />
              <h1 className="text-xl font-bold text-gray-800">Planning Nettoyage</h1>
            </div>
            
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              onClick={handleGenerateAuto}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Répartir Automatiquement</span>
            </button>
            
            <button
              onClick={() => window.open(`/cuisine/nettoyage/tv?date=${format(selectedDate, 'yyyy-MM-dd')}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <Tv className="w-4 h-4" />
              <span>Mode TV</span>
            </button>
            
            <button
              onClick={resetPlanning}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Zap className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6">
          {/* Colonne employés disponibles */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="bg-green-600 p-4 rounded-t-xl">
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
                        snapshot.isDraggingOver ? 'bg-green-50' : ''
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

          {/* Zones de nettoyage */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            {zones.map(zone => getZoneColumn(zone, dateKey))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default PlanningNettoyage; 