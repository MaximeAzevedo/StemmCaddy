import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getSessionConfig, getCreneauxForPoste } from '../config';

const MAX_PER_CELL = 10;

/**
 * Hook pour la gestion du board de planning (drag & drop)
 * Version partagée : données métier de la DB, planning en base partagée
 */
export const usePlanningBoard = (selectedDate, currentSession, onBoardChange, externalBoard = {}) => {
  // ✅ CORRECTION : Supprimer le state board interne qui causait le conflit
  // const [board, setBoard] = useState({});
  
  // ✅ UTILISER le board externe au lieu du state interne
  const board = externalBoard;
  
  const [availableEmployees, setAvailableEmployees] = useState([]);

  /**
   * Construction intelligente du board avec créneaux par poste
   */
  const buildSmartBoard = useCallback(async (allPostes, allCreneaux, empList, absences) => {
    const conf = getSessionConfig(currentSession);
    const boardObj = { unassigned: [] };

    // 🔧 CORRECTION : Structure employés directe
    // Filtrer les employés présents (pas absents)
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const absentEmployeeIds = absences
      .filter(abs => {
        const absenceStart = abs.date_debut;
        const absenceEnd = abs.date_fin;
        return dateStr >= absenceStart && dateStr <= absenceEnd;
      })
      .map(abs => abs.employee_id);
    
    // 🔧 CORRECTION : Utiliser la structure directe ec.id au lieu de ec.employee.id
    const presentEmployees = empList.filter(ec => 
      !absentEmployeeIds.includes(ec.id) && ec.actif !== false
    );
    
    console.log('👥 Employés présents pour le planning:', {
      total: empList.length,
      presents: presentEmployees.length,
      absents: absentEmployeeIds.length
    });
    
    // Tous les postes existent maintenant en base de données
    const postesActifs = allPostes.filter(p => conf.postesActifs.includes(p.nom));
    
    // ✅ CRÉER LES CELLULES avec créneaux spécifiques par poste
    postesActifs.forEach(poste => {
      const creneauxForPoste = getCreneauxForPoste(poste.nom);
      creneauxForPoste.forEach(creneau => {
        boardObj[`${poste.nom}-${creneau}`] = [];
      });
    });

    // 🔧 CORRECTION : Structure employee adaptée à la réalité
    const availableItems = presentEmployees.map(ec => ({
      draggableId: `emp-${ec.id}`,
      planningId: null,
      employeeId: ec.id,
      // Structure adaptée : créer un objet employee compatible
      employee: {
        id: ec.id,
        nom: ec.prenom,
        profil: ec.langue_parlee || 'Standard',
        statut: ec.actif ? 'Actif' : 'Inactif'
      },
      photo_url: ec.photo_url,
      nom: ec.prenom,
      prenom: ec.prenom
    }));

    console.log('✅ Board construit avec créneaux par poste:', {
      postesActifs: postesActifs.length,
      cellules: Object.keys(boardObj).length - 1, // -1 pour unassigned
      employésDisponibles: availableItems.length
    });

    setAvailableEmployees(availableItems);
    
    return boardObj;
  }, [selectedDate, currentSession]);

  /**
   * Gestion du drag & drop avec sauvegarde en base partagée
   */
  const onDragEnd = useCallback(async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const src = source.droppableId;
    const dest = destination.droppableId;
    
    // Si on déplace depuis "unassigned", on CLONE (la personne reste disponible)
    if (src === 'unassigned') {
      const draggedItem = availableEmployees[source.index];
      
      // ✅ CORRECTION : Copie profonde pour éviter les mutations
      const newBoard = {};
      Object.keys(board).forEach(key => {
        newBoard[key] = [...(board[key] || [])]; // Copie profonde des tableaux
      });
      
      // ✅ CORRECTION : Préserver le contenu existant au lieu de l'écraser
      if (!newBoard[dest]) {
        newBoard[dest] = [];
      }
      
      if (newBoard[dest].length >= MAX_PER_CELL) {
        toast.error('Maximum 10 employés par créneau');
        return;
      }

      // Créer un nouvel item cloné (ASSIGNATIONS MULTIPLES AUTORISÉES)
      const clonedItem = {
        ...draggedItem,
        draggableId: `shared-${Date.now()}-${draggedItem.employeeId}`,
        planningId: null, // Sera généré par la DB
        isLocal: false
      };
      
      console.log(`✅ Assignation partagée: ${draggedItem.employee.nom} → ${dest}`);
      console.log(`📊 Avant ajout: ${newBoard[dest].length} employés dans ${dest}`);
      
      // ✅ AJOUT au lieu d'écrasement
      newBoard[dest].push(clonedItem);
      
      console.log(`📊 Après ajout: ${newBoard[dest].length} employés dans ${dest}`);
      console.log(`🗂️ Contenu complet de ${dest}:`, newBoard[dest].map(emp => emp.prenom || emp.nom));
      
      // ✅ CORRECTION : Utiliser onBoardChange au lieu de setBoard pour synchroniser
      if (onBoardChange) {
        onBoardChange(newBoard);
      }
    }
    // Si on déplace entre cellules assignées
    else if (src !== 'unassigned' && dest !== 'unassigned') {
      // ✅ CORRECTION : Copie profonde pour cohérence
      const newBoard = {};
      Object.keys(board).forEach(key => {
        newBoard[key] = [...(board[key] || [])]; // Copie profonde des tableaux
      });
      
      const [draggedItem] = newBoard[src].splice(source.index, 1);
      
      if (!newBoard[dest]) newBoard[dest] = [];
      if (newBoard[dest].length >= MAX_PER_CELL) {
        toast.error('Maximum 10 employés par créneau');
        // Remettre l'item à sa place
        newBoard[src].splice(source.index, 0, draggedItem);
        return;
      }

      newBoard[dest].splice(destination.index, 0, draggedItem);
      
      console.log(`🔄 Déplacement: ${draggedItem.employee.nom} ${src} → ${dest}`);
      
      if (onBoardChange) {
        onBoardChange(newBoard);
      }
    }
    // Si on retire depuis une cellule assignée vers unassigned (suppression)
    else if (src !== 'unassigned' && dest === 'unassigned') {
      // ✅ CORRECTION : Copie profonde pour cohérence
      const newBoard = {};
      Object.keys(board).forEach(key => {
        newBoard[key] = [...(board[key] || [])]; // Copie profonde des tableaux
      });
      
      const [draggedItem] = newBoard[src].splice(source.index, 1);
      
      console.log(`🗑️ Suppression: ${draggedItem.employee.nom} retiré de ${src}`);
      
      if (onBoardChange) {
        onBoardChange(newBoard);
      }
    }
  }, [board, availableEmployees, onBoardChange]);

  /**
   * Reset du board (sans supprimer les employés disponibles)
   */
  const resetBoard = useCallback(() => {
    // Garder les employés disponibles, vider seulement les assignations
    const emptyBoard = {}; // ✅ CORRECTION : Renommer pour éviter conflit avec fonction
    // Recréer les cellules vides
    const conf = getSessionConfig(currentSession);
    const postesActifs = conf.postesActifs || [];
    
    postesActifs.forEach(posteNom => {
      const creneauxForPoste = getCreneauxForPoste(posteNom);
      creneauxForPoste.forEach(creneau => {
        emptyBoard[`${posteNom}-${creneau}`] = [];
      });
    });
    
    console.log('🔄 Board reseté, employés disponibles conservés');
    
    // ✅ CORRECTION : Utiliser onBoardChange pour synchroniser
    if (onBoardChange) {
      onBoardChange(emptyBoard);
    }
  }, [currentSession, onBoardChange]); // ✅ CORRECTION : Ajouter onBoardChange dans les dépendances

  /**
   * Recharger les employés disponibles
   */
  const reloadAvailableEmployees = useCallback(async (empList, absences) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const absentEmployeeIds = absences
      .filter(abs => {
        const absenceStart = abs.date_debut;
        const absenceEnd = abs.date_fin;
        return dateStr >= absenceStart && dateStr <= absenceEnd;
      })
      .map(abs => abs.employee_id);
    
    const presentEmployees = empList.filter(ec => 
      !absentEmployeeIds.includes(ec.id) && ec.actif !== false
    );
    
    const availableItems = presentEmployees.map(ec => ({
      draggableId: `emp-${ec.id}`,
      planningId: null,
      employeeId: ec.id,
      employee: {
        id: ec.id,
        nom: ec.prenom,
        profil: ec.langue_parlee || 'Standard',
        statut: ec.actif ? 'Actif' : 'Inactif'
      },
      photo_url: ec.photo_url,
      nom: ec.prenom,
      prenom: ec.prenom
    }));

    setAvailableEmployees(availableItems);
    console.log('👥 Employés disponibles rechargés:', availableItems.length);
  }, [selectedDate]);

  /**
   * Fusion board IA
   */
  const mergeAIBoard = useCallback((aiBoard) => {
    console.log('🤖 Fusion planning IA avec board existant');
    const mergedBoard = { ...board, ...aiBoard };
    
    if (onBoardChange) {
      onBoardChange(mergedBoard);
    }
  }, [board, onBoardChange]);

  /**
   * Mise à jour board
   */
  const updateBoard = useCallback((newBoard) => {
    if (onBoardChange) {
      onBoardChange(newBoard);
    }
  }, [onBoardChange]); // ✅ CORRECTION : Ajouter onBoardChange dans les dépendances

  return {
    board,
    availableEmployees,
    buildSmartBoard,
    onDragEnd,
    resetBoard,
    reloadAvailableEmployees,
    mergeAIBoard,
    updateBoard
  };
}; 