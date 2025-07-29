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

  /**
   * Supprimer un employé logistique (avec vérifications sécurité)
   */
  async deleteEmployeeLogistique(employeeId, forceDelete = false) {
    try {
      console.log('🗑️ Suppression employé logistique ID:', employeeId, 'Force:', forceDelete);

      // 1. Vérifier si l'employé a des plannings futurs
      console.log('🔍 Vérification plannings futurs...');
      const today = new Date().toISOString().split('T')[0];
      const { data: futurePlanning, error: planningError } = await supabase
        .from('planning_logistique_new')
        .select('date')
        .eq('employee_id', employeeId)
        .gte('date', today);

      if (planningError) {
        console.error('❌ Erreur vérification planning futur:', planningError);
        return { data: null, error: planningError };
      }

      console.log('🔍 Plannings futurs trouvés:', futurePlanning?.length || 0);
      if (futurePlanning && futurePlanning.length > 0 && !forceDelete) {
        const futureDates = futurePlanning.map(p => p.date).sort();
        console.log('❌ Suppression bloquée - plannings futurs:', futureDates);
        return { 
          data: null, 
          error: { 
            message: `Impossible de supprimer : l'employé a ${futurePlanning.length} affectation(s) future(s) (à partir du ${futureDates[0]})`,
            code: 'FUTURE_ASSIGNMENTS_EXIST',
            details: futureDates
          }
        };
      }

      if (futurePlanning && futurePlanning.length > 0 && forceDelete) {
        console.log('⚡ Suppression forcée activée - suppression de', futurePlanning.length, 'plannings futurs');
      }

      // 2. Supprimer les compétences véhicules
      console.log('🗑️ Suppression compétences véhicules...');
      const { error: competencesError } = await supabase
        .from('competences_vehicules')
        .delete()
        .eq('employee_id', employeeId);

      if (competencesError) {
        console.error('❌ Erreur suppression compétences:', competencesError);
        return { data: null, error: competencesError };
      }
      console.log('✅ Compétences supprimées');

      // 3. Supprimer les absences existantes
      console.log('🗑️ Suppression absences...');
      const { error: absencesError } = await supabase
        .from('absences_logistique_new')
        .delete()
        .eq('employee_id', employeeId);

      if (absencesError) {
        console.error('❌ Erreur suppression absences:', absencesError);
        return { data: null, error: absencesError };
      }
      console.log('✅ Absences supprimées');

      // 4. Supprimer TOUS les plannings (passés ET futurs si forceDelete)
      console.log('🗑️ Suppression plannings (tous)...');
      const { error: planningDeleteError } = await supabase
        .from('planning_logistique_new')
        .delete()
        .eq('employee_id', employeeId);

      if (planningDeleteError) {
        console.error('❌ Erreur suppression plannings:', planningDeleteError);
        return { data: null, error: planningDeleteError };
      }
      console.log('✅ Plannings supprimés');

      // 5. Supprimer l'employé
      console.log('🗑️ Suppression employé principal...');
      const { data, error } = await supabase
        .from('employes_logistique_new')
        .delete()
        .eq('id', employeeId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erreur suppression employé:', error);
        return { data: null, error };
      }

      if (forceDelete && futurePlanning && futurePlanning.length > 0) {
        console.log('✅ Employé logistique supprimé avec suppression forcée:', data, '- Plannings futurs supprimés:', futurePlanning.length);
      } else {
        console.log('✅ Employé logistique supprimé avec succès:', data);
      }
      
      return { 
        data, 
        error: null,
        deletedFuturePlanning: forceDelete ? futurePlanning?.length || 0 : 0
      };

    } catch (error) {
      console.error('💥 Erreur critique suppression employé:', error);
      return { data: null, error };
    }
  },

  /**
   * Créer un nouvel employé logistique
   */
  async createEmployeeLogistique(employeeData) {
    try {
      console.log('➕ Création nouvel employé logistique:', employeeData);

      // 1. Vérifier si le nom existe déjà
      const { data: existingEmployee, error: checkError } = await supabase
        .from('employes_logistique_new')
        .select('id, nom')
        .ilike('nom', employeeData.nom.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = pas trouvé, OK
        console.error('❌ Erreur vérification nom existant:', checkError);
        return { data: null, error: checkError };
      }

      if (existingEmployee) {
        return { 
          data: null, 
          error: { 
            message: `Un employé nommé "${existingEmployee.nom}" existe déjà`,
            code: 'EMPLOYEE_NAME_EXISTS'
          }
        };
      }

      // 2. Créer l'employé
      const { data: newEmployee, error: createError } = await supabase
        .from('employes_logistique_new')
        .insert([{
          nom: employeeData.nom.trim(),
          profil: employeeData.profil || 'Moyen',
          permis: employeeData.permis || false,
          langues: employeeData.langues || [],
          notes: employeeData.notes || '',
          actif: true,
          // Horaires par défaut
          lundi_debut: employeeData.lundi_debut || '08:00',
          lundi_fin: employeeData.lundi_fin || '16:00',
          mardi_debut: employeeData.mardi_debut || '08:00',
          mardi_fin: employeeData.mardi_fin || '16:00',
          mercredi_debut: employeeData.mercredi_debut || '08:00',
          mercredi_fin: employeeData.mercredi_fin || '16:00',
          jeudi_debut: employeeData.jeudi_debut || '08:00',
          jeudi_fin: employeeData.jeudi_fin || '16:00',
          vendredi_debut: employeeData.vendredi_debut || '08:00',
          vendredi_fin: employeeData.vendredi_fin || '16:00'
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Erreur création employé:', createError);
        return { data: null, error: createError };
      }

      // 3. Créer les compétences véhicules par défaut si fournies
      if (employeeData.competencesVehicules && employeeData.competencesVehicules.length > 0) {
        const competencesToInsert = employeeData.competencesVehicules
          .filter(comp => comp.niveau && comp.niveau !== 'Aucune')
          .map(comp => ({
            employee_id: newEmployee.id,
            vehicule_id: comp.vehicule_id,
            niveau: comp.niveau
          }));

        if (competencesToInsert.length > 0) {
          const { error: competencesError } = await supabase
            .from('competences_vehicules')
            .insert(competencesToInsert);

          if (competencesError) {
            console.error('❌ Erreur création compétences:', competencesError);
            // Ne pas faire échouer la création pour les compétences
          } else {
            console.log('✅ Compétences véhicules créées');
          }
        }
      }

      console.log('✅ Employé logistique créé avec succès');
      return { data: newEmployee, error: null };

    } catch (error) {
      console.error('💥 Erreur critique création employé:', error);
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
      
      if (niveau && niveau !== '' && niveau !== 'Aucune') {
        // Créer ou mettre à jour la compétence
        
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
        // Supprimer la compétence (niveau vide, null ou 'Aucune')
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
        const dateStr = date.toISOString().split('T')[0];
        weekDates.push(dateStr);
      }
      
      console.log('📅 Chargement planning pour:', weekDates);
      
      const { data, error } = await supabase
        .from('planning_logistique_new')
        .select(`
          *,
          employe:employes_logistique_new(id, nom, profil, permis, langues),
          vehicule:vehicules_logistique(id, nom, capacite, couleur)
        `)
        .in('date', weekDates)
        .order('date')
        .order('creneau');
      
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
          heure_debut,
          heure_fin,
          employes_logistique_new (
            id,
            nom,
            profil
          )
        `)
        .gte('date_fin', dateDebut)     // Absence finit après le début de la période
        .lte('date_debut', dateFin)     // Absence commence avant la fin de la période
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
        heure_debut: item.heure_debut,
        heure_fin: item.heure_fin,
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
  },

  /**
   * Récupérer le planning d'une semaine
   */
  async getPlanningByWeek(startDate) {
    try {
      const weekDates = this._generateWeekDates(startDate);
      const startDateStr = weekDates[0];
      const endDateStr = weekDates[weekDates.length - 1];

      const { data, error } = await supabase
        .from('planning_logistique_new')
        .select(`
          *,
          employes_logistique_new (
            nom,
            profil,
            permis
          ),
          vehicules_logistique (
            nom,
            capacite
          )
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date')
        .order('creneau');

      if (error) throw error;

      console.log('✅ Planning semaine chargé:', data?.length || 0, 'entrées');
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('❌ Erreur getPlanningByWeek:', error);
      return { data: [], error };
    }
  },

  /**
   * Supprimer le planning d'un jour donné
   */
  async clearDayPlanning(date) {
    try {
      const { data, error } = await supabase
        .from('planning_logistique_new')
        .delete()
        .eq('date', date);

      if (error) throw error;

      console.log(`✅ Planning supprimé pour ${date}`);
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ Erreur clearDayPlanning:', error);
      return { data: null, error };
    }
  },

  // ==================== GÉNÉRATEUR AUTOMATIQUE DE PLANNING ====================

  /**
   * ✅ GÉNÉRATEUR AUTOMATIQUE DE PLANNING - VERSION REFACTORISÉE
   * Utilise le nouveau moteur de planning modulaire
   */
  async generateWeeklyPlanning(startDate, options = {}) {
    const { replaceExisting = true, fillGapsOnly = false } = options;

    console.log('🚀 GÉNÉRATION PLANNING - Démarrage (version refactorisée)', {
      startDate,
      replaceExisting,
      fillGapsOnly
    });

    try {
      // 1. Charger toutes les données nécessaires
      const [employeesRes, vehiculesRes, competencesRes, existingPlanningRes, absencesRes] = await Promise.all([
        this.getEmployeesLogistique(),
        this.getVehicules(),
        this.getCompetencesVehicules(),
        this.getPlanningByWeek(startDate),
        this.getAbsencesLogistique(startDate, this._addDays(startDate, 6))
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (vehiculesRes.error) throw vehiculesRes.error;
      if (competencesRes.error) throw competencesRes.error;
      if (absencesRes.error) throw absencesRes.error;

      const employees = employeesRes.data;
      const vehicules = vehiculesRes.data.filter(v => v.actif);
      const competences = competencesRes.data;
      const existingPlanning = existingPlanningRes.data || [];
      const absences = absencesRes.data || [];

      console.log('📊 Données chargées:', {
        employees: employees.length,
        vehicules: vehicules.length,
        competences: competences.length,
        existingPlanning: existingPlanning.length,
        absences: absences.length
      });

      // 2. Importer et utiliser le nouveau moteur de planning
      const { generateWeeklyPlanning } = await import('./logistique/planning-engine/index.js');
      
      // 3. Générer le planning avec le moteur refactorisé
      const result = await generateWeeklyPlanning(
        startDate, 
        employees, 
        vehicules, 
        competences, 
        absences, 
        options
      );

      if (!result.success) {
        throw new Error('Échec de génération du planning');
      }

      console.log('✅ Planning généré avec succès:', result.summary);

      // 4. Sauvegarder le planning généré
      if (replaceExisting) {
        await this._clearWeekPlanning(startDate);
      }

      const saveResult = await this._savePlanningEntries(
        result.planningEntries, 
        fillGapsOnly ? existingPlanning : []
      );
      
      if (saveResult.error) throw saveResult.error;

      console.log('💾 Planning sauvegardé avec succès');

      return {
        success: true,
        data: {
          entriesCreated: result.planningEntries.length,
          validation: result.validation,
          summary: result.summary
        }
      };

    } catch (error) {
      console.error('❌ ERREUR GÉNÉRATION PLANNING:', error);
      return {
        success: false,
        error: {
          message: error.message,
          details: error.stack
        }
      };
    }
  },

  /**
   * Générer le planning pour un jour et un créneau
   */
  async _generateDayPlanning(availableEmployees, vehicles, competences, date, creneau, dayName, rotationState, existingPlanning, morningPlanning = null) {
    const planning = [];
    const employeesUsed = new Set();

    // ✅ NOUVEAU : Sauvegarder les employés pour les vérifications de conflit
    this.lastAvailableEmployees = availableEmployees;

    // Mettre à jour les compétences dans rotationState
    rotationState.competences = competences;

    // Si après-midi et qu'on a le planning matin, on garde les mêmes équipes
    if (creneau === 'apres-midi' && morningPlanning) {
      return this._adaptMorningToAfternoon(morningPlanning, date, availableEmployees, dayName);
    }

    // Trier les véhicules par priorité
    const sortedVehicles = this._sortVehiclesByPriority(vehicles, dayName);

    for (const vehicle of sortedVehicles) {
      // Vérifier si le planning existe déjà pour ce véhicule/date/créneau
      const existingEntry = existingPlanning.find(p => 
        p.vehicule_id === vehicle.id && 
        p.date === date && 
        p.creneau === creneau
      );

      if (existingEntry) {
        console.log(`⏭️ Planning existant trouvé pour ${vehicle.nom} ${date} ${creneau}`);
        continue;
      }

      // Appliquer les contraintes spéciales avec gestion des conflits
      const teamMembers = this._assignTeamToVehicle(
        vehicle, 
        availableEmployees, 
        competences, 
        employeesUsed, 
        creneau, 
        dayName, 
        rotationState
      );

      // Ajouter les membres de l'équipe au planning
      teamMembers.forEach(member => {
        planning.push({
          employee_id: member.employee_id,
          vehicule_id: vehicle.id,
          date: date,
          creneau: creneau,
          role: member.role,
          notes: member.notes || null
        });
        employeesUsed.add(member.employee_id);
      });
    }

    return planning;
  },

  /**
   * Assigner une équipe à un véhicule selon les règles métier
   */
  _assignTeamToVehicle(vehicle, availableEmployees, competences, employeesUsed, creneau, dayName, rotationState) {
    const team = [];
    const minTeamSize = 2;
    const maxTeamSize = vehicle.capacite;

    // Contraintes spéciales par véhicule
    if (vehicle.nom === 'Transit') {
      return this._assignTransitTeam(availableEmployees, employeesUsed, creneau, dayName);
    }

    if (vehicle.nom === 'Caddy') {
      // Caddy avec Elton (matin et après-midi, simplification)
      return this._assignCaddyTeam(availableEmployees, employeesUsed);
    }

    // ✅ NOUVELLES RÈGLES SPÉCIALES : Margot (Crafter 21) et Martial (Ducato)
    // CONTRAINTE : Ils ne peuvent pas être avec Jack ou Didier
    const jackPresent = availableEmployees.some(emp => emp.nom === 'Jack');
    const conflictGroup = ['Margot', 'Jack', 'Martial', 'Didier'];
    
    // ✅ RÈGLE MARGOT : Normalement Crafter 21, mais vérifier les conflits
    if (vehicle.nom === 'Crafter 21') {
      const margot = availableEmployees.find(emp => emp.nom === 'Margot');
      
      if (margot && !employeesUsed.has(margot.id)) {
        // Vérifier qu'aucun membre conflictuel n'est déjà dans l'équipe
        if (!this._hasConflict(team, 'Margot')) {
          console.log(`🚐 CRAFTER 21: Assignation prioritaire de Margot (pas de conflit)`);
          
          // Forcer Margot comme conducteur si elle a le permis, sinon équipier
          team.push({
            employee_id: margot.id,
            role: margot.permis ? 'Conducteur' : 'Équipier',
            notes: `Assignation prioritaire Crafter 21 - Margot (${margot.profil})`
          });
          employeesUsed.add(margot.id);
        } else {
          console.log(`🚐 CRAFTER 21: Margot ne peut pas être assignée (conflit détecté)`);
        }
      }
    }
    
    // ✅ RÈGLE MARTIAL : Normalement Ducato, mais vérifier les conflits  
    if (vehicle.nom === 'Ducato') {
      const martial = availableEmployees.find(emp => emp.nom === 'Martial');
      
      if (martial && !employeesUsed.has(martial.id)) {
        // Vérifier qu'aucun membre conflictuel n'est déjà dans l'équipe
        if (!this._hasConflict(team, 'Martial')) {
          console.log(`🚛 DUCATO: Assignation prioritaire de Martial (pas de conflit)`);
          
          // Forcer Martial comme conducteur si il a le permis, sinon équipier
          team.push({
            employee_id: martial.id,
            role: martial.permis ? 'Conducteur' : 'Équipier',
            notes: `Assignation prioritaire Ducato - Martial (${martial.profil})`
          });
          employeesUsed.add(martial.id);
        } else {
          console.log(`🚛 DUCATO: Martial ne peut pas être assigné (conflit détecté)`);
        }
      }
    }

    // Récupérer les employés compétents pour ce véhicule
    const competentEmployees = this._getCompetentEmployees(vehicle.id, availableEmployees, competences, employeesUsed);
    
    if (competentEmployees.length === 0) {
      console.warn(`⚠️ Aucun employé compétent disponible pour ${vehicle.nom}`);
      return [];
    }

    // 1. Assigner le conducteur (priorité + permis + autonome + rotation)
    const driver = this._selectDriver(competentEmployees, rotationState, vehicle.nom);
    if (driver) {
      team.push({
        employee_id: driver.id,
        role: 'Conducteur',
        notes: `Conducteur désigné (${driver.profil})`
      });
      employeesUsed.add(driver.id);
    }

    // 2. Compléter l'équipe avec équipiers/assistants
    const remainingSlots = Math.min(maxTeamSize - team.length, 5); // Max 5 en plus du conducteur
    const remainingEmployees = competentEmployees.filter(emp => !employeesUsed.has(emp.id));

    for (let i = 0; i < remainingSlots && remainingEmployees.length > 0; i++) {
      const member = this._selectTeamMember(remainingEmployees, competences, vehicle.id);
      if (member) {
        // ✅ NOUVEAU : Vérifier les conflits avant d'ajouter
        if (!this._hasConflict(team, member.nom)) {
          team.push({
            employee_id: member.id,
            role: i === 0 ? 'Équipier' : 'Assistant',
            notes: this._generateMemberNotes(member, competences, vehicle.id)
          });
          employeesUsed.add(member.id);
          console.log(`✅ ${vehicle.nom}: ${member.nom} ajouté (pas de conflit)`);
        } else {
          console.log(`⚠️ ${vehicle.nom}: ${member.nom} ignoré (conflit détecté)`);
        }
        
        // Retirer de la liste disponible dans tous les cas
        const index = remainingEmployees.findIndex(e => e.id === member.id);
        if (index > -1) remainingEmployees.splice(index, 1);
      }
    }

    // S'assurer qu'on a au moins 2 personnes
    if (team.length < minTeamSize) {
      console.warn(`⚠️ Équipe incomplète pour ${vehicle.nom}: ${team.length}/${minTeamSize} personnes`);
    }

    return team;
  },

  /**
   * ✅ NOUVEAU : Vérifier les conflits entre employés
   * Margot, Jack, Martial et Didier ne peuvent pas être ensemble
   */
  _hasConflict(teamMembers, newEmployeeName) {
    const conflictGroup = ['Margot', 'Jack', 'Martial', 'Didier'];
    
    // Si le nouvel employé n'est pas dans le groupe conflictuel, pas de problème
    if (!conflictGroup.includes(newEmployeeName)) {
      return false;
    }
    
    // Compter combien de membres du groupe conflictuel sont déjà dans l'équipe
    const existingConflictMembers = teamMembers.filter(member => {
      const employee = this.lastAvailableEmployees?.find(emp => emp.id === member.employee_id);
      return employee && conflictGroup.includes(employee.nom);
    });
    
    // Si il y a déjà quelqu'un du groupe, c'est un conflit
    if (existingConflictMembers.length > 0) {
      console.log(`⚠️ CONFLIT DÉTECTÉ: ${newEmployeeName} ne peut pas rejoindre l'équipe (déjà ${existingConflictMembers.length} membre(s) conflictuel(s))`);
      return true;
    }
    
    return false;
  },

  /**
   * ✅ NOUVEAU : Trouver le meilleur véhicule pour un employé conflictuel
   */
  _findBestVehicleForConflictEmployee(employeeName, vehicles, currentAssignments, availableEmployees) {
    const conflictGroup = ['Margot', 'Jack', 'Martial', 'Didier'];
    
    for (const vehicle of vehicles) {
      const currentTeam = currentAssignments[vehicle.nom] || [];
      
      // Vérifier si ce véhicule a déjà des membres conflictuels
      const hasConflictMember = currentTeam.some(member => {
        const employee = availableEmployees.find(emp => emp.id === member.employee_id);
        return employee && conflictGroup.includes(employee.nom);
      });
      
      // Si pas de conflit et il reste de la place
      if (!hasConflictMember && currentTeam.length < vehicle.capacite) {
        console.log(`✅ Véhicule libre trouvé pour ${employeeName}: ${vehicle.nom}`);
        return vehicle;
      }
    }
    
    console.warn(`⚠️ Aucun véhicule libre trouvé pour ${employeeName}`);
    return null;
  },

  /**
   * ✅ NOUVELLES RÈGLES TRANSIT COMPLEXES
   * Cascade : Jack → Didier(lundi)/Margot/Martial selon disponibilité
   */
  _assignTransitTeam(availableEmployees, employeesUsed, creneau, dayName) {
    const team = [];
    const isLundi = dayName === 'lundi';
    const conflictGroup = ['Margot', 'Jack', 'Martial', 'Didier'];

    console.log('🚗 TRANSIT ASSIGNMENT - Employés disponibles:', availableEmployees.map(e => e.nom));
    console.log('🚗 TRANSIT ASSIGNMENT - Jour:', dayName);

    // ✅ STRATÉGIE RÉVISÉE : 1 seul membre du groupe conflictuel par véhicule
    
    // PRIORITÉ 1 : Jack si disponible
    const jack = availableEmployees.find(emp => emp.nom === 'Jack' && !employeesUsed.has(emp.id));
    let conflictMemberAssigned = false;
    
    if (jack) {
      if (employeesUsed.has(jack.id)) {
        console.log(`⚠️ TRANSIT OVERRIDE: Récupération de Jack depuis un autre véhicule`);
        employeesUsed.delete(jack.id);
      }
      
      team.push({
        employee_id: jack.id,
        role: jack.permis ? 'Conducteur' : 'Équipier',
        notes: `Membre prioritaire Transit - Jack (${jack.profil})`
      });
      employeesUsed.add(jack.id);
      conflictMemberAssigned = true;
      console.log(`✅ TRANSIT: Jack assigné (groupe conflictuel)`);
    }
    
    // PRIORITÉ 2 : Si Jack absent, alors Didier le lundi, sinon Margot, sinon Martial
    if (!conflictMemberAssigned) {
      let replacementFound = false;
      
      // Lundi : essayer Didier d'abord
      if (isLundi) {
        const didier = availableEmployees.find(emp => emp.nom === 'Didier' && !employeesUsed.has(emp.id));
        if (didier) {
          team.push({
            employee_id: didier.id,
            role: didier.permis ? 'Conducteur' : 'Équipier',
            notes: `Remplacement Jack - Didier lundi (${didier.profil})`
          });
          employeesUsed.add(didier.id);
          conflictMemberAssigned = true;
          replacementFound = true;
          console.log(`✅ TRANSIT LUNDI: Didier remplace Jack`);
        }
      }
      
      // Si pas trouvé, essayer Margot
      if (!replacementFound) {
        const margot = availableEmployees.find(emp => emp.nom === 'Margot' && !employeesUsed.has(emp.id));
        if (margot) {
          team.push({
            employee_id: margot.id,
            role: margot.permis ? 'Conducteur' : 'Équipier',
            notes: `Remplacement Jack - Margot (${margot.profil})`
          });
          employeesUsed.add(margot.id);
          conflictMemberAssigned = true;
          replacementFound = true;
          console.log(`✅ TRANSIT: Margot remplace Jack`);
        }
      }
      
      // Dernier recours : Martial
      if (!replacementFound) {
        const martial = availableEmployees.find(emp => emp.nom === 'Martial' && !employeesUsed.has(emp.id));
        if (martial) {
          team.push({
            employee_id: martial.id,
            role: martial.permis ? 'Conducteur' : 'Équipier',
            notes: `Remplacement Jack - Martial (${martial.profil})`
          });
          employeesUsed.add(martial.id);
          conflictMemberAssigned = true;
          console.log(`✅ TRANSIT: Martial remplace Jack`);
        }
      }
    }

    // ✅ COMPLÉTER AVEC LES ANCIENS MEMBRES (Hassene, Mejrema, Tamara) - PAS de conflit
    const anciensMembres = ['Hassene', 'Mejrema', 'Tamara'];
    anciensMembres.forEach(name => {
      const employee = availableEmployees.find(emp => emp.nom === name && !employeesUsed.has(emp.id));
      
      if (employee && team.length < 4) {
        team.push({
          employee_id: employee.id,
          role: employee.permis && team.filter(t => t.role === 'Conducteur').length === 0 ? 'Conducteur' : 'Équipier',
          notes: `Ancien membre Transit - ${name} (${employee.profil})`
        });
        employeesUsed.add(employee.id);
        console.log(`✅ TRANSIT: ${name} ajouté (pas de conflit)`);
      }
    });

    // ✅ COMPLÉTER avec d'autres employés NON-conflictuels
    const otherEmployees = availableEmployees.filter(emp => 
      !employeesUsed.has(emp.id) && 
      !conflictGroup.includes(emp.nom) &&
      !anciensMembres.includes(emp.nom)
    );
    
    for (const employee of otherEmployees) {
      if (team.length >= 4) break; // Limite raisonnable
      
      team.push({
        employee_id: employee.id,
        role: employee.permis && team.filter(t => t.role === 'Conducteur').length === 0 ? 'Conducteur' : 'Équipier',
        notes: `Équipier Transit - ${employee.nom} (${employee.profil})`
      });
      employeesUsed.add(employee.id);
      console.log(`✅ TRANSIT: ${employee.nom} ajouté (complément)`);
    }

    // ✅ S'assurer qu'il y a au moins un conducteur
    const hasDriver = team.some(member => member.role === 'Conducteur');
    
    if (!hasDriver && team.length > 0) {
      // Chercher un membre avec permis et le promouvoir conducteur
      const driverCandidate = team.find(member => {
        const employee = availableEmployees.find(emp => emp.id === member.employee_id);
        return employee && employee.permis;
      });
      
      if (driverCandidate) {
        driverCandidate.role = 'Conducteur';
        console.log(`✅ TRANSIT: Promotion conducteur pour membre existant`);
      } else {
        // Ajouter un conducteur externe si nécessaire
        const externalDriver = availableEmployees.find(emp => 
          emp.permis && !employeesUsed.has(emp.id)
        );
        
        if (externalDriver) {
          team.push({
            employee_id: externalDriver.id,
            role: 'Conducteur',
            notes: `Conducteur ajouté Transit (${externalDriver.profil})`
          });
          employeesUsed.add(externalDriver.id);
          console.log(`✅ TRANSIT: Conducteur externe ajouté - ${externalDriver.nom}`);
        }
      }
    }

    console.log('🚗 TRANSIT FINAL TEAM:', team.length, 'membres (sans conflit)');
    return team;
  },

  /**
   * Équipe spéciale pour Caddy (Elton toujours, pas de rôles spécifiques)
   */
  _assignCaddyTeam(availableEmployees, employeesUsed) {
    const team = [];
    
    // Elton est toujours là l'après-midi
    const elton = availableEmployees.find(emp => 
      emp.nom === 'Elton' && !employeesUsed.has(emp.id)
    );
    
    if (elton) {
      team.push({
        employee_id: elton.id,
        role: 'Équipier',
        notes: 'Membre fixe Caddy après-midi'
      });
      employeesUsed.add(elton.id);
    }

    // Compléter avec d'autres employés disponibles (pas de rôle spécial conducteur)
    const remainingEmployees = availableEmployees.filter(emp => !employeesUsed.has(emp.id));
    
    // RÉDUCTION: Maximum 2-3 personnes en plus d'Elton (au lieu de 5)
    for (let i = 0; i < 2 && remainingEmployees.length > 0; i++) {
      const member = remainingEmployees.shift();
      team.push({
        employee_id: member.id,
        role: 'Équipier', // Tout le monde en équipier sur le Caddy
        notes: `Équipier Caddy (${member.profil})`
      });
      employeesUsed.add(member.id);
    }

    console.log('🚛 CADDY FINAL TEAM:', team.length, 'membres (réduit pour équilibrer)');
    return team;
  },

  /**
   * Sélectionner le conducteur selon la rotation et les priorités
   */
  _selectDriver(competentEmployees, rotationState, vehicleName) {
    // Filtrer les employés avec permis et niveau XX (autonome)
    const driverCandidates = competentEmployees.filter(emp => 
      emp.permis && 
      this._isAutonomous(emp.id, competentEmployees, rotationState.competences)
    );

    if (driverCandidates.length === 0) {
      console.warn(`⚠️ Aucun conducteur autonome disponible pour ${vehicleName}`);
      return null;
    }

    // Priorité : Fort > Moyen > Faible
    driverCandidates.sort((a, b) => {
      const priorityOrder = { 'Fort': 3, 'Moyen': 2, 'Faible': 1 };
      return priorityOrder[b.profil] - priorityOrder[a.profil];
    });

    // Appliquer la rotation si disponible
    const rotationDriver = rotationState.currentDrivers[vehicleName];
    if (rotationDriver && driverCandidates.find(c => c.id === rotationDriver)) {
      return driverCandidates.find(c => c.id === rotationDriver);
    }

    // Sinon prendre le premier selon la priorité
    return driverCandidates[0];
  },

  /**
   * Sélectionner un membre d'équipe (équipier/assistant)
   */
  _selectTeamMember(availableEmployees, competences, vehicleId) {
    if (availableEmployees.length === 0) return null;

    // Prioriser le mix profils et mentoring
    const sorted = [...availableEmployees].sort((a, b) => {
      // Priorité 1: Mix profils (éviter trop de même niveau)
      // Priorité 2: Formation avec autonome (mentoring)
      const aLevel = this._getCompetenceLevel(a.id, vehicleId, competences);
      const bLevel = this._getCompetenceLevel(b.id, vehicleId, competences);
      
      if (aLevel === 'en formation' && bLevel === 'XX') return 1; // Priorité au mentoring
      if (aLevel === 'XX' && bLevel === 'en formation') return -1;
      
      // Sinon priorité profil
      const priorityOrder = { 'Fort': 3, 'Moyen': 2, 'Faible': 1 };
      return priorityOrder[b.profil] - priorityOrder[a.profil];
    });

    return sorted[0];
  },

  /**
   * Fonctions utilitaires
   */
  _generateWeekDates(startDate) {
    const dates = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 5; i++) { // Lundi à Vendredi
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
    }
    
    return dates;
  },

  _getDayName(date) {
    const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const day = new Date(date).getDay();
    return dayNames[day];
  },

  _getAvailableEmployees(employees, absences, date) {
    // Déterminer le jour de la semaine
    const dayOfWeek = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
    
    const absentEmployeeIds = absences
      .filter(absence => date >= absence.date_debut && date <= absence.date_fin)
      .map(absence => absence.employee_id);

    const availableEmployees = employees.filter(emp => {
      // 1. Employé doit être actif
      if (!emp.actif) return false;
      
      // 2. Employé ne doit pas être absent
      if (absentEmployeeIds.includes(emp.id)) return false;
      
      // 3. ✅ NOUVEAU : Vérifier les horaires personnalisés par jour
      const debutField = `${dayOfWeek}_debut`;
      const finField = `${dayOfWeek}_fin`;
      
      // Si l'employé n'a pas d'horaires définis pour ce jour, il n'est pas disponible
      if (!emp[debutField] || !emp[finField]) {
        console.log(`⏰ ${emp.nom} non disponible ${dayOfWeek} (pas d'horaires définis)`);
        return false;
      }
      
      return true;
    });
    
    console.log(`📅 ${dayOfWeek.toUpperCase()} ${date}: ${availableEmployees.length} employés disponibles:`, 
                availableEmployees.map(e => e.nom));
    
    return availableEmployees;
  },

  /**
   * ✅ NOUVEAU : Vérifier si le service est fermé pour une date donnée
   */
  _isServiceClosed(absences, date) {
    const fermeture = absences.find(absence => {
      return absence.type_absence === 'Fermeture' &&
             absence.employee_id === null && // Global closure
             date >= absence.date_debut && 
             date <= absence.date_fin;
    });
    
    if (fermeture) {
      console.log(`🚫 SERVICE FERMÉ le ${date}: ${fermeture.motif}`);
      return { isClosed: true, reason: fermeture.motif };
    }
    
    return { isClosed: false };
  },

  _getPriorityVehicles(vehicles, dayName) {
    // Ducato prioritaire jeudi PM et vendredi AM
    const ducatoPriority = ['jeudi', 'vendredi'].includes(dayName);
    
    return vehicles.sort((a, b) => {
      if (a.nom === 'Ducato' && ducatoPriority) return -1;
      if (b.nom === 'Ducato' && ducatoPriority) return 1;
      if (a.nom === 'Ducato' && !ducatoPriority) return 1;
      if (b.nom === 'Ducato' && !ducatoPriority) return -1;
      return 0;
    });
  },

  _initializeRotationState(weekDates) {
    return {
      currentDrivers: {}, // vehicleName -> employeeId
      rotationHistory: [],
      competences: [] // sera rempli avec les compétences lors de l'utilisation
    };
  },

  _rotateDrivers(rotationState, availableEmployees) {
    // Logique de rotation tous les 2 jours
    // Réinitialiser les conducteurs actuels pour forcer une nouvelle sélection
    console.log('🔄 Rotation des conducteurs activée - Réinitialisation des assignations');
    
    // Vider les conducteurs actuels pour permettre une nouvelle sélection
    Object.keys(rotationState.currentDrivers).forEach(vehicleName => {
      const previousDriver = rotationState.currentDrivers[vehicleName];
      if (previousDriver) {
        console.log(`🔄 Rotation: ${vehicleName} - Libération du conducteur précédent (ID: ${previousDriver})`);
        // Ajouter à l'historique pour éviter de le reprendre immédiatement
        rotationState.rotationHistory.push({
          vehicleName,
          driverId: previousDriver,
          rotatedAt: new Date().toISOString()
        });
      }
    });
    
    // Réinitialiser pour la nouvelle rotation
    rotationState.currentDrivers = {};
  },

  _getCompetentEmployees(vehicleId, employees, competences, employeesUsed) {
    return employees.filter(emp => {
      if (employeesUsed.has(emp.id)) return false;
      
      const competence = competences.find(c => 
        c.employee_id === emp.id && c.vehicule_id === vehicleId
      );
      
      return competence && ['en formation', 'XX'].includes(competence.niveau);
    });
  },

  _isAutonomous(employeeId, employees, competences) {
    // Vérifier si l'employé a le niveau XX sur au moins un véhicule
    const autonomousCompetence = competences.find(c => 
      c.employee_id === employeeId && c.niveau === 'XX'
    );
    return !!autonomousCompetence;
  },

  _getCompetenceLevel(employeeId, vehicleId, competences) {
    const competence = competences.find(c => 
      c.employee_id === employeeId && c.vehicule_id === vehicleId
    );
    return competence?.niveau || 'aucune';
  },

  _sortVehiclesByPriority(vehicles, dayName) {
    return [...vehicles].sort((a, b) => {
      // ORDRE CORRECT: Ducato/Crafter/Jumper → Transit → Caddy
      
      // 1. Ducato en fonction du jour (priorité spéciale jeudi/vendredi)
      const ducatoPriority = ['jeudi', 'vendredi'].includes(dayName);
      if (a.nom === 'Ducato' && ducatoPriority) return -1;
      if (b.nom === 'Ducato' && ducatoPriority) return 1;
      
      // 2. Caddy en dernier (moins prioritaire)
      if (a.nom === 'Caddy') return 1;
      if (b.nom === 'Caddy') return -1;
      
      // 3. Transit avant Caddy mais après les autres véhicules
      if (a.nom === 'Transit' && b.nom === 'Caddy') return -1;
      if (b.nom === 'Transit' && a.nom === 'Caddy') return 1;
      if (a.nom === 'Transit') return 1;
      if (b.nom === 'Transit') return -1;
      
      // 4. Ducato en temps normal (moins prioritaire si pas jeudi/vendredi)
      if (a.nom === 'Ducato' && !ducatoPriority) return 1;
      if (b.nom === 'Ducato' && !ducatoPriority) return -1;
      
      // 5. Autres véhicules (Crafter, Jumper) en premier
      return 0;
    });
  },

  _adaptMorningToAfternoon(morningPlanning, date, availableEmployees, dayName) {
    const afternoonPlanning = [];
    
    morningPlanning.forEach(entry => {
      // Pour le Caddy, utiliser la logique spéciale avec Elton
      const vehicle = availableEmployees.find(emp => emp.id === entry.employee_id);
      
      // Garder la même équipe pour l'après-midi (simplification)
      afternoonPlanning.push({
        ...entry,
        creneau: 'apres-midi'
      });
    });
    
    return afternoonPlanning;
  },

  _generateMemberNotes(employee, competences, vehicleId) {
    const competence = competences.find(c => 
      c.employee_id === employee.id && c.vehicule_id === vehicleId
    );
    
    const level = competence?.niveau || 'aucune';
    return `${employee.profil} - ${level === 'en formation' ? 'En formation' : 'Autonome'}`;
  },

  async _clearWeekPlanning(startDate) {
    const weekDates = this._generateWeekDates(startDate);
    
    const { data, error } = await supabase
      .from('planning_logistique_new')
      .delete()
      .in('date', weekDates);

    return { data, error };
  },

  async _savePlanningEntries(planningEntries, existingPlanning = []) {
    if (planningEntries.length === 0) {
      return { data: [], error: null };
    }

    // Filtrer les entrées qui existent déjà
    const newEntries = planningEntries.filter(entry => {
      return !existingPlanning.some(existing => 
        existing.employee_id === entry.employee_id &&
        existing.vehicule_id === entry.vehicule_id &&
        existing.date === entry.date &&
        existing.creneau === entry.creneau
      );
    });

    if (newEntries.length === 0) {
      console.log('Aucune nouvelle entrée à sauvegarder');
      return { data: [], error: null };
    }

    console.log(`💾 Sauvegarde de ${newEntries.length} nouvelles entrées`);

    const { data, error } = await supabase
      .from('planning_logistique_new')
      .insert(newEntries);

    if (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return { data: null, error };
    }

    console.log('✅ Sauvegarde réussie');
    return { data, error: null };
  },

  _generatePlaningSummary(planningEntries) {
    const summary = {
      totalAssignments: planningEntries.length,
      daysGenerated: [...new Set(planningEntries.map(e => e.date))].length,
      vehiclesUsed: [...new Set(planningEntries.map(e => e.vehicule_id))].length,
      employeesAssigned: [...new Set(planningEntries.map(e => e.employee_id))].length,
      roleDistribution: {
        conducteurs: planningEntries.filter(e => e.role === 'Conducteur').length,
        equipiers: planningEntries.filter(e => e.role === 'Équipier').length,
        assistants: planningEntries.filter(e => e.role === 'Assistant').length
      }
    };
    
    return summary;
  },

  /**
   * Vérifier les plannings futurs pour un employé (utilisé pour la suppression)
   */
  async checkFuturePlannings(employeeId) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('planning_logistique_new')
      .select('date, creneau')
      .eq('employee_id', employeeId)
      .gte('date', today)
      .order('date');

    if (error) {
      console.error('Erreur lors de la vérification des plannings futurs:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  /**
   * Utilitaire pour ajouter des jours à une date
   */
  _addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  },

};

export default supabaseLogistique; 