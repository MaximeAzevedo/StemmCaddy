import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../lib/supabase-cuisine';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

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

  /* ---------------------- Rendus utilitaires ---------------------- */
  const renderEmployeeCircle = (item, index) => (
    <Draggable draggableId={item.draggableId} index={index} key={item.draggableId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-md flex items-center justify-center text-sm font-bold text-gray-700 cursor-pointer select-none ${
            snapshot.isDragging ? 'scale-110 shadow-lg' : ''
          }`}
        >
          {item.photo_url ? (
            <img src={item.photo_url} alt={item.employee.nom} className="w-full h-full object-cover" />
          ) : (
            <span>
              {item.employee.prenom?.[0]}
              {item.employee.nom?.[0]}
            </span>
          )}
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
          } min-h-[56px] p-1 ${snapshot.isDraggingOver ? 'bg-orange-50' : ''}`}
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
      <div className="flex items-center space-x-4">
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
        <button
          onClick={loadData}
          className="ml-auto px-3 py-1 text-sm rounded-lg bg-orange-600 text-white hover:bg-orange-700"
        >
          Recharger
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-4 overflow-x-auto">
          {/* Colonne Disponible */}
          <div className="w-48 shrink-0">
            <h3 className="text-xs font-semibold mb-2 text-center">Disponibles</h3>
            {renderDroppable('unassigned', board['unassigned'] || [], false, true)}
          </div>

          {/* Grille cartes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {postesToDisplay.map((poste) => (
              <div
                key={poste.id}
                className="relative bg-white rounded-xl shadow-lg p-4 border-2 flex flex-col"
                style={{ borderColor: poste.couleur }}
              >
                {/* Header poste */}
                <div className="flex items-center justify-center mb-2">
                  <div
                    className="flex items-center space-x-2 px-3 py-1 rounded-full text-white font-bold text-sm"
                    style={{ backgroundColor: poste.couleur }}
                  >
                    <span>{poste.icone}</span>
                    <span>{poste.nom}</span>
                  </div>
                </div>

                {/* Sessions */}
                {conf.creneaux.map((cr) => {
                  const cellId = `${poste.id}-${cr}`;
                  return (
                    <div key={cellId} className="mb-3">
                      <div className="text-center text-xs font-medium mb-1 text-gray-600">{cr}</div>
                      {renderDroppable(cellId, board[cellId] || [], true)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default CuisinePlanningInteractive; 