import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../../lib/supabase-cuisine';
import { getSessionConfig, getCreneauxForPoste } from '../config';
import { POSTES_RULES } from '../config/postesRules';

/**
 * Hook pour la génération IA de planning INTELLIGENTE
 * Utilise les vraies règles métier et distribue équitablement
 */
export const usePlanningAI = (selectedDate, currentSession, onAIGenerated) => {
  const [aiLoading, setAiLoading] = useState(false);

  /**
   * Génération IA INTELLIGENTE du planning
   */
  const generateAIPlanning = useCallback(async () => {
    setAiLoading(true);
    try {
      toast.loading('🤖 IA INTELLIGENTE en cours de génération...', { id: 'ai-planning' });
      
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
      
      // Map des chefs par compétence spéciale (cuisine_chaude, chef_sandwichs, etc.)
      const chefsMap = {};
      employees.forEach(emp => {
        if (emp.chef_sandwichs) chefsMap['Chef sandwichs'] = emp;
        if (emp.cuisine_chaude && emp.chef_equipe) chefsMap['Chef cuisine'] = emp;
      });
      
      console.log('🤖 IA INTELLIGENTE - Données:', {
        employés: availableEmployees.length,
        postes: postesActifs.length,
        absents: absentEmployeeIds.length,
        compétences: Object.keys(competencesMap).length,
        chefs: Object.keys(chefsMap).length
      });
      
      // 🧠 ALGORITHME IA INTELLIGENT
      const newBoard = {};
      const employeeWorkload = {}; // Track combien d'assignations par employé
      
      // Initialiser le tracking de charge de travail
      availableEmployees.forEach(emp => {
        employeeWorkload[emp.id] = 0;
      });
      
      // Trier les postes par VRAIE priorité (postesRules.js)
      const postesSorted = postesActifs.sort((a, b) => {
        const ruleA = POSTES_RULES[a.nom] || { priority: 10 };
        const ruleB = POSTES_RULES[b.nom] || { priority: 10 };
        return ruleA.priority - ruleB.priority;
      });
      
      console.log('🎯 IA - Ordre de priorité:', postesSorted.map(p => `${p.nom} (P${POSTES_RULES[p.nom]?.priority || 10})`));
      
      // Assigner par ordre de priorité avec algorithme intelligent
      postesSorted.forEach(poste => {
        const rules = POSTES_RULES[poste.nom] || { min: 1, max: 2, allowEveryone: true };
        const creneauxForPoste = getCreneauxForPoste(poste.nom);
        
        console.log(`🎯 IA traite ${poste.nom} - Règles:`, {
          min: rules.min,
          max: rules.max,
          needsCompetence: rules.needsCompetence,
          needsChef: rules.needsChef,
          créneaux: creneauxForPoste.length
        });
        
        creneauxForPoste.forEach(creneau => {
          const cellId = `${poste.nom}-${creneau}`;
          newBoard[cellId] = [];
          
          // Calculer nombre cible selon VRAIES règles
          let targetCount = rules.min;
          
          // Règles spéciales par créneau (ex: Vaisselle 8h = 1 personne)
          if (rules.specialRules && rules.specialRules[creneau]) {
            targetCount = rules.specialRules[creneau].min;
          }
          
          // 🎯 PHASE 1 : CHEF OBLIGATOIRE (si requis)
          if (rules.needsChef && rules.chefCompetence) {
            const chef = chefsMap[rules.chefCompetence];
            if (chef && availableEmployees.find(e => e.id === chef.id)) {
              newBoard[cellId].push(createEmployeeItem(chef));
              employeeWorkload[chef.id]++;
              targetCount--; // Chef compte dans le quota
              console.log(`👨‍🍳 Chef assigné: ${chef.prenom} → ${cellId}`);
            }
          }
          
          // 🎯 PHASE 2 : EMPLOYÉS COMPÉTENTS (si compétences requises)
          if (rules.needsCompetence && targetCount > 0) {
            const competentEmployees = availableEmployees
              .filter(emp => competencesMap[emp.id]?.includes(poste.nom))
              .sort((a, b) => employeeWorkload[a.id] - employeeWorkload[b.id]); // Les moins chargés d'abord
            
            let assigned = 0;
            for (const emp of competentEmployees) {
              if (assigned >= targetCount) break;
              
              // Éviter surcharge (max 3 assignations par employé)
              if (employeeWorkload[emp.id] >= 3) continue;
              
              // Ne pas assigner le même employé 2 fois dans le même poste
              const alreadyInPoste = newBoard[cellId].some(item => item.employeeId === emp.id);
              if (alreadyInPoste) continue;
              
              newBoard[cellId].push(createEmployeeItem(emp));
              employeeWorkload[emp.id]++;
              assigned++;
              console.log(`✅ Compétent assigné: ${emp.prenom} → ${cellId} (charge: ${employeeWorkload[emp.id]})`);
            }
            
            targetCount -= assigned;
          }
          
          // 🎯 PHASE 3 : EMPLOYÉS DISPONIBLES (si allowEveryone ou pas assez de compétents)
          if ((rules.allowEveryone || rules.allowNonValidated) && targetCount > 0) {
            const otherEmployees = availableEmployees
              .filter(emp => {
                // Pas déjà assigné dans ce créneau
                const alreadyInCell = newBoard[cellId].some(item => item.employeeId === emp.id);
                return !alreadyInCell;
              })
              .sort((a, b) => employeeWorkload[a.id] - employeeWorkload[b.id]); // Les moins chargés d'abord
            
            let assigned = 0;
            for (const emp of otherEmployees) {
              if (assigned >= targetCount) break;
              
              // Éviter surcharge
              if (employeeWorkload[emp.id] >= 3) continue;
              
              newBoard[cellId].push(createEmployeeItem(emp));
              employeeWorkload[emp.id]++;
              assigned++;
              console.log(`🔄 Disponible assigné: ${emp.prenom} → ${cellId} (charge: ${employeeWorkload[emp.id]})`);
            }
          }
          
          console.log(`📍 ${cellId}: ${newBoard[cellId].length} employés assignés (cible: ${rules.min})`);
        });
      });
      
      // 📊 Statistiques finales
      const totalAssignations = Object.values(newBoard).reduce((sum, cell) => sum + cell.length, 0);
      const employeesUsed = new Set(Object.values(newBoard).flat().map(item => item.employeeId)).size;
      const avgWorkload = totalAssignations / employeesUsed;
      
      console.log('🤖 Planning IA INTELLIGENT généré:', {
        cellules: Object.keys(newBoard).length,
        assignations: totalAssignations,
        employésUtilisés: employeesUsed,
        chargeMovenne: avgWorkload.toFixed(1),
        répartition: Object.fromEntries(
          Object.entries(employeeWorkload).filter(([_, workload]) => workload > 0)
        )
      });
      
      if (onAIGenerated) {
        onAIGenerated(newBoard);
      }
      
      toast.success(`🎉 Planning IA généré ! ${totalAssignations} assignations pour ${employeesUsed} employés`, { id: 'ai-planning' });
      
    } catch (error) {
      console.error('❌ Erreur génération IA INTELLIGENTE:', error);
      toast.error('Erreur lors de la génération IA', { id: 'ai-planning' });
    } finally {
      setAiLoading(false);
    }
  }, [selectedDate, currentSession, onAIGenerated]);

  /**
   * Créer un item employé pour le board
   */
  const createEmployeeItem = (emp) => ({
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
    generatedBy: 'ai',
    isLocal: true
  });

  return {
    aiLoading,
    generateAIPlanning
  };
}; 