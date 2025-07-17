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
        // CORRECTION: Parser correctement les cellId avec créneaux contenant des tirets
        const firstDashIndex = destCol.indexOf('-');
        const posteIdStr = destCol.substring(0, firstDashIndex);
        const crenNom = destCol.substring(firstDashIndex + 1);
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

  // ---------------- RENDU DÉRIVE PREMIUM ----------------
  const renderEmployeeItem = (item, index) => (
    <Draggable draggableId={item.draggableId} index={index} key={item.draggableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 mb-2 rounded-xl text-sm bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg flex items-center space-x-3 transition-all duration-300 ${
            snapshot.isDragging 
              ? 'rotate-2 shadow-2xl bg-gradient-to-r from-blue-50 to-purple-50 scale-105' 
              : 'hover:shadow-xl hover:-translate-y-0.5'
          }`}
        >
          {/* Photo Premium avec bordure dégradée */}
          <div className="w-8 h-8 rounded-full relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                {item.photo_url ? (
                  <img 
                    src={item.photo_url} 
                    alt={`${item.employee.prenom} ${item.employee.nom}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {item.employee.prenom?.[0]}{item.employee.nom?.[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="truncate font-medium text-gray-800">{item.employee.prenom} {item.employee.nom}</span>
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
          className={`${isCell ? 'min-h-[100px]' : 'min-h-[350px]'} p-3 rounded-2xl border-2 transition-all duration-300 ${
            snapshot.isDraggingOver 
              ? 'border-gradient-to-r from-blue-400 to-purple-500 bg-gradient-to-br from-blue-50/80 to-purple-50/80 backdrop-blur-sm' 
              : 'border-white/30 bg-white/40 backdrop-blur-sm'
          } shadow-lg`}
        >
          {items.map((item, idx) => renderEmployeeItem(item, idx))}
          {provided.placeholder}
          {items.length === 0 && isCell && (
            <div className="text-center text-gray-500 text-xs py-4 italic">Vide</div>
          )}
        </div>
      )}
    </Droppable>
  );

  if (loading) {
    return (
      <div className="min-h-[400px] bg-gradient-to-br from-slate-50 via-blue-50 to-violet-100 flex items-center justify-center rounded-3xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4 shadow-lg"></div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Chargement du Planning</h2>
          <p className="text-gray-500">Préparation de l'interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-100 p-6 space-y-8">
      {/* Header Premium avec glassmorphism */}
      <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-red-500 bg-clip-text text-transparent">
                Planning Cuisine Interactive
              </h1>
              <p className="text-gray-600 font-medium">Glisser-déposer pour organiser les équipes</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-white/30">
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="bg-transparent border-none outline-none text-gray-700 font-medium"
              />
            </div>
            <button
              onClick={loadData}
              className="bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl px-6 py-3 font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              🔄 Recharger
            </button>
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-6 overflow-x-auto">
          {/* Colonne employés libres Premium */}
          <div className="w-80 shrink-0">
            <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl p-6">
              <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent flex items-center">
                <span className="mr-2">👥</span>
                Employés non affectés
                <span className="ml-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full font-medium">
                  {(board.unassigned || []).length}
                </span>
              </h3>
              {renderDroppableColumn('unassigned', board.unassigned || [])}
            </div>
          </div>

          {/* Grille planning Premium */}
          <div className="flex-1 overflow-x-auto">
            <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-xl rounded-3xl p-6">
              <table className="min-w-max w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-64 text-left p-4 border-b-2 border-white/30"></th>
                    {creneaux.map((c) => (
                      <th key={c.id} className="text-center p-4 border-b-2 border-white/30">
                        <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-2xl font-bold shadow-sm">
                          {c.nom}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {postes.map((poste) => (
                    <tr key={poste.id} className="hover:bg-white/30 transition-colors duration-200">
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="h-4 w-4 rounded-full shadow-sm border-2 border-white"
                            style={{ backgroundColor: poste.couleur }}
                          ></div>
                          <span className="font-bold text-gray-800 text-lg">{poste.nom}</span>
                        </div>
                      </td>
                      {creneaux.map((c) => {
                        const cellId = `${poste.id}-${c.nom}`;
                        const cellItems = board[cellId] || [];
                        return (
                          <td key={cellId} className="p-2 align-top">
                            <div className="relative">
                              {cellItems.length > 0 && (
                                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg z-10">
                                  {cellItems.length}
                                </div>
                              )}
                              {renderDroppableColumn(cellId, cellItems, true)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default CuisinePlanningBoard; 