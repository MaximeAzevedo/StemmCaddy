import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, 
  Edit3,
  X,
  User,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmployeeCard from './EmployeeCard';
import EmployeeModal from './EmployeeModal';
import useEmployeeManagement from '../hooks/useEmployeeManagement';

const CuisineManagement = ({ user, onLogout, onReturnToDashboard }) => {
  const navigate = useNavigate();
  
  // Utilisation du hook pour toute la logique de gestion des employés
  const {
    employees,
    postes,
    competences,
    loading,
    searchTerm,
    setSearchTerm,
    selectedEmployee,
    editMode,
    editedEmployee,
    setEditedEmployee,
    saving,
    deleting,
    createMode,
    newEmployee,
    setNewEmployee,
    creating,
    filteredEmployees,
    jours,
    getEmployeeCompetences,
    openEditEmployee,
    closeEdit,
    openCreateEmployee,
    closeCreate,
    saveEmployee,
    updateCompetence,
    handleCreateEmployee,
    handleDeleteEmployee,
    updateEmployeeData
  } = useEmployeeManagement();

  // ==================== HANDLERS POUR LES COMPOSANTS ====================
  
  /**
   * Mettre à jour un champ des langues
   */
  const updateLanguages = (languages) => {
    setEditedEmployee({
      ...editedEmployee, 
      langues: languages
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-blue-200 max-w-md w-full">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-8"></div>
          <h3 className="text-2xl font-bold text-blue-800 mb-4">Chargement</h3>
          <p className="text-blue-600">Préparation des données cuisine...</p>
          </div>
            </div>
    );
  }

  // Si on est en mode édition ou création, afficher seulement la page complète
  if (editMode || createMode) {
    return (
      <AnimatePresence mode="wait">
        {(editMode && selectedEmployee) && (
          <EmployeeModal
            key="edit"
            isOpen={true}
            isCreateMode={false}
            employee={editedEmployee}
            setEmployee={setEditedEmployee}
            onSave={saveEmployee}
            onClose={closeEdit}
            onDelete={handleDeleteEmployee}
            updateEmployeeData={updateEmployeeData}
            updateCompetence={updateCompetence}
            postes={postes}
            competences={competences}
            jours={jours}
            saving={saving}
            deleting={deleting}
            creating={creating}
            onReturnToDashboard={onReturnToDashboard}
          />
        )}
        
        {(createMode && newEmployee) && (
          <EmployeeModal
            key="create"
            isOpen={true}
            isCreateMode={true}
            employee={newEmployee}
            setEmployee={setNewEmployee}
            onSave={handleCreateEmployee}
            onClose={closeCreate}
            updateEmployeeData={updateEmployeeData}
            updateCompetence={updateCompetence}
            postes={postes}
            competences={competences}
            jours={jours}
            saving={saving}
            deleting={deleting}
            creating={creating}
            onReturnToDashboard={onReturnToDashboard}
          />
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50">
      {/* Header Premium Responsive */}
      <div className="bg-white/80 backdrop-blur-xl shadow-xl border-b border-blue-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 md:space-x-6">
                  <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Retour au dashboard cuisine'); // Pour debug
                  // Utiliser la fonction de retour au dashboard
                  if (onReturnToDashboard) {
                    onReturnToDashboard();
                  } else {
                    // Fallback si la fonction n'est pas disponible
                    navigate('/cuisine');
                  }
                }}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-900 transition-all duration-200 hover:bg-blue-100 hover:scale-105 px-3 md:px-4 py-2 rounded-xl cursor-pointer"
                  >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-medium text-sm md:text-base">Retour</span>
                  </button>
              <div className="hidden md:block h-8 w-px bg-blue-300"></div>
              <div>
                                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-800 to-violet-600 bg-clip-text text-transparent">
                  Gestion Équipe Cuisine
                </h1>
                <p className="text-blue-600 mt-1 text-sm md:text-base">
                  {employees.length} employés • {postes.length} postes
                </p>
              </div>
            </div>
            
            {/* ➕ Bouton de création d'employé */}
            <div className="flex items-center space-x-3">
              <button
                onClick={openCreateEmployee}
                className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm md:text-base">Nouvel employé</span>
              </button>
                </div>
              </div>
            </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Barre de recherche premium responsive */}
        <div className="mb-6 md:mb-8">
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none">
              <Search className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
                      </div>
                      <input
              type="text"
              placeholder="Rechercher un employé par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-12 md:pl-16 pr-4 md:pr-6 py-4 md:py-5 bg-white/70 backdrop-blur-sm border border-blue-200/50 rounded-2xl text-base md:text-lg placeholder-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 shadow-xl transition-all duration-200"
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 pr-4 md:pr-6 flex items-center">
                      <button 
                  onClick={() => setSearchTerm('')}
                  className="text-blue-400 hover:text-blue-600 transition-colors"
                      >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                      </button>
              </div>
            )}
                    </div>

          {searchTerm && (
            <div className="text-center mt-4">
              <p className="text-blue-600 text-sm md:text-base">
                {filteredEmployees.length} résultat{filteredEmployees.length > 1 ? 's' : ''} pour "{searchTerm}"
              </p>
            </div>
                      )}
                    </div>

        {/* Liste des employés responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence>
            {filteredEmployees.map(employee => {
              const employeeCompetences = getEmployeeCompetences(employee.id);
              
              return (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  employeeCompetences={employeeCompetences}
                  postes={postes}
                  onEdit={openEditEmployee}
                />
              );
            })}
          </AnimatePresence>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 md:py-16">
            <User className="w-16 h-16 md:w-20 md:h-20 text-blue-300 mx-auto mb-6" />
            <h3 className="text-lg md:text-xl font-medium text-blue-700 mb-2">
              {searchTerm ? 'Aucun employé trouvé' : 'Aucun employé'}
            </h3>
            <p className="text-blue-500 text-sm md:text-base">
              {searchTerm ? 'Essayez de modifier votre recherche' : 'Chargement en cours...'}
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default CuisineManagement;
