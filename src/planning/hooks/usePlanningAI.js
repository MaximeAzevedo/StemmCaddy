import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../../lib/supabase-cuisine';
import { getSessionConfig, getCreneauxForPoste } from '../config';

/**
 * Règles métier simplifiées pour l'IA (constante globale)
 */
const SIMPLE_POSTES_RULES = {
  'Sandwichs': { min: 3, max: 5, priority: 1, allowEveryone: true },
  'Cuisine chaude': { min: 2, max: 4, priority: 2, allowEveryone: true },
  'Self Midi': { min: 2, max: 3, priority: 3, allowEveryone: true },
  'Vaisselle': { min: 2, max: 3, priority: 4, allowEveryone: true },
  'Pain': { min: 1, max: 2, priority: 5, allowEveryone: true },
  'Légumerie': { min: 1, max: 2, priority: 6, allowEveryone: true },
  'Jus de fruits': { min: 1, max: 2, priority: 7, allowEveryone: true },
  'Equipe Pina et Saskia': { min: 1, max: 2, priority: 8, allowEveryone: true }
};

/**
 * Hook pour la génération IA de planning
 * Version hybride : données métier de la DB, planning localStorage
 */
export const usePlanningAI = (selectedDate, currentSession, onAIGenerated) => {
  const [aiLoading, setAiLoading] = useState(false);

  /**
   * Génération IA complète du planning (CORRIGÉE)
   */
  const generateAIPlanning = useCallback(async () => {
    setAiLoading(true);
    try {
      toast.loading('🤖 IA en cours de génération du planning...', { id: 'ai-planning' });
      
      // Récupérer les données métier depuis la DB
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
      
      // Filtrer les employés présents (pas absents)
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const absentEmployeeIds = absences
        .filter(abs => {
          const absenceStart = abs.date_debut;
          const absenceEnd = abs.date_fin;
          return dateStr >= absenceStart && dateStr <= absenceEnd;
        })
        .map(abs => abs.employee_id);
      
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
      
      // 🔧 CORRECTION CRITIQUE : Algorithme IA avec créneaux spécifiques par poste
      const newBoard = {};
      
      // Priorité aux postes critiques
      const postesSorted = postesActifs.sort((a, b) => {
        const ruleA = SIMPLE_POSTES_RULES[a.nom] || { priority: 10 };
        const ruleB = SIMPLE_POSTES_RULES[b.nom] || { priority: 10 };
        return ruleA.priority - ruleB.priority;
      });
      
      postesSorted.forEach(poste => {
        const rules = SIMPLE_POSTES_RULES[poste.nom] || { min: 1, max: 2, allowEveryone: true };
        
        // 🔧 CORRECTION : Utiliser les créneaux spécifiques à chaque poste
        const creneauxForPoste = getCreneauxForPoste(poste.nom);
        console.log(`🎯 Poste ${poste.nom} - Créneaux SOURCE:`, creneauxForPoste);
        
        creneauxForPoste.forEach(creneau => {
          console.log(`🔍 IA traite créneau: "${creneau}" (longueur: ${creneau.length}) pour ${poste.nom}`);
          
          const cellId = `${poste.nom}-${creneau}`;
          newBoard[cellId] = [];
          
          // Calculer nombre cible d'employés pour ce créneau
          const targetCount = Math.max(1, Math.min(rules.max, 
            Math.ceil(rules.min)
          ));
          
          let assigned = 0;
          for (const emp of availableEmployees) {
            if (assigned >= targetCount) break;
            
            // Autoriser assignations multiples (l'employé peut être sur plusieurs créneaux)
            const hasCompetence = competencesMap[emp.id]?.includes(poste.nom) || rules.allowEveryone;
            
            if (hasCompetence || assigned === 0) { // Au moins 1 par créneau
              newBoard[cellId].push({
                draggableId: `ai-${Date.now()}-${Math.random()}-${emp.id}`,
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
              assigned++;
            }
          }
          
          console.log(`📍 ${cellId}: ${assigned} employés assignés`);
        });
      });
      
      console.log('🤖 Planning IA généré:', {
        cellules: Object.keys(newBoard).length,
        assignations: Object.values(newBoard).reduce((sum, cell) => sum + cell.length, 0),
        cellulesNonVides: Object.values(newBoard).filter(cell => cell.length > 0).length
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

  return {
    aiLoading,
    generateAIPlanning
    // ❌ Suppression de optimizeExistingPlanning (bouton inutile)
  };
}; 