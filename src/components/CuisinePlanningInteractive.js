import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine, getCreneauxForPoste, mapOldCreneauToNew, isCreneauValidForPoste } from '../lib/supabase-cuisine';
import { SunIcon, MoonIcon, SparklesIcon } from '@heroicons/react/24/outline';
import CuisineAIAssistant from './CuisineAIAssistant';

const MAX_PER_CELL = 10;

const sessionsConfig = {
  matin: {
    label: 'Matin',
    icon: SunIcon,
    color: 'from-yellow-400 to-orange-500',
    postesActifs: ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits', 'Vaisselle', 'Légumerie', 'Self Midi', 'Equipe Pina et Saskia'],
    creneaux: ['8h', '10h', 'midi', '11h-11h45', '11h45-12h45']
  },
  'apres-midi': {
    label: 'Après-midi',
    icon: MoonIcon,
    color: 'from-blue-400 to-indigo-600',
    postesActifs: ['Cuisine chaude', 'Sandwichs', 'Pain', 'Jus de fruits', 'Vaisselle', 'Légumerie', 'Equipe Pina et Saskia'],
    creneaux: ['8h', '10h', 'midi']
  }
};

const CuisinePlanningInteractive = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentSession, setCurrentSession] = useState('matin');
  const [postes, setPostes] = useState([]);
  const [board, setBoard] = useState({});
  const [availableEmployees, setAvailableEmployees] = useState([]); // Employés toujours disponibles
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  /* ---------------------- Construction intelligente du board ---------------------- */
  const buildSmartBoard = useCallback(async (allPostes, allCreneaux, empList, planningRows, absences) => {
    const conf = sessionsConfig[currentSession];
    const boardObj = { unassigned: [] };

    // Filtrer les employés présents (pas absents)
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const absentEmployeeIds = absences
      .filter(abs => abs.statut === 'Confirmée' && dateStr >= abs.date_debut && dateStr <= abs.date_fin)
      .map(abs => abs.employee_id);
    
    const presentEmployees = empList.filter(ec => !absentEmployeeIds.includes(ec.employee.id));
    
    // Tous les postes existent maintenant en base de données
    const postesActifs = allPostes.filter(p => conf.postesActifs.includes(p.nom));
    
    postesActifs.forEach(poste => {
      const creneauxForPoste = getCreneauxForPoste(poste.nom, currentSession);
      creneauxForPoste.forEach(creneau => {
        boardObj[`${poste.id}-${creneau}`] = [];
      });
    });

    // Remplir avec le planning existant
    planningRows.forEach(row => {
      const poste = allPostes.find(p => p.id === row.poste_id);
      if (!poste || !conf.postesActifs.includes(poste.nom)) {
        console.log(`⚠️ buildSmartBoard: Poste ${row.poste_id} non trouvé ou inactif pour session ${currentSession}`);
        return;
      }
      
      // NOUVELLE LOGIQUE : Utiliser isCreneauValidForPoste avec mapping automatique
      if (!isCreneauValidForPoste(row.creneau, poste.nom, currentSession)) {
        console.log(`⚠️ buildSmartBoard: Créneau "${row.creneau}" pas valide pour poste "${poste.nom}" en session "${currentSession}"`);
        return;
      }
      
      // Mapper le créneau de l'ancien vers le nouveau format
      const mappedCreneau = mapOldCreneauToNew(row.creneau, poste.nom);
      const cellId = `${row.poste_id}-${mappedCreneau}`;
      
      const ec = presentEmployees.find(e => e.employee_id === row.employee_id);
      if (!ec) {
        console.log(`⚠️ buildSmartBoard: Employé ${row.employee_id} non trouvé ou absent`);
        return;
      }
      
      if (!boardObj[cellId]) {
        console.log(`⚠️ buildSmartBoard: Cellule ${cellId} n'existe pas`);
        return;
      }
      
      console.log(`✅ buildSmartBoard: Assignation ${ec.employee.nom} → ${poste.nom}-${mappedCreneau} (original: ${row.creneau})`);
      
      boardObj[cellId].push({
        draggableId: `plan-${row.id}`,
        planningId: row.id,
        employeeId: row.employee_id,
        employee: ec.employee,
        photo_url: ec.photo_url,
      });
    });

    // TOUS les employés présents restent toujours disponibles
    const availableItems = presentEmployees.map(ec => ({
      draggableId: `emp-${ec.employee.id}`,
      planningId: null,
      employeeId: ec.employee.id,
      employee: ec.employee,
      photo_url: ec.photo_url,
    }));
    
    setAvailableEmployees(availableItems);
    return boardObj;
  }, [currentSession, selectedDate]);

  /* ---------------------- Chargement des données ---------------------- */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // S'assurer que les postes par défaut existent en base
      const postsCreationResult = await supabaseCuisine.ensureDefaultPostes();
      if (postsCreationResult.created > 0) {
        toast.success(`${postsCreationResult.created} nouveau(x) poste(s) créé(s) en base de données`, { duration: 3000 });
      }
      
      const [postesRes, creneauxRes, employeesRes, planningRes, absencesRes] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCreneaux(),
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPlanningCuisine(dateStr),
        supabaseCuisine.getAbsencesCuisine(dateStr, dateStr)
      ]);

      if (postesRes.error || creneauxRes.error || employeesRes.error || planningRes.error) {
        throw new Error('Erreur de chargement des données');
      }

      setPostes(postesRes.data || []);
      
      const smartBoard = await buildSmartBoard(
        postesRes.data || [], 
        creneauxRes.data || [], 
        employeesRes.data || [], 
        planningRes.data || [],
        absencesRes.data || []
      );
      
      setBoard(smartBoard);
    } catch (err) {
      console.error('Erreur chargement planning:', err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, buildSmartBoard]);

  /* ---------------------- Sauvegarde complète du planning ---------------------- */
  const saveAllPlanning = async () => {
    try {
      setSaving(true);
      let savedCount = 0;
      
      // Parcourir toutes les cellules du board et sauvegarder
      for (const cellId of Object.keys(board)) {
        if (cellId === 'unassigned') continue;
        
        const items = board[cellId] || [];
        for (const item of items) {
          if (!item.planningId) {
            await saveAssignment(item, cellId);
            savedCount++;
          }
        }
      }
      
      setLastSaved(new Date());
      toast.success(`Planning sauvegardé ! (${savedCount} nouvelles affectations)`, { duration: 2000 });
      
    } catch (error) {
      console.error('Erreur sauvegarde complète:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------- Rechargement lors du changement de session ---------------------- */
  useEffect(() => {
    loadData();
  }, [selectedDate, currentSession, loadData]); // Recharger quand la date OU la session change

  /* ---------------------- Changement de session ---------------------- */
  const handleSessionChange = (newSession) => {
    setCurrentSession(newSession);
    // Le useEffect ci-dessus se chargera du rechargement
  };

  /* ---------------------- Drag & drop avec logique de clonage - RESTAURÉ ---------------------- */
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const src = source.droppableId;
    const dest = destination.droppableId;
    
    // Si on déplace depuis "unassigned", on CLONE (la personne reste disponible)
    if (src === 'unassigned') {
      const draggedItem = availableEmployees[source.index];
      const newBoard = { ...board };
      
      if (!newBoard[dest]) newBoard[dest] = [];
      if (newBoard[dest].length >= MAX_PER_CELL) {
        toast.error('Maximum 10 employés par créneau');
        return;
      }

      // Créer un nouvel item cloné (ASSIGNATIONS MULTIPLES AUTORISÉES)
      const clonedItem = {
        ...draggedItem,
        draggableId: `plan-new-${Date.now()}-${draggedItem.employeeId}`,
        planningId: null
      };
      
      console.log(`✅ Assignation multiple autorisée: ${draggedItem.employee.nom} → ${dest}`);
      
      newBoard[dest].push(clonedItem);
      setBoard(newBoard);
      
      // Sauvegarder en base
      await saveAssignment(clonedItem, dest);
    } else {
      // Déplacement normal entre cellules de planning
      const newBoard = { ...board };
      const sourceItems = Array.from(newBoard[src] || []);
      const [moved] = sourceItems.splice(source.index, 1);
      
      if (dest === 'unassigned') {
        // Suppression - retour aux disponibles
        newBoard[src] = sourceItems;
        setBoard(newBoard);
        if (moved.planningId) {
          await supabaseCuisine.deletePlanningCuisine(moved.planningId);
          console.log(`🗑️ Suppression planning ID ${moved.planningId} pour ${moved.employee.nom}`);
        }
      } else {
        // Déplacement entre postes
        if (!newBoard[dest]) newBoard[dest] = [];
        if (newBoard[dest].length >= MAX_PER_CELL) {
          toast.error('Maximum 10 employés par créneau');
          return;
        }
        
        const destItems = Array.from(newBoard[dest]);
        destItems.splice(destination.index, 0, moved);
        newBoard[src] = sourceItems;
        newBoard[dest] = destItems;
        setBoard(newBoard);
        
        console.log(`🔄 Déplacement: ${moved.employee.nom} de ${src} vers ${dest}`);
        await saveAssignment(moved, dest);
      }
    }
  };

  // Mettre à jour automatiquement la sauvegarde lors des drag & drop
  const saveAssignment = async (item, cellId) => {
    try {
      // CORRECTION AMÉLIORÉE: Parser correctement les cellId avec créneaux contenant des tirets
      // Format attendu: "posteId-creneau" où creneau peut contenir des tirets
      // Trouver le premier tiret pour séparer posteId du reste
      const dashIndex = cellId.indexOf('-');
      if (dashIndex === -1) {
        toast.error(`Erreur: Format cellId invalide (${cellId})`);
        return;
      }
      
      const posteIdStr = cellId.substring(0, dashIndex);
      const creneau = cellId.substring(dashIndex + 1);
      const posteId = parseInt(posteIdStr, 10);
      
      if (isNaN(posteId)) {
        toast.error(`Erreur: ID poste invalide (${posteIdStr})`);
        return;
      }
      
      console.log(`💾 Sauvegarde: posteId=${posteId}, creneau="${creneau}", employeeId=${item.employeeId}`);
      
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const planningData = {
        date: dateStr,
        poste_id: posteId,
        creneau: creneau,
        employee_id: item.employeeId,
      };
      
      if (item.planningId) {
        // Update existant
        const updateResult = await supabaseCuisine.updatePlanningCuisine(item.planningId, {
          poste_id: posteId,
          creneau: creneau,
        });
        
        if (updateResult.error) {
          console.error('❌ Erreur mise à jour planning:', updateResult.error);
          toast.error(`Erreur mise à jour: ${updateResult.error.message}`);
          return;
        }
        
        console.log(`✅ Mise à jour planning ID ${item.planningId}`);
      } else {
        // Nouvelle création
        const { data, error } = await supabaseCuisine.createPlanningCuisine(planningData);
        
        if (error) {
          console.error('❌ Erreur création planning:', error);
          toast.error(`Erreur sauvegarde: ${error.message}`);
          return;
        }
        
        if (data) {
          item.planningId = data.id;
          setLastSaved(new Date());
          console.log(`✅ Nouveau planning créé ID ${data.id}`);
          
          // VÉRIFICATION IMMÉDIATE : Contrôler que la donnée est bien en base
          const { data: verification, error: verifyError } = await supabaseCuisine.supabase
            .from('planning_cuisine')
            .select('*')
            .eq('id', data.id)
            .single();
          
          if (verifyError) {
            console.warn('⚠️ Impossible de vérifier la sauvegarde:', verifyError);
          } else if (verification) {
            console.log('✅ VÉRIFICATION OK - Donnée confirmée en base:', verification);
          } else {
            console.error('❌ VÉRIFICATION ÉCHOUÉE - Donnée non trouvée en base!');
            toast.error('Attention: problème de sauvegarde détecté');
          }
        }
      }
      
      toast.success('Assignation sauvegardée', { duration: 1000 });
    } catch (error) {
      console.error('❌ Erreur saveAssignment:', error);
      toast.error('Erreur de sauvegarde');
    }
  };

  /* ---------------------- Reset intelligent ---------------------- */
  const resetPlanning = async () => {
    try {
      setAiLoading(true);
      
      // Vider juste les assignations, garder les disponibles
      const newBoard = {};
      Object.keys(board).forEach(key => {
        if (key !== 'unassigned') {
          newBoard[key] = [];
        }
      });
      
      setBoard(newBoard);
      toast.success('Planning remis à zéro !');
      
    } catch (error) {
      console.error('Erreur reset:', error);
      toast.error('Erreur technique');
    } finally {
      setAiLoading(false);
    }
  };

  /* ---------------------- Génération IA (improved) ---------------------- */
  const generateAIPlanning = async () => {
    setAiLoading(true);
    try {
      toast.loading('🤖 IA en cours de génération du planning...', { id: 'ai-planning' });
      
      // Reset d'abord
      await resetPlanning();
      
      // Récupérer les données actuelles avec compétences
      const [employeesRes, postesRes, competencesRes] = await Promise.all([
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple()
      ]);
      
      const employees = employeesRes.data || [];
      const allPostes = postesRes.data || [];
      const competences = competencesRes.data || [];
      const conf = sessionsConfig[currentSession];
      const postesActifs = allPostes.filter(p => conf.postesActifs.includes(p.nom));
      
      // Construire map des compétences par employé
      const competencesMap = {};
      competences.forEach(comp => {
        if (!competencesMap[comp.employee_id]) {
          competencesMap[comp.employee_id] = [];
        }
        competencesMap[comp.employee_id].push(comp);
      });
      
      console.log('🤖 IA - Génération pour', employees.length, 'employés et', postesActifs.length, 'postes');
      
      // Règles métier spécifiques
      const POSTE_RULES = {
        'Vaisselle': { min: 3, max: 3, priority: 3 },
        'Self Midi': { min: 2, max: 2, priority: 4 },
        'Sandwichs': { min: 5, max: 6, priority: 5 }, // PRIORITÉ MAXIMALE
        'Pain': { min: 2, max: 3, priority: 2 },
        'Jus de fruits': { min: 1, max: 2, priority: 1 },
        'Cuisine chaude': { min: 1, max: 2, priority: 4, needsCompetence: true },
        'Légumerie': { min: 1, max: 2, priority: 2 },
        'Equipe Pina et Saskia': { min: 2, max: 3, priority: 3 }
      };
      
      // Algorithme IA optimisé avec priorités
      const newBoard = { ...board };
      let assignedEmployees = [];
      const assignments = [];
      
      // Trier les postes par priorité (Sandwiches en premier)
      const sortedPostes = postesActifs.sort((a, b) => {
        const priorityA = POSTE_RULES[a.nom]?.priority || 0;
        const priorityB = POSTE_RULES[b.nom]?.priority || 0;
        return priorityB - priorityA;
      });
      
      for (const poste of sortedPostes) {
        const creneauxForPoste = getCreneauxForPoste(poste.nom, currentSession);
        const rules = POSTE_RULES[poste.nom] || { min: 1, max: 2, priority: 1 };
        
        for (const creneau of creneauxForPoste) {
          const cellId = `${poste.id}-${creneau}`;
          if (!newBoard[cellId]) newBoard[cellId] = [];
          
          // Filtrer les employés disponibles
          let availableEmployees = employees.filter(ec => 
            !assignedEmployees.includes(ec.employee.id) && 
            ec.employee.statut === 'Actif'
          );
          
          // Si le poste nécessite des compétences spécifiques
          if (rules.needsCompetence) {
            availableEmployees = availableEmployees.filter(ec => {
              const empCompetences = competencesMap[ec.employee.id] || [];
              return empCompetences.some(comp => {
                const competencePoste = allPostes.find(p => p.id === comp.poste_id);
                return competencePoste && competencePoste.nom === poste.nom;
              });
            });
            
            console.log(`🎯 ${poste.nom} - ${availableEmployees.length} employés compétents trouvés`);
          }
          
          // Sélection intelligente selon le profil du poste
          const selectedEmployees = availableEmployees
            .sort((a, b) => {
              // Pour Cuisine chaude : privilégier les compétents ET expérimentés
              if (poste.nom === 'Cuisine chaude') {
                const profileOrder = { 'Fort': 3, 'Moyen': 2, 'Faible': 1 };
                return (profileOrder[b.profil] || 0) - (profileOrder[a.profil] || 0);
              }
              
              // Pour Sandwiches (priorité) : mélanger expérience et disponibilité
              if (poste.nom === 'Sandwichs') {
                const profileOrder = { 'Fort': 3, 'Moyen': 2, 'Faible': 1 };
                const scoreDiff = (profileOrder[b.profil] || 0) - (profileOrder[a.profil] || 0);
                if (Math.abs(scoreDiff) <= 1) {
                  // Si profils similaires, ordre alphabétique pour consistance
                  return a.employee.nom.localeCompare(b.employee.nom);
                }
                return scoreDiff;
              }
              
              // Pour Vaisselle : équipe mixte
              if (poste.nom === 'Vaisselle') {
                return Math.random() - 0.5; // Distribution aléatoire équitable
              }
              
              // Autres postes : privilégier l'expérience
              const profileOrder = { 'Fort': 3, 'Moyen': 2, 'Faible': 1 };
              return (profileOrder[b.profil] || 0) - (profileOrder[a.profil] || 0);
            })
            .slice(0, rules.min); // Assigner le minimum requis
          
          // Assigner les employés sélectionnés
          for (const empCuisine of selectedEmployees) {
            const newItem = {
              draggableId: `ai-${Date.now()}-${Math.random()}-${empCuisine.employee.id}`,
              planningId: null,
              employeeId: empCuisine.employee.id,
              employee: empCuisine.employee,
              photo_url: empCuisine.photo_url,
            };
            
            newBoard[cellId].push(newItem);
            assignedEmployees.push(empCuisine.employee.id);
            assignments.push({
              poste: poste.nom,
              creneau,
              employee: empCuisine.employee.nom,
              profil: empCuisine.profil
            });
            
            // Sauvegarder en base immédiatement
            await saveAssignment(newItem, cellId);
          }
          
          console.log(`✅ ${poste.nom} (${creneau}): ${selectedEmployees.length}/${rules.min} assignés`);
        }
      }
      
      setBoard(newBoard);
      
      // Résumé intelligent des assignations
      const summary = Object.entries(POSTE_RULES).map(([posteName, rules]) => {
        const assigned = assignments.filter(a => a.poste === posteName).length;
        const status = assigned >= rules.min ? '✅' : '⚠️';
        return `${status} ${posteName}: ${assigned}/${rules.min}`;
      }).join('\n');
      
      // Obtenir des recommandations IA via Azure OpenAI
      let aiRecommendations = '';
      try {
        const planningAnalysis = Object.entries(POSTE_RULES).reduce((acc, [posteName, rules]) => {
          const assigned = assignments.filter(a => a.poste === posteName);
          acc[posteName] = {
            assigned: assigned.length,
            required: rules.min,
            employees: assigned.map(a => a.employee),
            status: assigned.length >= rules.min ? 'OK' : 'SOUS_EFFECTIF'
          };
          return acc;
        }, {});
        
        const recommendations = await getAIRecommendations(planningAnalysis);
        aiRecommendations = recommendations ? `\n\n🤖 Recommandations IA:\n${recommendations}` : '';
      } catch (error) {
        console.log('Recommandations IA non disponibles:', error);
      }
      
      toast.success(`🎯 Planning IA généré avec succès !\n\n${summary}\n\nTotal: ${assignedEmployees.length} employés assignés${aiRecommendations}`, { 
        id: 'ai-planning',
        duration: 8000 
      });
      
    } catch (error) {
      console.error('Erreur IA planning:', error);
      toast.error('❌ Erreur lors de la génération IA', { id: 'ai-planning' });
    } finally {
      setAiLoading(false);
    }
  };

  /* ---------------------- Optimisation IA du planning existant ---------------------- */
  const optimizeExistingPlanning = async () => {
    setAiLoading(true);
    try {
      toast.loading('🔧 IA en cours d\'optimisation du planning...', { id: 'ai-optimize' });
      
      // Récupérer les employés disponibles
      const employeesRes = await supabaseCuisine.getEmployeesCuisine();
      const allEmployees = employeesRes.data || [];
      
      // Analyser les assignations actuelles
      const currentAssignments = {};
      Object.keys(board).forEach(cellId => {
        if (cellId !== 'unassigned' && board[cellId].length > 0) {
          const [posteIdStr, creneau] = [cellId.substring(0, cellId.indexOf('-')), cellId.substring(cellId.indexOf('-') + 1)];
          const poste = postes.find(p => p.id === parseInt(posteIdStr));
          if (poste) {
            if (!currentAssignments[poste.nom]) currentAssignments[poste.nom] = {};
            if (!currentAssignments[poste.nom][creneau]) currentAssignments[poste.nom][creneau] = [];
            currentAssignments[poste.nom][creneau] = board[cellId];
          }
        }
      });
      
      // Règles métier pour l'optimisation
      const POSTE_RULES = {
        'Vaisselle': { min: 3, max: 3, priority: 3 },
        'Self Midi': { min: 2, max: 2, priority: 4 },
        'Sandwichs': { min: 5, max: 6, priority: 5 },
        'Pain': { min: 2, max: 3, priority: 2 },
        'Jus de fruits': { min: 1, max: 2, priority: 1 },
        'Cuisine chaude': { min: 1, max: 2, priority: 4, needsCompetence: true },
        'Légumerie': { min: 1, max: 2, priority: 2 },
        'Equipe Pina et Saskia': { min: 2, max: 3, priority: 3 }
      };
      
      const optimizations = [];
      const newBoard = { ...board };
      
      // Analyser chaque poste et optimiser
      for (const [posteName, rules] of Object.entries(POSTE_RULES)) {
        const posteAssignments = currentAssignments[posteName] || {};
        
        for (const [creneau, assignments] of Object.entries(posteAssignments)) {
          const currentCount = assignments.length;
          
          if (currentCount < rules.min) {
            // Sous-effectif : ajouter des employés
            const needed = rules.min - currentCount;
            optimizations.push(`➕ ${posteName} (${creneau}): +${needed} employé(s) requis`);
            
            // Trouver des employés disponibles pour ce créneau
            const assignedInSlot = Object.values(board).flat()
              .filter(item => item.planningId) // Seulement les assignés
              .map(item => item.employeeId);
            
            const availableForAdd = allEmployees.filter(ec => 
              !assignedInSlot.includes(ec.employee.id) && 
              ec.employee.statut === 'Actif'
            );
            
            // Ajouter les employés manquants (logique simplifiée pour l'optimisation)
            const toAdd = availableForAdd.slice(0, needed);
            const poste = postes.find(p => p.nom === posteName);
            const cellId = `${poste.id}-${creneau}`;
            
            for (const empCuisine of toAdd) {
              const newItem = {
                draggableId: `opt-${Date.now()}-${Math.random()}-${empCuisine.employee.id}`,
                planningId: null,
                employeeId: empCuisine.employee.id,
                employee: empCuisine.employee,
                photo_url: empCuisine.photo_url,
              };
              
              newBoard[cellId].push(newItem);
              await saveAssignment(newItem, cellId);
            }
            
          } else if (currentCount > rules.max) {
            // Sur-effectif : suggérer une redistribution
            const excess = currentCount - rules.max;
            optimizations.push(`⚠️ ${posteName} (${creneau}): ${excess} employé(s) en trop à redistribuer`);
          } else {
            // Effectif correct
            optimizations.push(`✅ ${posteName} (${creneau}): effectif optimal (${currentCount})`);
          }
        }
      }
      
      setBoard(newBoard);
      
      toast.success(`🔧 Optimisation terminée !\n\n${optimizations.slice(0, 5).join('\n')}\n${optimizations.length > 5 ? `\n+${optimizations.length - 5} autres optimisations...` : ''}`, {
        id: 'ai-optimize',
        duration: 6000
      });
      
    } catch (error) {
      console.error('Erreur optimisation IA:', error);
      toast.error('❌ Erreur lors de l\'optimisation', { id: 'ai-optimize' });
    } finally {
      setAiLoading(false);
    }
  };

  /* ---------------------- Menu IA avec options ---------------------- */
  const [showAIMenu, setShowAIMenu] = useState(false);

  const handleAIAction = (action) => {
    setShowAIMenu(false);
    if (action === 'new') {
      generateAIPlanning();
    } else if (action === 'optimize') {
      optimizeExistingPlanning();
    }
  };

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAIMenu && !event.target.closest('.ai-menu-container')) {
        setShowAIMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAIMenu]);

  /* ---------------------- Intégration Azure OpenAI ---------------------- */
  const getAIRecommendations = async (planningData) => {
    try {
      // Utiliser l'infrastructure Azure OpenAI existante pour des recommandations
      const aiService = await import('../lib/aiService');
      
      const prompt = `Analyse ce planning cuisine et donne des recommandations d'optimisation :
      
      Date: ${format(selectedDate, 'dd/MM/yyyy')}
      Session: ${currentSession}
      
      Assignations actuelles: ${JSON.stringify(planningData, null, 2)}
      
      Règles métier:
      - Sandwiches: priorité absolue, min 5 personnes
      - Vaisselle: exactement 3 personnes
      - Self Midi: exactement 2 personnes  
      - Pain: min 2 personnes
      - Jus de fruits: min 1 personne
      - Cuisine chaude: personnel compétent uniquement
      
      Donne 3 recommandations concrètes pour optimiser ce planning.`;
      
      const response = await aiService.aiService.requestAIAnalysis(prompt);
      return response;
      
    } catch (error) {
      console.error('Erreur recommandations IA:', error);
      return 'Recommandations IA temporairement indisponibles.';
    }
  };

  /* ---------------------- Navigation Mode TV ---------------------- */
  const openTVMode = () => {
    // Passer la date et session actuelles au mode TV
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const tvUrl = `/cuisine/tv?date=${dateStr}&session=${currentSession}`;
    console.log('📺 Ouverture Mode TV avec:', { date: dateStr, session: currentSession });
    window.open(tvUrl, '_blank', 'fullscreen=yes,scrollbars=no,menubar=no,toolbar=no,location=no,status=no');
    toast.success('📺 Mode TV ouvert avec la date et session actuelles');
  };

  /* ---------------------- Rendu des employés ULTRA SIMPLIFIÉ ---------------------- */
  const renderEmployeeCard = (item, index, isAvailable = false) => (
    <Draggable draggableId={item.draggableId} index={index} key={item.draggableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`w-16 h-20 rounded-lg overflow-hidden bg-white border-2 cursor-pointer transition-all ${
            snapshot.isDragging 
              ? 'border-orange-400 shadow-lg transform scale-105' 
              : 'border-orange-200 hover:border-orange-300'
          }`}
        >
          {item.photo_url ? (
            <img 
              src={item.photo_url} 
              alt={item.employee.nom} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {item.employee.nom?.[0]}{item.employee.nom?.[1] || ''}
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-orange-100">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-orange-200 border-t-orange-500 mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Chargement du planning cuisine</h3>
          <p className="text-gray-600">Préparation de l'interface...</p>
        </div>
      </div>
    );
  }

  const conf = sessionsConfig[currentSession];
  const postesActifs = postes.filter(p => conf.postesActifs.includes(p.nom));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
      {/* Header Harmonisé */}
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Section Date et Sessions */}
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="border border-orange-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white shadow-sm"
            />
            
            {Object.keys(sessionsConfig).map((key) => {
              const Icon = sessionsConfig[key].icon;
              return (
                <button
                  key={key}
                  onClick={() => handleSessionChange(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    currentSession === key 
                      ? 'bg-orange-500 text-white shadow-md' 
                      : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{sessionsConfig[key].label}</span>
                </button>
              );
            })}
          </div>

          {/* Section Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveAllPlanning}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-600 disabled:opacity-50 shadow-md transition-all"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Sauvegarde...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Sauvegarder</span>
                </>
              )}
            </button>
            
            {/* Menu IA Harmonisé */}
            <div className="relative ai-menu-container">
              <button
                onClick={() => setShowAIMenu(!showAIMenu)}
                disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white font-medium text-sm hover:bg-purple-600 disabled:opacity-50 shadow-md transition-all"
              >
                <SparklesIcon className="w-4 h-4" />
                <span>{aiLoading ? 'IA en cours...' : 'IA Auto'}</span>
              </button>
              
              {showAIMenu && (
                <div className="absolute top-full mt-2 left-0 bg-white border border-orange-100 rounded-lg shadow-lg z-50 min-w-[200px]">
                  <button
                    onClick={() => handleAIAction('new')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 border-b border-orange-100 transition-colors"
                  >
                    ✨ Nouveau Planning
                  </button>
                  <button
                    onClick={() => handleAIAction('optimize')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                  >
                    ⚡ Optimiser Existant
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={openTVMode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white font-medium text-sm hover:bg-blue-600 shadow-md transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Mode TV</span>
            </button>

          </div>
        </div>
        
        {/* Indicateur de sauvegarde harmonisé */}
        {lastSaved && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg text-emerald-700 text-sm border border-emerald-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Dernière sauvegarde : {format(lastSaved, 'HH:mm:ss')}</span>
            </div>
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {/* Section Employés Disponibles Harmonisée */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-orange-100">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-white">
                👥 Équipe Disponible ({availableEmployees.length} personnes)
              </h2>
            </div>
            <div className="p-6">
              <Droppable droppableId="unassigned" key="unassigned">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`grid grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-16 2xl:grid-cols-20 gap-4 min-h-[140px] p-4 rounded-lg transition-all ${
                      snapshot.isDraggingOver 
                          ? 'bg-orange-100 border-2 border-orange-300' 
                          : 'bg-orange-50 border border-orange-200'
                    }`}
                  >
                    {availableEmployees.map((item, idx) => renderEmployeeCard(item, idx, true))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>

        {/* Section Services Harmonisée */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {postesActifs.map((poste) => {
              const creneauxForPoste = getCreneauxForPoste(poste.nom, currentSession);
              
              return (
                <div
                  key={poste.id}
                  className="flex-shrink-0 w-80 bg-white rounded-xl shadow-sm border border-orange-100"
                >
                  {/* Header du poste harmonisé */}
                  <div 
                    className="p-4 text-white rounded-t-xl"
                    style={{ backgroundColor: poste.couleur }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span className="text-xl">{poste.icone}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{poste.nom}</h3>
                        <p className="text-white text-opacity-80 text-sm">Service actif</p>
                      </div>
                    </div>
                  </div>

                  {/* Créneaux harmonisés */}
                  <div className="p-4 space-y-3">
                    {creneauxForPoste.map((cr) => {
                      const cellId = `${poste.id}-${cr}`;
                      const assignedCount = (board[cellId] || []).length;
                      
                      return (
                        <div key={cellId} className="bg-orange-50 rounded-lg border border-orange-100">
                          <div className="flex items-center justify-between p-3 bg-white rounded-t-lg border-b border-orange-100">
                            <span className="font-medium text-gray-800 text-sm">{cr}</span>
                            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {assignedCount}
                            </div>
                          </div>
                          <div className="p-3">
                            <Droppable droppableId={cellId} key={cellId}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`min-h-[140px] p-3 rounded-lg transition-all ${
                                    snapshot.isDraggingOver 
                                      ? 'bg-green-100 border-2 border-green-300' 
                                      : 'bg-white border border-orange-200'
                                  }`}
                                >
                                  <div className="grid grid-cols-3 gap-3">
                                    {(board[cellId] || []).map((item, idx) => renderEmployeeCard(item, idx))}
                                  </div>
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>
      
      {/* Assistant IA disponible dans le planning */}
      <CuisineAIAssistant onDataRefresh={loadData} />
    </div>
  );
};

export default CuisinePlanningInteractive; 