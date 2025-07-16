import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { supabaseCuisine } from '../../lib/supabase-cuisine';
import { usePlanningData as usePlanningContext } from '../../contexts/PlanningDataContext';

/**
 * Hook pour la gestion du chargement des données métier du planning
 * Version hybride : charge données métier DB, planning géré en localStorage
 */
export const usePlanningDataLoader = (selectedDate, currentSession) => {
  const [loading, setLoading] = useState(true);
  const [postes, setPostes] = useState([]);
  const { updatePlanningData } = usePlanningContext();

  /**
   * Chargement des données métier (sans planning DB)
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Charger uniquement les données métier (pas le planning)
      const [postesRes, employeesRes, absencesRes, competencesRes] = await Promise.all([
        supabaseCuisine.getPostes(),
        supabaseCuisine.getEmployeesCuisine(),
        supabaseCuisine.getAbsencesCuisine(dateStr, dateStr),
        supabaseCuisine.getCompetencesCuisineSimple()
      ]);

      if (postesRes.error || employeesRes.error) {
        throw new Error('Erreur de chargement des données métier');
      }

      console.log('📊 DONNÉES MÉTIER chargées:', {
        postes: postesRes.data?.length || 0,
        employés: employeesRes.data?.length || 0,
        absences: absencesRes.data?.length || 0,
        compétences: competencesRes.data?.length || 0
      });

      // ✅ Alimenter le contexte partagé pour le mode TV (sans planning DB)
      updatePlanningData({
        postes: postesRes.data || [],
        employeesCuisine: employeesRes.data || [],
        planning: [], // Planning géré en localStorage, pas en DB
        absences: absencesRes.data || [],
        selectedDate,
        currentSession,
        loading: false
      });

      // ✅ Construire la map des compétences locale
      const competences = competencesRes.data || [];
      const competencesMap = {};
      competences.forEach(comp => {
        if (!competencesMap[comp.employee_id]) {
          competencesMap[comp.employee_id] = [];
        }
        const poste = (postesRes.data || []).find(p => p.id === comp.poste_id);
        if (poste) {
          competencesMap[comp.employee_id].push(poste.nom);
        }
      });
      console.log('🎯 Compétences chargées:', Object.keys(competencesMap).length, 'employés');

      setPostes(postesRes.data || []);
      
      // ✅ CRÉNEAUX CORRECTS selon les spécifications réelles
      const creneauxCorrects = [
        '8h-16h',      // Postes standards
        '8h-12h',      // Pain  
        '8h',          // Vaisselle matin
        '10h',         // Vaisselle 10h
        'midi',        // Vaisselle midi
        '11h-11h45',   // Self Midi service 1
        '11h45-12h45'  // Self Midi service 2
      ];
      
      return {
        postes: postesRes.data || [],
        creneaux: creneauxCorrects,
        employees: employeesRes.data || [],
        planning: [], // Pas de planning DB, géré en base partagée
        absences: absencesRes.data || [],
        competencesMap
      };
      
    } catch (err) {
      console.error('Erreur chargement données métier:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedDate, currentSession, updatePlanningData]);

  /**
   * Diagnostic de données métier
   */
  const runDataDiagnostic = useCallback(async () => {
    try {
      console.log('🔍 DIAGNOSTIC : DONNÉES MÉTIER - DÉBUT');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      console.log(`📅 Date sélectionnée: ${dateStr}`);
      console.log(`⏰ Session courante: ${currentSession}`);
      
      // ÉTAPE 1: Vérifier les postes
      const { data: postesData, error: postesError } = await supabaseCuisine.getPostes();
      console.log('📊 POSTES:', {
        count: postesData?.length || 0,
        error: postesError,
        postes: postesData?.map(p => p.nom) || []
      });
      
      // ÉTAPE 2: Vérifier les employés cuisine
      const { data: employeesData, error: empError } = await supabaseCuisine.getEmployeesCuisine();
      console.log('👥 EMPLOYÉS CUISINE:', {
        count: employeesData?.length || 0,
        error: empError,
        // 🔧 CORRECTION : Structure directe ec.actif au lieu de ec.employee.statut
        actifs: employeesData?.filter(e => e.actif !== false).length || 0,
        noms: employeesData?.slice(0, 5).map(e => e.prenom) || []
      });
      
      // ÉTAPE 3: Vérifier les compétences
      const { data: competencesData, error: compError } = await supabaseCuisine.getCompetencesCuisineSimple();
      console.log('🎯 COMPÉTENCES:', {
        count: competencesData?.length || 0,
        error: compError
      });
      
      // ÉTAPE 4: Vérifier les absences
      const { data: absencesData, error: absError } = await supabaseCuisine.getAbsencesCuisine(dateStr, dateStr);
      console.log('❌ ABSENCES:', {
        count: absencesData?.length || 0,
        error: absError,
        // 🔧 CORRECTION : Pas de statut dans les absences selon la vraie structure
        dateDuJour: absencesData?.filter(a => 
          a.date_debut <= dateStr && a.date_fin >= dateStr
        ).length || 0
      });
      
      console.log('📋 RÉSUMÉ DIAGNOSTIC:');
      console.log(`   ✅ Postes: ${postesData?.length || 0}`);
      console.log(`   ✅ Employés actifs: ${employeesData?.filter(e => e.actif !== false).length || 0}`);
      console.log(`   ✅ Compétences: ${competencesData?.length || 0}`);
      console.log(`   ⚠️ Absences du jour: ${absencesData?.filter(a => 
        a.date_debut <= dateStr && a.date_fin >= dateStr
      ).length || 0}`);
      console.log('   💾 Planning: Géré en localStorage (pas en DB)');
      
      return {
        success: true,
        message: 'Diagnostic terminé - Données métier OK',
        data: {
          postes: postesData?.length || 0,
          employees: employeesData?.length || 0,
          competences: competencesData?.length || 0,
          absences: absencesData?.length || 0,
          date: dateStr,
          session: currentSession
        }
      };
      
    } catch (error) {
      console.error('❌ DIAGNOSTIC ÉCHOUÉ:', error);
      return {
        success: false,
        message: 'Erreur lors du diagnostic'
      };
    }
  }, [selectedDate, currentSession]);

  return {
    loading,
    postes,
    loadData,
    runDataDiagnostic
  };
}; 