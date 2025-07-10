import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import { SunIcon, MoonIcon, SparklesIcon, UserMinusIcon } from '@heroicons/react/24/outline';
import { PlanningAIHelpers } from '../lib/planning-ai';

const MAX_PER_CELL = 10;

// Configuration sessions & postes visibles (mêmes couleurs/icônes que le mode TV)
const postesMatin = ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits', 'Vaisselle', 'Légumerie'];
const postesApresMidi = ['Cuisine chaude', 'Sandwichs', 'Vaisselle', 'Légumerie'];

const sessionsConfig = {
  matin: {
    label: 'Matin',
    icon: SunIcon,
    color: 'from-yellow-400 to-orange-500',
    creneaux: ['8h', '10h'],
    postes: postesMatin,
  },
  'apres-midi': {
    label: 'Après-midi',
    icon: MoonIcon,
    color: 'from-blue-400 to-indigo-600',
    creneaux: ['12h'],
    postes: postesApresMidi,
  },
};

const CuisinePlanningInteractive = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentSession, setCurrentSession] = useState('matin');
  const [postes, setPostes] = useState([]); // liste complète (supabase)
  const [board, setBoard] = useState({});
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false); // État pour les opérations IA

  /* ---------------------- Construction du board ---------------------- */
  const buildInitialBoard = useCallback((allPostes, allCreneaux, empList, planningRows) => {
    const conf = sessionsConfig[currentSession];
    const posteNames = conf.postes;
    const creneauxWanted = conf.creneaux;

    const boardObj = { unassigned: [] };

    // Pour chaque poste visible et chaque créneau voulu, init tableau
    allPostes
      .filter((p) => posteNames.includes(p.nom))
      .forEach((poste) => {
        creneauxWanted.forEach((cNom) => {
          boardObj[`${poste.id}-${cNom}`] = [];
        });
      });

    // Remplir avec planning existant
    planningRows.forEach((row) => {
      // filtrer sur créneaux affichés
      if (!creneauxWanted.includes(row.creneau)) return;
      const cellId = `${row.poste_id}-${row.creneau}`;
      const ec = empList.find((e) => e.employee_id === row.employee_id);
      if (!ec) return;
      boardObj[cellId].push({
        draggableId: `plan-${row.id}`,
        planningId: row.id,
        employeeId: row.employee_id,
        employee: ec.employee,
        photo_url: ec.photo_url,
      });
    });

    // employés non planifiés
    empList.forEach((ec) => {
      const alreadyPlanned = planningRows.some((pr) => pr.employee_id === ec.employee_id && creneauxWanted.includes(pr.creneau));
      if (!alreadyPlanned) {
        const item = {
          draggableId: `emp-${ec.employee.id}`,
          planningId: null,
          employeeId: ec.employee.id,
          employee: ec.employee,
          photo_url: ec.photo_url,
        };
        boardObj.unassigned.push(item);
      }
    });

    return boardObj;
  }, [currentSession]);

  /* ---------------------- Chargement initial ---------------------- */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [postesRes, creneauxRes, employeesRes, planningRes] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCreneaux(),
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPlanningCuisine(dateStr),
      ]);

      if (postesRes.error) throw postesRes.error;
      if (creneauxRes.error) throw creneauxRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (planningRes.error) throw planningRes.error;

      setPostes(postesRes.data || []);

      const initialBoard = buildInitialBoard(postesRes.data, creneauxRes.data, employeesRes.data, planningRes.data);
      setBoard(initialBoard);
    } catch (err) {
      console.error('Erreur chargement planning:', err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, buildInitialBoard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---------------------- Drag & drop ---------------------- */
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const src = source.droppableId;
    const dest = destination.droppableId;
    if (src === dest && source.index === destination.index) return;

    const newBoard = { ...board };

    const sourceItems = Array.from(newBoard[src]);
    const [moved] = sourceItems.splice(source.index, 1);
    const destItems = Array.from(newBoard[dest]);

    // limite de 10 employés par case (sauf unassigned)
    if (!dest.startsWith('unassigned') && destItems.length >= MAX_PER_CELL) {
      toast.error('Maximum 10 employés dans ce créneau');
      return;
    }

    destItems.splice(destination.index, 0, moved);
    newBoard[src] = sourceItems;
    newBoard[dest] = destItems;

    setBoard(newBoard);

    // Persistances
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      if (dest === 'unassigned') {
        // suppression
        if (moved.planningId) {
          const { error } = await supabaseCuisine.deletePlanningCuisine(moved.planningId);
          if (error) throw error;
        }
      } else {
        const [posteIdStr, cren] = dest.split('-');
        const posteId = parseInt(posteIdStr, 10);
        if (moved.planningId) {
          // update
          const { error } = await supabaseCuisine.updatePlanningCuisine(moved.planningId, {
            poste_id: posteId,
            creneau: cren,
          });
          if (error) throw error;
        } else {
          // insert
          const { data, error } = await supabaseCuisine.createPlanningCuisine({
            date: dateStr,
            poste_id: posteId,
            creneau: cren,
            employee_id: moved.employeeId,
          });
          if (error) throw error;
          moved.planningId = data.id;
        }
      }
      toast.success('Planning mis à jour');
    } catch (err) {
      console.error(err);
      toast.error('Erreur sauvegarde');
      loadData();
    }
  };

  /* ---------------------- Fonctions IA ---------------------- */
  const generateAIPlanning = async () => {
    if (aiLoading) return;
    
    setAiLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Étape 1: Supprimer l'ancien planning pour éviter les doublons
      toast.loading('🧹 Nettoyage de l\'ancien planning...', { id: 'ai-planning' });
      
      // Récupérer le planning existant pour cette date
      const existingPlanningRes = await supabaseCuisine.getPlanningCuisine(dateStr);
      if (existingPlanningRes.data && existingPlanningRes.data.length > 0) {
        // Supprimer toutes les entrées existantes
        const deletePromises = existingPlanningRes.data.map(p => 
          supabaseCuisine.deletePlanningCuisine(p.id)
        );
        await Promise.all(deletePromises);
        console.log(`Supprimé ${existingPlanningRes.data.length} assignations existantes`);
      }
      
      // Étape 2: Charger les données actualisées
      toast.loading('📊 Analyse des données (employés, compétences, absences)...', { id: 'ai-planning' });
      
      const [employeesRes, postesRes, competencesRes, absencesRes] = await Promise.all([
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple(),
        supabaseCuisine.getAbsencesCuisine(dateStr, dateStr)
      ]);
      
      const employees = employeesRes.data || [];
      const postes = postesRes.data || [];
      const competences = competencesRes.data || [];
      const absences = absencesRes.data || [];
      
      // Étape 3: Filtrer les employés disponibles (pas absents)
      const availableEmployees = employees.filter(emp => {
        return !absences.some(absence => 
          absence.employee_id === emp.employee.id &&
          absence.statut === 'Confirmée' &&
          dateStr >= absence.date_debut &&
          dateStr <= absence.date_fin
        );
      });
      
      console.log(`Employés disponibles: ${availableEmployees.length}/${employees.length}`);
      
      // Étape 4: Construire la map des compétences
      const competenceMap = {};
      competences.forEach(comp => {
        if (!competenceMap[comp.employee_id]) {
          competenceMap[comp.employee_id] = [];
        }
        competenceMap[comp.employee_id].push(comp);
      });
      
      // Étape 5: Génération intelligente du planning avec protection anti-doublons
      toast.loading('🎯 Génération optimisée du planning...', { id: 'ai-planning' });
      
      const newPlanning = [];
      const sessionConfig = sessionsConfig[currentSession];
      const globalAssignedEmployees = new Set(); // Protection globale anti-doublons
      
      // Algorithme optimisé : une seule assignation par employé pour toute la session
      for (const posteName of sessionConfig.postes) {
        const poste = postes.find(p => p.nom === posteName);
        if (!poste) continue;
        
        for (const creneau of sessionConfig.creneaux) {
          // Filtrer uniquement les employés NON ENCORE ASSIGNÉS
          const availableCandidates = availableEmployees.filter(emp => 
            !globalAssignedEmployees.has(emp.employee.id)
          );
          
          if (availableCandidates.length === 0) {
            console.warn(`Plus d'employés disponibles pour ${posteName} ${creneau}`);
            continue;
          }
          
          // Séparer employés qualifiés vs non qualifiés
          const qualifiedCandidates = availableCandidates.filter(emp => {
            const empCompetences = competenceMap[emp.employee.id] || [];
            return empCompetences.some(c => c.poste_id === poste.id);
          });
          
          // Prioriser les qualifiés, sinon prendre les autres
          const candidates = qualifiedCandidates.length > 0 ? qualifiedCandidates : availableCandidates;
          
          // Calculer score pour chaque candidat disponible
          const scoredCandidates = candidates.map(emp => {
            let score = 0;
            
            // Bonus important si compétent
            const empCompetences = competenceMap[emp.employee.id] || [];
            if (empCompetences.some(c => c.poste_id === poste.id)) {
              score += 100; // Bonus très élevé pour les compétents
            }
            
            // Bonus profil
            if (emp.employee.profil === 'Fort') score += 50;
            else if (emp.employee.profil === 'Moyen') score += 30;
            else score += 15;
            
            // Bonus langues
            score += (emp.employee.langues?.length || 0) * 10;
            
            // Ajouter un peu d'aléatoire pour varier
            score += Math.random() * 10;
            
            return { ...emp, score };
          }).sort((a, b) => b.score - a.score);
          
          // Déterminer nombre d'employés à assigner
          const maxAssignments = ['Cuisine chaude', 'Vaisselle'].includes(posteName) ? 2 : 1;
          const assignedCount = Math.min(maxAssignments, scoredCandidates.length);
          
          // Assigner les meilleurs candidats
          for (let i = 0; i < assignedCount; i++) {
            if (scoredCandidates[i] && !globalAssignedEmployees.has(scoredCandidates[i].employee.id)) {
              const employee = scoredCandidates[i];
              
              newPlanning.push({
                date: dateStr,
                poste_id: poste.id,
                creneau: creneau,
                employee_id: employee.employee.id
              });
              
              // IMPORTANT: Marquer cet employé comme globalement assigné
              globalAssignedEmployees.add(employee.employee.id);
              
              console.log(`Assigné ${employee.employee.prenom} ${employee.employee.nom} à ${posteName} ${creneau}`);
            }
          }
        }
      }
      
      console.log(`Planning généré: ${newPlanning.length} assignations, ${globalAssignedEmployees.size} employés uniques`);
      
      // Étape 6: Sauvegarder le nouveau planning
      toast.loading('💾 Sauvegarde du planning optimisé...', { id: 'ai-planning' });
      
      const savePromises = newPlanning.map(assignment => 
        supabaseCuisine.createPlanningCuisine(assignment)
      );
      const saveResults = await Promise.all(savePromises);
      
      const successful = saveResults.filter(r => !r.error).length;
      const failed = saveResults.filter(r => r.error).length;
      
      if (failed > 0) {
        console.warn(`${failed} assignations ont échoué:`, saveResults.filter(r => r.error));
      }
      
      // Étape 7: Recharger l'affichage
      await loadData();
      
      toast.success(
        `🎉 Planning IA généré avec succès !\n✅ ${successful} assignations créées\n👥 ${availableEmployees.length} employés mobilisés\n🎯 Absences automatiquement prises en compte`, 
        { id: 'ai-planning', duration: 4000 }
      );
      
    } catch (error) {
      console.error('Erreur génération IA:', error);
      toast.error(`❌ Erreur lors de la génération: ${error.message}`, { id: 'ai-planning' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleQuickAbsence = async (employeeId, reason = 'Absence') => {
    if (aiLoading) return;
    
    setAiLoading(true);
    try {
      const result = await PlanningAIHelpers.handleEmployeeAbsence(employeeId, selectedDate, reason);
      
      if (result.success) {
        toast.success(`Absence gérée ! ${result.replacements} remplacements trouvés`);
        await loadData();
      } else {
        toast.error('Erreur lors de la gestion d\'absence');
        console.error('Erreur absence:', result.error);
      }
    } catch (error) {
      toast.error('Erreur technique absence');
      console.error('Erreur absence:', error);
    } finally {
      setAiLoading(false);
    }
  };

  /* ---------------------- Rendus utilitaires ---------------------- */
  const renderEmployeeCircle = (item, index) => (
    <Draggable draggableId={item.draggableId} index={index} key={item.draggableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`w-16 h-16 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-md flex items-center justify-center text-sm font-bold text-gray-700 cursor-pointer select-none relative group ${
            snapshot.isDragging ? 'scale-110 shadow-lg' : ''
          }`}
        >
          {item.photo_url ? (
            <img src={item.photo_url} alt={item.employee.nom} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">
              {item.employee.prenom?.[0]}
              {item.employee.nom?.[0]}
            </span>
          )}
          
          {/* Bouton absence rapide */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleQuickAbsence(item.employeeId);
            }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-xs hover:bg-red-600"
            title="Déclarer absent"
            disabled={aiLoading}
          >
            <UserMinusIcon className="w-3 h-3" />
          </button>
        </div>
      )}
    </Draggable>
  );

  const renderDroppable = (droppableId, items, horizontal = false, isUnassigned = false) => (
    <Droppable droppableId={droppableId} direction={horizontal ? 'horizontal' : 'vertical'} key={droppableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`${
            isUnassigned ? 'grid grid-cols-3 gap-2' : horizontal ? 'flex space-x-2' : 'flex flex-col space-y-2'
          } min-h-[72px] p-1 ${snapshot.isDraggingOver ? 'bg-orange-50' : ''}`}
        >
          {items.map((item, idx) => renderEmployeeCircle(item, idx))}
          {provided.placeholder}
          {items.length === 0 && !horizontal && (
            <div className="text-center text-gray-400 text-xs italic">Vide</div>
          )}
        </div>
      )}
    </Droppable>
  );

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
      </div>
    );
  }

  const conf = sessionsConfig[currentSession];
  const postesToDisplay = postes.filter((p) => conf.postes.includes(p.nom));

  return (
    <div className="space-y-6">
      {/* Contrôles haut */}
      <div className="flex items-center space-x-4 flex-wrap">
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="border rounded-lg px-3 py-1 text-sm"
        />
        {/* Sélecteur session */}
        {Object.keys(sessionsConfig).map((key) => {
          const Icon = sessionsConfig[key].icon;
          return (
            <button
              key={key}
              onClick={() => setCurrentSession(key)}
              className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-lg border ${
                currentSession === key ? 'bg-orange-600 text-white' : 'bg-white text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sessionsConfig[key].label}</span>
            </button>
          );
        })}

        {/* Bouton IA unique simplifié */}
        <div className="flex items-center space-x-2 ml-auto">
          <button
            onClick={generateAIPlanning}
            disabled={aiLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {aiLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Génération IA...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                <span>🎯 Planning IA Auto</span>
              </>
            )}
          </button>
          
          <button
            onClick={loadData}
            className="px-3 py-1 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700"
            disabled={aiLoading}
          >
            Recharger
          </button>
          
          <button
            onClick={() => window.open('/cuisine/tv','_blank')}
            className="px-3 py-1 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center space-x-1"
          >
            <span>📺</span>
            <span>Mode TV</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-6 overflow-x-auto">
          {/* Colonne Disponible - Plus large */}
          <div className="w-60 shrink-0">
            <h3 className="text-sm font-semibold mb-3 text-center bg-gray-100 rounded-lg py-2">
              👥 Disponibles ({(board['unassigned'] || []).length})
            </h3>
            {renderDroppable('unassigned', board['unassigned'] || [], false, true)}
          </div>

          {/* Grille cartes - Plus large et mieux organisée */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {postesToDisplay.map((poste) => (
              <div
                key={poste.id}
                className="relative bg-white rounded-xl shadow-lg p-5 border-2 flex flex-col min-h-[200px]"
                style={{ borderColor: poste.couleur }}
              >
                {/* Header poste */}
                <div className="flex items-center justify-center mb-4">
                  <div
                    className="flex items-center space-x-2 px-4 py-2 rounded-full text-white font-bold text-sm shadow-lg"
                    style={{ backgroundColor: poste.couleur }}
                  >
                    <span className="text-lg">{poste.icone}</span>
                    <span>{poste.nom}</span>
                  </div>
                </div>

                {/* Sessions */}
                <div className="flex-1 space-y-3">
                  {conf.creneaux.map((cr) => {
                    const cellId = `${poste.id}-${cr}`;
                    const assignedCount = (board[cellId] || []).length;
                    return (
                      <div key={cellId} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{cr}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {assignedCount} pers.
                          </span>
                        </div>
                        {renderDroppable(cellId, board[cellId] || [], true)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default CuisinePlanningInteractive; 