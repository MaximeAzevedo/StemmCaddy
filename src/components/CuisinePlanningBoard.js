import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const MAX_PER_CELL = 10;

const CuisinePlanningBoard = () => {
  // ---------------- ÉTATS PRINCIPAUX ----------------
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [postes, setPostes] = useState([]);
  const [creneaux, setCreneaux] = useState([]);
  const [board, setBoard] = useState({}); // { colId: [items] }
  const [loading, setLoading] = useState(true);

  // ---------------- UTILITAIRES ----------------
  const buildInitialBoard = useCallback((pPostes, pCreneaux, pEmployees, planningRows) => {
    const newBoard = { unassigned: [] };

    // Initialiser chaque cellule poste+créneau
    pPostes.forEach((poste) => {
      pCreneaux.forEach((cren) => {
        newBoard[`${poste.id}-${cren.nom}`] = [];
      });
    });

    // Remplir avec le planning existant
    planningRows.forEach((row) => {
      const cellId = `${row.poste_id}-${row.creneau}`;
      const empCuisine = pEmployees.find((ec) => ec.employee_id === row.employee_id);
      if (!empCuisine) return;
      newBoard[cellId].push({
        draggableId: `plan-${row.id}`,
        planningId: row.id,
        employeeId: row.employee_id,
        employee: empCuisine.employee,
        photo_url: empCuisine.photo_url,
      });
    });

    // Employés non planifiés
    pEmployees.forEach((ec) => {
      const isAssigned = planningRows.some((pr) => pr.employee_id === ec.employee_id);
      if (!isAssigned) {
        newBoard.unassigned.push({
          draggableId: `emp-${ec.employee.id}`,
          planningId: null,
          employeeId: ec.employee.id,
          employee: ec.employee,
          photo_url: ec.photo_url,
        });
      }
    });

    return newBoard;
  }, []);

  // ---------------- CHARGEMENT ----------------
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
      setCreneaux(creneauxRes.data || []);

      const initialBoard = buildInitialBoard(
        postesRes.data || [],
        creneauxRes.data || [],
        employeesRes.data || [],
        planningRes.data || []
      );
      setBoard(initialBoard);
    } catch (err) {
      console.error('Erreur chargement planning cuisine:', err);
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, buildInitialBoard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------- GESTION DRAG & DROP ----------------
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcCol = source.droppableId;
    const destCol = destination.droppableId;
    if (srcCol === destCol && source.index === destination.index) return;

    // Copie pour manipulation
    const newBoard = { ...board };
    const sourceItems = Array.from(newBoard[srcCol]);
    const [moved] = sourceItems.splice(source.index, 1);
    const destItems = Array.from(newBoard[destCol]);

    // Vérifier la limite
    if (destCol !== 'unassigned' && destItems.length >= MAX_PER_CELL) {
      toast.error('Limite de 10 employés atteinte pour cette case');
      return;
    }

    destItems.splice(destination.index, 0, moved);
    newBoard[srcCol] = sourceItems;
    newBoard[destCol] = destItems;
    setBoard(newBoard);

    // Mise à jour Supabase
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      if (destCol === 'unassigned') {
        if (moved.planningId) {
          const { error } = await supabaseCuisine.deletePlanningCuisine(moved.planningId);
          if (error) throw error;
          moved.planningId = null;
        }
      } else {
        const [posteIdStr, crenNom] = destCol.split('-');
        const posteId = parseInt(posteIdStr, 10);

        if (moved.planningId) {
          const { error } = await supabaseCuisine.updatePlanningCuisine(moved.planningId, {
            poste_id: posteId,
            creneau: crenNom,
          });
          if (error) throw error;
        } else {
          const { data, error } = await supabaseCuisine.createPlanningCuisine({
            date: dateStr,
            poste_id: posteId,
            creneau: crenNom,
            employee_id: moved.employeeId,
          });
          if (error) throw error;
          moved.planningId = data.id;
          // Màj draggableId pour éviter doublons
          moved.draggableId = `plan-${data.id}`;
        }
      }
      toast.success('Planning mis à jour');
    } catch (err) {
      console.error('Erreur mise à jour planning:', err);
      toast.error('Erreur lors de la mise à jour');
      // Rechargement pour rester cohérent
      loadData();
    }
  };

  // ---------------- RENDU DÉRIVE ----------------
  const renderEmployeeItem = (item, index) => (
    <Draggable draggableId={item.draggableId} index={index} key={item.draggableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-2 mb-1 rounded-lg text-sm bg-white border border-gray-200 shadow-sm flex items-center space-x-2 transition-transform ${
            snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700">
            {item.employee.prenom?.[0]}
            {item.employee.nom?.[0]}
          </div>
          <span className="truncate">{item.employee.prenom} {item.employee.nom}</span>
        </div>
      )}
    </Draggable>
  );

  const renderDroppableColumn = (colId, items, isCell = false) => (
    <Droppable droppableId={colId} key={colId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`${isCell ? 'min-h-[80px]' : 'min-h-[300px]'} p-2 rounded-lg border-2 ${
            snapshot.isDraggingOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {items.map((item, idx) => renderEmployeeItem(item, idx))}
          {provided.placeholder}
          {items.length === 0 && isCell && (
            <div className="text-center text-gray-400 text-xs py-2">Vide</div>
          )}
        </div>
      )}
    </Droppable>
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sélecteur de date */}
      <div className="flex items-center space-x-2">
        <CalendarIcon className="w-5 h-5 text-gray-600" />
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="border rounded-lg px-3 py-1 text-sm"
        />
        <button
          onClick={loadData}
          className="ml-2 px-3 py-1 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700"
        >
          Recharger
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-4 overflow-x-auto">
          {/* Colonne employés libres */}
          <div className="w-64 shrink-0">
            <h3 className="text-sm font-semibold mb-2">Employés non affectés</h3>
            {renderDroppableColumn('unassigned', board.unassigned || [])}
          </div>

          {/* Grille planning */}
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-max w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-48 text-left p-2 border-b"></th>
                  {creneaux.map((c) => (
                    <th key={c.id} className="text-center p-2 border-b text-sm font-medium">
                      {c.nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {postes.map((poste) => (
                  <tr key={poste.id}>
                    <td className="p-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: poste.couleur }}></span>
                        <span>{poste.nom}</span>
                      </div>
                    </td>
                    {creneaux.map((c) => {
                      const cellId = `${poste.id}-${c.nom}`;
                      return (
                        <td key={cellId} className="p-1 align-top">
                          {renderDroppableColumn(cellId, board[cellId] || [], true)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default CuisinePlanningBoard; 