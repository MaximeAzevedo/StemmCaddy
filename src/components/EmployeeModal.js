import React from 'react';
import { motion } from 'framer-motion';
import { Save, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PhotoUploader from './PhotoUploader';
import ScheduleEditor from './ScheduleEditor';

const EmployeeModal = ({
  isOpen,
  isCreateMode,
  employee,
  setEmployee,
  onSave,
  onClose,
  onDelete,
  updateEmployeeData,
  updateCompetence,
  postes = [],
  competences = [],
  jours = [],
  saving = false,
  deleting = false,
  creating = false,
  onReturnToDashboard
}) => {
  const navigate = useNavigate();
  
  if (!isOpen) return null;

  const colorScheme = isCreateMode ? 'emerald' : 'blue';
  const title = isCreateMode ? 'Créer un nouvel employé' : 'Modifier l\'employé';
  const subtitle = isCreateMode ? 'Ajouter un membre à l\'équipe cuisine' : employee?.nom;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50"
    >
      <div className="w-full"
      >
        {/* Header page complète */}
        <div className={`bg-gradient-to-r ${
          isCreateMode 
            ? 'from-emerald-50 to-green-50' 
            : 'from-blue-50 to-violet-50'
        } p-6 md:p-8 shadow-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Photo ou icône */}
              {employee?.photo_url ? (
                <img 
                  src={employee.photo_url}
                  alt={isCreateMode ? "Nouvelle photo" : employee.nom}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover shadow-lg ring-2 ring-white"
                  style={{ objectPosition: 'center 15%' }}
                />
              ) : (
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg ${
                  isCreateMode 
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}>
                  {employee?.nom ? 
                    employee.nom.split(' ').map(n => n[0]).join('').substring(0, 2) :
                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                </div>
              )}
              <div>
                <h2 className={`text-xl md:text-2xl font-bold ${
                  isCreateMode ? 'text-emerald-800' : 'text-blue-800'
                }`}>
                  {title}
                </h2>
                <p className={`mt-1 text-sm md:text-base ${
                  isCreateMode ? 'text-emerald-600' : 'text-blue-600'
                }`}>
                  {subtitle}
                </p>
              </div>
            </div>
                         <button
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 console.log('Retour au menu cuisine depuis modal'); // Pour debug
                 if (onReturnToDashboard) {
                   onReturnToDashboard();
                 } else {
                   navigate('/cuisine');
                 }
               }}
               className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors hover:scale-105 ${
                 isCreateMode 
                   ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100'
                   : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
               }`}
             >
               <X className="w-4 h-4" />
               <span className="hidden md:inline">Menu Cuisine</span>
             </button>
          </div>
        </div>

        {/* Contenu page */}
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Informations générales */}
            <div className="space-y-6">
              <h3 className={`text-lg font-semibold border-b pb-2 ${
                isCreateMode 
                  ? 'text-emerald-800 border-emerald-200'
                  : 'text-blue-800 border-blue-200'
              }`}>
                Informations générales
              </h3>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isCreateMode ? 'text-emerald-700' : 'text-blue-700'
                }`}>
                  Nom/Prénom {isCreateMode && '*'}
                </label>
                <input
                  type="text"
                  value={employee?.nom || ''}
                  onChange={(e) => setEmployee({...employee, nom: e.target.value})}
                  placeholder={isCreateMode ? "Entrez le nom et prénom" : ""}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 text-base ${
                    isCreateMode 
                      ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                      : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Photo Upload */}
              <PhotoUploader 
                employee={employee}
                onPhotoChange={updateEmployeeData}
                isCreateMode={isCreateMode}
                colorScheme={colorScheme}
              />

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isCreateMode ? 'text-emerald-700' : 'text-blue-700'
                }`}>
                  Profil/Langue
                </label>
                <select
                  value={employee?.profil || ''}
                  onChange={(e) => setEmployee({...employee, profil: e.target.value, langues: [e.target.value]})}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 text-base ${
                    isCreateMode 
                      ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                      : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                >
                  <option value="Français">Français</option>
                  <option value="Anglais">Anglais</option>
                  <option value="Espagnol">Espagnol</option>
                  <option value="Arabe">Arabe</option>
                  <option value="Italien">Italien</option>
                  <option value="Portugais">Portugais</option>
                  <option value="Allemand">Allemand</option>
                  <option value="Russe">Russe</option>
                  <option value="Chinois">Chinois</option>
                  <option value="Yougoslave">Yougoslave</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isCreateMode ? 'text-emerald-700' : 'text-blue-700'
                }`}>
                  Notes
                </label>
                <textarea
                  value={employee?.notes || ''}
                  onChange={(e) => setEmployee({...employee, notes: e.target.value})}
                  rows={isCreateMode ? 4 : 3}
                  placeholder={isCreateMode ? "Notes supplémentaires..." : "Notes supplémentaires..."}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 text-base ${
                    isCreateMode 
                      ? 'border-emerald-300 focus:ring-emerald-500 focus:border-emerald-500'
                      : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Horaires */}
            <ScheduleEditor 
              schedule={employee}
              onScheduleChange={updateEmployeeData}
              colorScheme={colorScheme}
              jours={jours}
            />
          </div>

          {/* Compétences postes cuisine (seulement en mode édition) */}
          {!isCreateMode && employee && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-blue-800 border-b border-blue-200 pb-2 mb-4">
                Compétences par poste de cuisine
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {postes.map(poste => {
                  const competence = competences.find(comp => 
                    comp.employee_id === employee.id && comp.poste_id === poste.id
                  );
                  
                  return (
                    <div key={poste.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                      <div>
                        <span className="font-medium text-blue-800">{poste.nom}</span>
                        <div className="text-sm text-blue-600">{poste.icone}</div>
                      </div>
                      <select
                        value={competence?.niveau || ''}
                        onChange={(e) => updateCompetence(employee.id, poste.id, e.target.value)}
                        className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">Non formé</option>
                        <option value="Expert">Formé</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 mt-8 pt-6 border-t border-gray-200">
            {/* Bouton de suppression (seulement en mode édition) */}
            {!isCreateMode && (
              <div className="w-full md:w-auto">
                <button
                  onClick={onDelete}
                  disabled={saving || deleting || creating}
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Suppression...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer l'employé</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* Boutons principaux */}
            <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4">
                             <button
                 onClick={() => {
                   if (onReturnToDashboard) {
                     onReturnToDashboard();
                   } else {
                     navigate('/cuisine');
                   }
                 }}
                 className={`w-full md:w-auto px-6 py-3 font-medium transition-colors ${
                   isCreateMode 
                     ? 'text-emerald-600 hover:text-emerald-800'
                     : 'text-blue-600 hover:text-blue-800'
                 }`}
               >
                 Annuler
               </button>
              <button
                onClick={onSave}
                disabled={saving || deleting || creating}
                className={`w-full md:w-auto px-8 py-3 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                  isCreateMode 
                    ? 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800'
                    : 'bg-gradient-to-r from-blue-600 to-violet-700 hover:from-blue-700 hover:to-violet-800'
                }`}
              >
                {(saving || creating) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{isCreateMode ? 'Création...' : 'Sauvegarde...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isCreateMode ? 'Créer l\'employé' : 'Sauvegarder'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
                 </div>
      </div>
    </motion.div>
   );
};

export default EmployeeModal; 