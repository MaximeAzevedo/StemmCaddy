import React from 'react';
import { motion } from 'framer-motion';
import { Edit3, Clock, Languages, ChefHat } from 'lucide-react';

const EmployeeCard = ({ 
  employee, 
  employeeCompetences = [], 
  postes = [], 
  onEdit 
}) => {
  return (
    <motion.div
      key={employee.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-blue-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        {/* Header carte */}
        <div className="bg-gradient-to-r from-blue-50 to-violet-50 p-4 md:p-6 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4">
              {/* 📸 PHOTO - Affichage de la photo ou initiales */}
              {employee.photo_url ? (
                <img 
                  src={employee.photo_url}
                  alt={employee.nom}
                  className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover shadow-lg ring-2 ring-white"
                  style={{ objectPosition: 'center top' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg ${
                employee.profil === 'Expert' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                employee.profil === 'Expérimenté' ? 'bg-gradient-to-br from-amber-500 to-amber-600' :
                employee.profil === 'Intermédiaire' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                'bg-gradient-to-br from-rose-500 to-rose-600'
              } ${employee.photo_url ? 'hidden' : 'flex'}`}>
                {employee.nom.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-xl font-bold text-blue-800 truncate">{employee.nom}</h3>
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3 mt-2">
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium w-fit ${
                    employee.profil === 'Expert' ? 'bg-emerald-100 text-emerald-700' :
                    employee.profil === 'Expérimenté' ? 'bg-amber-100 text-amber-700' :
                    employee.profil === 'Intermédiaire' ? 'bg-blue-100 text-blue-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {employee.profil}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onEdit(employee)}
              className="p-2 md:p-3 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group-hover:scale-110 flex-shrink-0"
            >
              <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Contenu carte */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Horaires */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">Horaires</span>
            </div>
            <div className="text-sm text-blue-600 bg-blue-50 rounded-xl p-3">
              {employee.lundi_debut && employee.lundi_fin ? 
                `${employee.lundi_debut.substring(0,5)} - ${employee.lundi_fin.substring(0,5)}` : 
                '8h00 - 16h00'
              }
            </div>
          </div>

          {/* Langues */}
          {employee.langues && employee.langues.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Languages className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">Langues</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {employee.langues.slice(0, 3).map((langue, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-700 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium">
                    {langue}
                  </span>
                ))}
                {employee.langues.length > 3 && (
                  <span className="bg-blue-200 text-blue-600 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-medium">
                    +{employee.langues.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Compétences postes */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <ChefHat className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">
                Compétences ({employeeCompetences.length})
              </span>
            </div>
            <div className="space-y-2">
              {employeeCompetences.length > 0 ? (
                employeeCompetences.slice(0, 3).map((comp, idx) => {
                  const poste = postes.find(p => p.id === comp.poste_id);
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-blue-50 rounded-xl">
                      <span className="text-xs md:text-sm font-medium text-blue-700 truncate mr-2">
                        {poste?.nom || 'Poste inconnu'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        comp.niveau === 'Expert' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {comp.niveau === 'Expert' ? 'Formé' : 'Non formé'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-blue-500 italic text-center py-3">
                  Aucune formation
                </div>
              )}
              {employeeCompetences.length > 3 && (
                <div className="text-xs text-blue-500 text-center">
                  +{employeeCompetences.length - 3} autres
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EmployeeCard; 