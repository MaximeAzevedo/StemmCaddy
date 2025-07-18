import { supabase } from './supabase';

/**
 * ========================================
 * API LOGISTIQUE SUPABASE
 * ========================================
 * 
 * API spécialisée pour la gestion de l'équipe logistique
 * Utilise les nouvelles tables : employes_logistique_new, vehicules_logistique, etc.
 */

export const supabaseLogistique = {
  
  // ==================== EMPLOYÉS LOGISTIQUE ====================
  
  /**
   * Récupérer tous les employés logistique ACTIFS
   */
  async getEmployeesLogistique() {
    try {
      console.log('📊 getEmployeesLogistique - Chargement employés logistique...');
      
      const { data, error } = await supabase
        .from('employes_logistique_new')
        .select('*')
        .eq('actif', true)
        .order('nom');
      
      if (error) {
        console.error('❌ Erreur getEmployeesLogistique:', error);
        throw error;
      }

      console.log('✅ Employés logistique chargés:', data?.length || 0);
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getEmployeesLogistique:', error);
      return { data: [], error };
    }
  },

  /**
   * Mettre à jour un employé logistique
   */
  async updateEmployeeLogistique(id, updates) {
    try {
      const { data, error } = await supabase
        .from('employes_logistique_new')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      console.log('✅ Employé logistique mis à jour:', data);
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ Erreur updateEmployeeLogistique:', error);
      return { data: null, error };
    }
  },

  // ==================== VÉHICULES ====================
  
  /**
   * Récupérer tous les véhicules
   */
  async getVehicules() {
    try {
      console.log('📊 getVehicules - Chargement véhicules...');
      
      const { data, error } = await supabase
        .from('vehicules_logistique')
        .select('*')
        .eq('actif', true)
        .order('nom');
      
      if (error) {
        console.error('❌ Erreur getVehicules:', error);
        throw error;
      }

      console.log('✅ Véhicules chargés:', data?.length || 0);
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getVehicules:', error);
      return { data: [], error };
    }
  },

  // ==================== COMPÉTENCES VÉHICULES ====================
  
  /**
   * Récupérer les compétences véhicules avec employés
   */
  async getCompetencesVehicules() {
    try {
      console.log('📊 getCompetencesVehicules - Chargement compétences...');
      
      const { data, error } = await supabase
        .from('competences_vehicules')
        .select(`
          *,
          employe:employes_logistique_new(id, nom, profil),
          vehicule:vehicules_logistique(id, nom, capacite)
        `)
        .order('employee_id');
      
      if (error) {
        console.error('❌ Erreur getCompetencesVehicules:', error);
        throw error;
      }

      console.log('✅ Compétences véhicules chargées:', data?.length || 0);
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getCompetencesVehicules:', error);
      return { data: [], error };
    }
  },

  /**
   * Mettre à jour une compétence véhicule
   */
  async updateCompetenceVehicule(employeeId, vehiculeId, niveau) {
    try {
      console.log('🔧 updateCompetenceVehicule:', { employeeId, vehiculeId, niveau });
      
      if (niveau && niveau !== '') {
        // D'abord vérifier si l'enregistrement existe déjà
        const { data: existing, error: checkError } = await supabase
          .from('competences_vehicules')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('vehicule_id', vehiculeId)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 = "The result contains 0 rows" (pas d'erreur, juste pas de résultat)
          throw checkError;
        }
        
        if (existing) {
          // Mettre à jour l'enregistrement existant
          const { data, error } = await supabase
            .from('competences_vehicules')
            .update({ niveau: niveau })
            .eq('employee_id', employeeId)
            .eq('vehicule_id', vehiculeId)
            .select();
          
          if (error) throw error;
          console.log('✅ Compétence véhicule mise à jour:', data);
          return { data, error: null };
        } else {
          // Créer un nouvel enregistrement
          const { data, error } = await supabase
            .from('competences_vehicules')
            .insert({
              employee_id: employeeId,
              vehicule_id: vehiculeId,
              niveau: niveau
            })
            .select();
          
          if (error) throw error;
          console.log('✅ Compétence véhicule créée:', data);
          return { data, error: null };
        }
      } else {
        // Supprimer la compétence
        const { data, error } = await supabase
          .from('competences_vehicules')
          .delete()
          .eq('employee_id', employeeId)
          .eq('vehicule_id', vehiculeId);
        
        if (error) throw error;
        console.log('✅ Compétence véhicule supprimée');
        return { data, error: null };
      }
      
    } catch (error) {
      console.error('❌ Erreur updateCompetenceVehicule:', error);
      return { data: null, error };
    }
  },

  // ==================== PLANNING LOGISTIQUE ====================
  
  /**
   * Sauvegarder le planning hebdomadaire
   */
  async savePlanningHebdomadaire(planningData, weekStart) {
    try {
      console.log('💾 Sauvegarde planning hebdomadaire...');
      
      // Calculer les dates de la semaine
      const weekDates = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }
      
      // Supprimer l'ancien planning pour cette semaine
      const { error: deleteError } = await supabase
        .from('planning_logistique_new')
        .delete()
        .in('date', weekDates);
      
      if (deleteError) {
        console.error('❌ Erreur suppression ancien planning:', deleteError);
        throw deleteError;
      }
      
      // Mapper les rôles vers les valeurs autorisées en base
      const mapRole = (role) => {
        switch (role?.toLowerCase()) {
          case 'conducteur':
            return 'Conducteur';
          case 'assistant':
            return 'Assistant';
          case 'convoyeur':
          case 'equipier':
          default:
            return 'Équipier';
        }
      };
      
      // Préparer les données à insérer
      const insertData = [];
      
      Object.entries(planningData).forEach(([dateKey, vehiclesPlanning]) => {
        Object.entries(vehiclesPlanning).forEach(([vehicleId, employees]) => {
          // 🔧 CORRECTION : Ignorer la section "absents" qui n'est pas un véhicule
          if (vehicleId === 'absents' || !Array.isArray(employees)) {
            return; // Passer à l'itération suivante
          }
          
          const parsedVehicleId = parseInt(vehicleId);
          if (isNaN(parsedVehicleId)) {
            console.warn(`⚠️ ID véhicule invalide ignoré: ${vehicleId}`);
            return;
          }
          
          employees.forEach((employee, index) => {
            // Vérifier que l'employé a un ID valide
            if (!employee.id || isNaN(parseInt(employee.id))) {
              console.warn(`⚠️ Employé avec ID invalide ignoré:`, employee);
              return;
            }
            
            // Créer une entrée pour le matin
            insertData.push({
              employee_id: parseInt(employee.id),
              vehicule_id: parsedVehicleId,
              date: dateKey,
              creneau: 'matin',
              role: mapRole(employee.role),
              notes: null,
              absent: false // S'assurer que ce ne sont pas des absents
            });
            
            // Créer une entrée pour l'après-midi
            insertData.push({
              employee_id: parseInt(employee.id),
              vehicule_id: parsedVehicleId,
              date: dateKey,
              creneau: 'apres-midi',
              role: mapRole(employee.role),
              notes: null,
              absent: false // S'assurer que ce ne sont pas des absents
            });
          });
        });
      });
      
      // Insérer le nouveau planning
      if (insertData.length > 0) {
        const { data, error: insertError } = await supabase
          .from('planning_logistique_new')
          .insert(insertData)
          .select();
        
        if (insertError) {
          console.error('❌ Erreur insertion planning:', insertError);
          throw insertError;
        }
        
        console.log('✅ Planning sauvegardé:', data?.length, 'assignations');
        return { data, error: null };
      } else {
        console.log('ℹ️ Aucune assignation à sauvegarder');
        return { data: [], error: null };
      }
      
    } catch (error) {
      console.error('💥 Erreur critique sauvegarde planning:', error);
      return { data: null, error };
    }
  },

  /**
   * Charger le planning hebdomadaire existant
   */
  async loadPlanningHebdomadaire(weekStart) {
    try {
      console.log('📊 Chargement planning hebdomadaire...');
      
      // Calculer les dates de la semaine
      const weekDates = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        weekDates.push(date.toISOString().split('T')[0]);
      }
      
      const { data, error } = await supabase
        .from('planning_logistique_new')
        .select(`
          *,
          employe:employes_logistique_new(id, nom, profil, permis, langues),
          vehicule:vehicules_logistique(id, nom, capacite, couleur)
        `)
        .in('date', weekDates)
        .order('date')
        .order('vehicule_id');
      
      if (error) {
        console.error('❌ Erreur chargement planning:', error);
        throw error;
      }
      
      // Restructurer les données au format attendu par l'interface
      const planningFormatted = {};
      
      weekDates.forEach(date => {
        planningFormatted[date] = {
          absents: [] // 🔧 CORRECTION : Initialiser la section absents pour chaque jour
        };
      });
      
      if (data && data.length > 0) {
        // Grouper par employé pour éviter les doublons (matin + après-midi = 1 assignation)
        const employeeAssignments = new Map();
        
        data.forEach(assignment => {
          // 🔧 CORRECTION : Ignorer les lignes marquées comme absentes dans le planning normal
          if (assignment.absent === true) {
            return; // Les absents sont gérés séparément par getAbsencesLogistique
          }
          
          const key = `${assignment.date}-${assignment.employee_id}-${assignment.vehicule_id}`;
          
          if (!employeeAssignments.has(key)) {
            employeeAssignments.set(key, {
              ...assignment.employe,
              status: 'assigned',
              role: assignment.role?.toLowerCase() || 'equipier'
            });
          }
        });
        
        // Répartir les assignations uniques dans le planning
        data.forEach(assignment => {
          // 🔧 CORRECTION : Ignorer les absents dans le planning normal
          if (assignment.absent === true) {
            return;
          }
          
          const dateKey = assignment.date;
          const vehicleId = assignment.vehicule_id;
          const key = `${assignment.date}-${assignment.employee_id}-${assignment.vehicule_id}`;
          
          if (!planningFormatted[dateKey]) {
            planningFormatted[dateKey] = {
              absents: []
            };
          }
          
          if (!planningFormatted[dateKey][vehicleId]) {
            planningFormatted[dateKey][vehicleId] = [];
          }
          
          // Ajouter l'employé seulement s'il n'est pas déjà dans cette case
          const employeeAlreadyAdded = planningFormatted[dateKey][vehicleId].some(
            emp => emp.id === assignment.employee_id
          );
          
          if (!employeeAlreadyAdded && employeeAssignments.has(key)) {
            planningFormatted[dateKey][vehicleId].push(employeeAssignments.get(key));
          }
        });
      }
      
      console.log('✅ Planning chargé:', Object.keys(planningFormatted).length, 'jours');
      return { data: planningFormatted, error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique chargement planning:', error);
      return { data: null, error };
    }
  },

  /**
   * Récupérer le planning logistique avec jointures
   */
  async getPlanningLogistique(dateDebut = null, dateFin = null) {
    try {
      console.log('📊 getPlanningLogistique - Chargement planning...');
      
      let query = supabase
        .from('planning_logistique_new')
        .select(`
          *,
          employe:employes_logistique_new(id, nom, profil),
          vehicule:vehicules_logistique(id, nom, capacite, couleur)
        `);
        
      if (dateDebut) {
        if (dateFin) {
          query = query.gte('date', dateDebut).lte('date', dateFin);
        } else {
          query = query.eq('date', dateDebut);
        }
      }
      
      const { data, error } = await query.order('date').order('creneau');
      
      if (error) {
        console.error('❌ Erreur getPlanningLogistique:', error);
        throw error;
      }

      console.log('✅ Planning logistique chargé:', data?.length || 0);
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getPlanningLogistique:', error);
      return { data: [], error };
    }
  },

  // =================== ABSENCES LOGISTIQUE ===================
  
  /**
   * Obtenir toutes les absences de la semaine depuis la vraie table absences
   * 👁️ LECTURE SEULE - Affichage uniquement dans le planning
   */
  async getAbsencesLogistique(dateDebut = null, dateFin = null) {
    try {
      // Si aucune date fournie, prendre une plage large pour avoir toutes les absences
      if (!dateDebut || !dateFin) {
        const today = new Date();
        const past = new Date(today);
        past.setDate(past.getDate() - 365); // 1 an en arrière
        const future = new Date(today);
        future.setDate(future.getDate() + 365); // 1 an en avant
        
        dateDebut = past.toISOString().split('T')[0];
        dateFin = future.toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('absences_logistique_new')
        .select(`
          id,
          employee_id,
          date_debut,
          date_fin,
          type_absence,
          motif,
          employes_logistique_new (
            id,
            nom,
            profil
          )
        `)
        .gte('date_debut', dateDebut)
        .lte('date_fin', dateFin)
        .order('date_debut', { ascending: false });

      if (error) throw error;

      // Formatter pour l'affichage dans le planning
      const formattedData = data.map(item => ({
        id: item.id,
        employee_id: item.employee_id,
        date_debut: item.date_debut,
        date_fin: item.date_fin,
        type_absence: item.type_absence || 'Absent',
        motif: item.motif,
        employee_name: item.employes_logistique_new?.nom || 'Inconnu',
        employee: item.employes_logistique_new // Données complètes employé pour affichage
      }));

      console.log('✅ Absences logistique chargées (lecture seule):', formattedData.length);
      return { data: formattedData, error: null };
    } catch (error) {
      console.error('❌ Erreur getAbsencesLogistique:', error);
      return { data: [], error };
    }
  },

  /**
   * Ajouter une nouvelle absence
   */
  async addAbsence(absenceData) {
    try {
      const { data, error } = await supabase
        .from('absences_logistique_new')
        .insert([absenceData])
        .select(`
          *,
          employes_logistique_new (
            id,
            nom,
            profil
          )
        `);

      if (error) throw error;

      console.log('✅ Absence ajoutée:', data);
      return { data: data[0], error: null };
    } catch (error) {
      console.error('❌ Erreur addAbsence:', error);
      return { data: null, error };
    }
  },

  /**
   * Modifier une absence existante
   */
  async updateAbsence(absenceId, updates) {
    try {
      const { data, error } = await supabase
        .from('absences_logistique_new')
        .update(updates)
        .eq('id', absenceId)
        .select(`
          *,
          employes_logistique_new (
            id,
            nom,
            profil
          )
        `);

      if (error) throw error;

      console.log('✅ Absence modifiée:', data);
      return { data: data[0], error: null };
    } catch (error) {
      console.error('❌ Erreur updateAbsence:', error);
      return { data: null, error };
    }
  },

  /**
   * Supprimer une absence
   */
  async deleteAbsence(absenceId) {
    try {
      const { data, error } = await supabase
        .from('absences_logistique_new')
        .delete()
        .eq('id', absenceId);

      if (error) throw error;

      console.log('✅ Absence supprimée');
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur deleteAbsence:', error);
      return { data: null, error };
    }
  }

};

export default supabaseLogistique; 