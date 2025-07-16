import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../../lib/supabase-cuisine';
import { getSessionConfig } from '../config';

/**
 * Règles métier simplifiées pour l'IA (constante globale)
 */
const SIMPLE_POSTES_RULES = {
  'Sandwichs': { min: 3, max: 5, priority: 1 },
  'Cuisine chaude': { min: 2, max: 4, priority: 2 },
  'Self Midi': { min: 2, max: 3, priority: 3 },
  'Vaisselle': { min: 2, max: 3, priority: 4 },
  'Pain': { min: 1, max: 2, priority: 5 },
  'Légumerie': { min: 1, max: 2, priority: 6 },
  'Jus de fruits': { min: 1, max: 2, priority: 7 },
  'Equipe Pina et Saskia': { min: 1, max: 2, priority: 8 }
};

/**
 * Hook pour la génération IA de planning
 * Version hybride : données métier de la DB, planning localStorage
 */
export const usePlanningAI = (selectedDate, currentSession, onAIGenerated) => {
  const [aiLoading, setAiLoading] = useState(false);

  /**
   * Génération IA complète du planning (version localStorage)
   */
  const generateAIPlanning = useCallback(async () => {
    setAiLoading(true);
    try {
      toast.loading('🤖 IA en cours de génération du planning...', { id: 'ai-planning' });
      
      // Récupérer les données métier depuis la DB (conservé)
      const [employeesRes, postesRes, competencesRes, absencesRes] = await Promise.all([
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getPostes(),
        supabaseCuisine.getCompetencesCuisineSimple(),
        supabaseCuisine.getAbsencesCuisine(format(selectedDate, 'yyyy-MM-dd'), format(selectedDate, 'yyyy-MM-dd'))
      ]);
      
      const employees = employeesRes.data || [];
      const allPostes = postesRes.data || [];
      const competences = competencesRes.data || [];
      const absences = absencesRes.data || [];
      const conf = getSessionConfig(currentSession);
      const postesActifs = allPostes.filter(p => conf.postesActifs.includes(p.nom));
      
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
      const availableEmployees = employees.filter(ec => 
        !absentEmployeeIds.includes(ec.id) && 
        ec.actif !== false
      );
      
      // Construire map des compétences par employé
      const competencesMap = {};
      competences.forEach(comp => {
        if (!competencesMap[comp.employee_id]) {
          competencesMap[comp.employee_id] = [];
        }
        const poste = allPostes.find(p => p.id === comp.poste_id);
        if (poste) {
          competencesMap[comp.employee_id].push(poste.nom);
        }
      });
      
      console.log('🤖 IA Planning - Données:', {
        employés: availableEmployees.length,
        postes: postesActifs.length,
        absents: absentEmployeeIds.length,
        compétences: Object.keys(competencesMap).length
      });
      
      // Algorithme IA simple mais efficace
      const newBoard = {};
      const assignedEmployees = new Set();
      
      // Priorité aux postes critiques
      const postesSorted = postesActifs.sort((a, b) => {
        const ruleA = SIMPLE_POSTES_RULES[a.nom] || { priority: 10 };
        const ruleB = SIMPLE_POSTES_RULES[b.nom] || { priority: 10 };
        return ruleA.priority - ruleB.priority;
      });
      
      postesSorted.forEach(poste => {
        const rules = SIMPLE_POSTES_RULES[poste.nom] || { min: 1, max: 2 };
        const targetCount = Math.max(rules.min, Math.min(rules.max, 
          Math.ceil(availableEmployees.length / postesActifs.length)
        ));
        
        conf.creneaux.forEach(creneau => {
          const cellId = `${poste.nom}-${creneau}`;
          newBoard[cellId] = [];
          
          let assigned = 0;
          for (const emp of availableEmployees) {
            if (assigned >= targetCount) break;
            if (assignedEmployees.has(emp.id)) continue;
            
            // Vérifier compétences si nécessaire
            const hasCompetence = competencesMap[emp.id]?.includes(poste.nom) || 
                                rules.allowEveryone;
            
            if (hasCompetence || assigned === 0) { // Au moins 1 par poste
              newBoard[cellId].push({
                draggableId: `ai-${Date.now()}-${emp.id}`,
                employeeId: emp.id,
                employee: {
                  id: emp.id,
                  nom: emp.prenom,
                  profil: emp.langue_parlee || 'Standard'
                },
                photo_url: emp.photo_url,
                nom: emp.prenom,
                prenom: emp.prenom,
                isLocal: true
              });
              assignedEmployees.add(emp.id);
              assigned++;
            }
          }
        });
      });
      
      console.log('🤖 Planning IA généré:', {
        cellules: Object.keys(newBoard).length,
        assignations: Object.values(newBoard).reduce((sum, cell) => sum + cell.length, 0),
        employésAssignés: assignedEmployees.size
      });
      
      if (onAIGenerated) {
        onAIGenerated(newBoard);
      }
      
      toast.success('🎉 Planning généré par IA !', { id: 'ai-planning' });
      
    } catch (error) {
      console.error('❌ Erreur génération IA:', error);
      toast.error('Erreur lors de la génération IA', { id: 'ai-planning' });
    } finally {
      setAiLoading(false);
    }
  }, [selectedDate, currentSession, onAIGenerated]);

  /**
   * Optimisation IA du planning existant
   */
  const optimizeWithAI = useCallback(async (currentBoard) => {
    setAiLoading(true);
    try {
      toast.loading('🔧 Optimisation IA en cours...', { id: 'ai-optimize' });
      
      // Analyser le planning actuel
      const currentStats = {};
      Object.entries(currentBoard).forEach(([cellId, employees]) => {
        if (cellId === 'unassigned') return;
        const [poste] = cellId.split('-', 1);
        if (!currentStats[poste]) currentStats[poste] = 0;
        currentStats[poste] += employees.length;
      });
      
      // Suggestions d'amélioration
      const suggestions = [];
      Object.entries(currentStats).forEach(([poste, count]) => {
        const rules = SIMPLE_POSTES_RULES[poste];
        if (rules) {
          if (count < rules.min) {
            suggestions.push(`⚠️ ${poste}: ${count}/${rules.min} (manque ${rules.min - count})`);
          } else if (count > rules.max) {
            suggestions.push(`⚠️ ${poste}: ${count}/${rules.max} (surplus ${count - rules.max})`);
          } else {
            suggestions.push(`✅ ${poste}: ${count} (optimal)`);
          }
        }
      });
      
      console.log('🔧 Analyse IA:', suggestions);
      
      // Afficher les suggestions
      const message = suggestions.slice(0, 5).join('\n');
      toast.success(`Analyse IA terminée:\n${message}`, { 
        id: 'ai-optimize',
        duration: 5000
      });
      
    } catch (error) {
      console.error('❌ Erreur optimisation IA:', error);
      toast.error('Erreur lors de l\'optimisation IA', { id: 'ai-optimize' });
    } finally {
      setAiLoading(false);
    }
  }, []);

  return {
    aiLoading,
    generateAIPlanning,
    optimizeWithAI
  };
}; 