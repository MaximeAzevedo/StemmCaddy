/**
 * 🗄️ SUPABASE LOGISTIQUE - VERSION NETTOYÉE
 * Interface simplifiée pour les opérations logistique, le générateur complexe a été refactorisé
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export const supabaseLogistique = {
  
  // ================================
  // 👥 GESTION DES EMPLOYÉS
  // ================================

  async getEmployeesLogistique() {
    try {
      const { data, error } = await supabase
        .from('employes_logistique_new')
        .select('*')
        .order('nom');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération employés:', error);
      return { data: null, error };
    }
  },

  async updateEmployeeLogistique(id, updates) {
    try {
      const { data, error } = await supabase
        .from('employes_logistique_new')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour employé:', error);
      return { data: null, error };
    }
  },

  async deleteEmployeeLogistique(employeeId, forceDelete = false) {
    try {
      console.log('🗑️ Suppression employé ID:', employeeId, forceDelete ? '(FORCÉE)' : '');

      if (!forceDelete) {
        const futurePlannings = await this.checkFuturePlannings(employeeId);
        if (futurePlannings.error) throw futurePlannings.error;
        
        if (futurePlannings.data && futurePlannings.data.length > 0) {
          return {
            success: false,
            error: {
              code: 'FUTURE_PLANNING_EXISTS',
              message: `L'employé a des plannings futurs (${futurePlannings.data.length} assignations)`,
              futureAssignments: futurePlannings.data
            }
          };
        }
      }

      // Supprimer les absences de l'employé
      await supabase
        .from('absences_logistique_new')
        .delete()
        .eq('employee_id', employeeId);

      // Supprimer l'employé
      const { error } = await supabase
        .from('employes_logistique_new')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Erreur suppression employé:', error);
      return { success: false, error };
    }
  },

  async createEmployeeLogistique(employeeData) {
    try {
      const { data: existingEmployee } = await supabase
        .from('employes_logistique_new')
        .select('nom')
        .ilike('nom', employeeData.nom.trim())
        .single();

      if (existingEmployee) {
        return {
          success: false,
          error: {
            code: 'EMPLOYEE_NAME_EXISTS',
            message: `Un employé nommé "${employeeData.nom}" existe déjà`
          }
        };
      }

      const { data: newEmployee, error: insertError } = await supabase
        .from('employes_logistique_new')
        .insert([{
          nom: employeeData.nom.trim(),
          profil: employeeData.profil || 'Moyen',
          permis: employeeData.permis || false,
          langues: employeeData.langues || [],
          notes: employeeData.notes || '',
          actif: true,
          lundi_debut: employeeData.lundi_debut || null,
          lundi_fin: employeeData.lundi_fin || null,
          mardi_debut: employeeData.mardi_debut || null,
          mardi_fin: employeeData.mardi_fin || null,
          mercredi_debut: employeeData.mercredi_debut || null,
          mercredi_fin: employeeData.mercredi_fin || null,
          jeudi_debut: employeeData.jeudi_debut || null,
          jeudi_fin: employeeData.jeudi_fin || null,
          vendredi_debut: employeeData.vendredi_debut || null,
          vendredi_fin: employeeData.vendredi_fin || null
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Créer les compétences véhicules par défaut
      if (employeeData.competencesVehicules) {
        const competencesData = employeeData.competencesVehicules.map(comp => ({
          employee_id: newEmployee.id,
          vehicule_id: comp.vehicule_id,
          niveau: comp.niveau
        }));

        const { error: competencesError } = await supabase
          .from('competences_vehicules')
          .insert(competencesData);

        if (competencesError) {
          console.warn('Erreur création compétences:', competencesError);
        }
      }

      return { success: true, data: newEmployee };
    } catch (error) {
      console.error('Erreur création employé:', error);
      return { success: false, error };
    }
  },

  // ================================
  // 🚗 GESTION DES VÉHICULES
  // ================================

  async getVehicules() {
    try {
      const { data, error } = await supabase
        .from('vehicules_logistique')
        .select('*')
        .order('nom');

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération véhicules:', error);
      return { data: null, error };
    }
  },

  async getCompetencesVehicules() {
    try {
      const { data, error } = await supabase
        .from('competences_vehicules')
        .select(`
          *,
          employes_logistique_new!inner(nom),
          vehicules_logistique!inner(nom)
        `);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération compétences:', error);
      return { data: null, error };
    }
  },

  async updateCompetenceVehicule(employeeId, vehiculeId, niveau) {
    try {
      const { data, error } = await supabase
        .from('competences_vehicules')
        .upsert({
          employee_id: employeeId,
          vehicule_id: vehiculeId,
          niveau: niveau
        })
        .select();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour compétence:', error);
      return { data: null, error };
    }
  },

  // ================================
  // 📅 GESTION DU PLANNING
  // ================================

  async savePlanningHebdomadaire(planningData, weekStart) {
    try {
      console.log('💾 Début sauvegarde planning hebdomadaire');
      console.log('📊 Structure planningData reçue:', Object.keys(planningData).length, 'jours');
      
      // ✅ Charger la liste des employés pour mapper nom → ID
      const employeesResult = await this.getEmployeesLogistique();
      const employees = employeesResult.data || [];
      const nameToIdMap = new Map();
      employees.forEach(emp => {
        nameToIdMap.set(emp.nom, emp.id);
      });
      console.log('👥 Mapping employés créé:', nameToIdMap.size, 'employés');
      
      // 🔍 DEBUG : Structure simplifiée
      console.log('🔍 Dates trouvées:', Object.keys(planningData).filter(k => k !== 'absents'));
      
      // 1. Transformer la structure complexe en tableau d'entrées
      const planningEntries = [];
      
      Object.entries(planningData).forEach(([dateKey, dayData]) => {
        // Ignorer les propriétés non-véhicules comme 'absents'
        if (dateKey === 'absents' || !dayData || typeof dayData !== 'object') {
          console.log(`🔍 Ignoré: ${dateKey} (${typeof dayData})`);
          return;
        }
        
        Object.entries(dayData).forEach(([vehicleId, employees]) => {
          // Ignorer la section 'absents' dans chaque jour
          if (vehicleId === 'absents' || !Array.isArray(employees)) {
            console.log(`🔍 Ignoré vehicle: ${vehicleId} (${typeof employees})`);
            return;
          }
          
          console.log(`🔍 Processing vehicle ${vehicleId} with ${employees.length} employees`);
          
          employees.forEach(employee => {
            // ✅ CORRECTION : Convertir nom employé → ID numérique
            const employeeName = employee.nom || employee.name || employee.id;
            let employeeId = employee.employee_id;
            
            // Si pas d'employee_id, essayer de le trouver via le nom
            if (!employeeId && employeeName) {
              employeeId = nameToIdMap.get(employeeName);
              console.log(`🔍 Mapping: "${employeeName}" → ID ${employeeId}`);
            }
            
            if (employeeId && employeeName) {
              // ✅ CORRECTION : Valeurs strictes pour respecter les contraintes CHECK
              const validCreneaux = ['matin', 'apres-midi'];
              const validRoles = ['Conducteur', 'Équipier', 'Assistant', 'conducteur', 'équipier', 'assistant'];
              
              validCreneaux.forEach(creneau => {
                // Valider et corriger le rôle (mapper minuscules vers majuscules)
                let role = employee.role || 'Équipier';
                
                // Mapping des rôles minuscules vers majuscules pour cohérence interface/DB
                const roleMapping = {
                  'conducteur': 'Conducteur',
                  'équipier': 'Équipier', 
                  'assistant': 'Assistant'
                };
                
                if (roleMapping[role]) {
                  role = roleMapping[role];
                  console.log(`🔄 Mapping rôle: "${employee.role}" → "${role}"`);
                } else if (!validRoles.includes(role)) {
                  console.warn(`⚠️ Rôle invalide "${role}", correction vers "Équipier"`);
                  role = 'Équipier';
                }
                
                const entry = {
                  employee_id: typeof employeeId === 'string' ? parseInt(employeeId) : employeeId,
                  vehicule_id: parseInt(vehicleId),
                  date: dateKey,
                  creneau: creneau, // ✅ Toujours valide ('matin' ou 'apres-midi')
                  role: role, // ✅ Toujours valide
                  notes: employee.notes || null,
                  absent: employee.absent || false
                };
                planningEntries.push(entry);
              });
            } else {
              console.log(`❌ Employee manque données:`, { 
                employeeName,
                employeeId,
                found_in_map: nameToIdMap.has(employeeName),
                original_employee: employee 
              });
            }
          });
        });
      });
      
      console.log('📝 Entrées transformées:', planningEntries.length);
      
      if (planningEntries.length === 0) {
        console.warn('⚠️ Aucune entrée à sauvegarder');
        return { data: [], error: null };
      }
      
      // 2. Sauvegarder les entrées
      const result = await this._savePlanningEntries(planningEntries, []);
      console.log('✅ Sauvegarde terminée');
      return result;
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde planning:', error);
      return { data: null, error };
    }
  },

  async loadPlanningHebdomadaire(weekStart) {
    try {
      const weekDates = this._generateWeekDates(weekStart);
      
      // 1. Récupérer les données brutes
      const { data: rawData, error } = await supabase
        .from('planning_logistique_new')
        .select(`
          *,
          employes_logistique_new!inner(nom, profil),
          vehicules_logistique!inner(nom, couleur)
        `)
        .in('date', weekDates)
        .order('date')
        .order('creneau');

      if (error) throw error;

      console.log('🔄 Planning brut chargé:', rawData?.length || 0, 'entrées');

             // 2. Transformer en format structuré pour l'interface
       // L'interface s'attend à avoir TOUS les employés d'un véhicule pour la journée entière
       const structuredData = {};
       const employeeTracker = new Map(); // Pour éviter les doublons
       
       if (rawData && rawData.length > 0) {
         rawData.forEach(entry => {
           const dateKey = entry.date;
           const vehicleId = entry.vehicule_id;
           const employeeId = entry.employee_id;
           const trackingKey = `${dateKey}_${vehicleId}_${employeeId}`;
           
           // Initialiser la date si nécessaire
           if (!structuredData[dateKey]) {
             structuredData[dateKey] = {};
           }
           
           // Initialiser le véhicule si nécessaire
           if (!structuredData[dateKey][vehicleId]) {
             structuredData[dateKey][vehicleId] = [];
           }
           
           // Éviter les doublons d'employés pour le même véhicule/jour
           if (!employeeTracker.has(trackingKey)) {
             structuredData[dateKey][vehicleId].push({
               id: entry.employes_logistique_new.nom || 'Employé',
               nom: entry.employes_logistique_new.nom,
               profil: entry.employes_logistique_new.profil,
               role: entry.role,
               creneau: 'journee', // Fusionner matin+apres-midi en "journee"
               notes: entry.notes,
               planningId: entry.id, // Pour la suppression
               employee_id: entry.employee_id, // Pour les opérations
               absent: entry.absent || false // Statut d'absence
             });
             
             employeeTracker.set(trackingKey, true);
             console.log(`👤 Ajouté: ${entry.employes_logistique_new.nom} → ${entry.vehicules_logistique.nom} le ${dateKey}`);
           }
         });

         console.log('✅ Planning structuré:', Object.keys(structuredData).length, 'jours');
         console.log('📊 Employés uniques ajoutés:', employeeTracker.size);
         
         // Afficher un aperçu pour debug
         Object.entries(structuredData).forEach(([date, vehicles]) => {
           console.log(`📅 ${date}:`);
           Object.entries(vehicles).forEach(([vehicleId, employees]) => {
             console.log(`  🚐 Véhicule ${vehicleId}: ${employees.length} employés`);
           });
         });
       }
      
      return { data: structuredData, error: null };
    } catch (error) {
      console.error('❌ Erreur chargement planning:', error);
      return { data: {}, error };
    }
  },

  async getPlanningLogistique(dateDebut = null, dateFin = null) {
    try {
      let query = supabase
        .from('planning_logistique_new')
        .select(`
          *,
          employes_logistique_new!inner(nom, profil),
          vehicules_logistique!inner(nom, couleur)
        `)
        .order('date')
        .order('creneau');

      if (dateDebut) query = query.gte('date', dateDebut);
      if (dateFin) query = query.lte('date', dateFin);

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération planning:', error);
      return { data: null, error };
    }
  },

  // ================================
  // 🚫 GESTION DES ABSENCES
  // ================================

  async getAbsencesLogistique(dateDebut = null, dateFin = null) {
    try {
      let query = supabase
        .from('absences_logistique_new')
        .select(`
          *,
          employes_logistique_new(nom)
        `)
        .order('date_debut', { ascending: false });

      if (dateDebut && dateFin) {
        query = query
          .gte('date_fin', dateDebut)
          .lte('date_debut', dateFin);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Erreur récupération absences:', error);
      return { data: null, error };
    }
  },

  async addAbsence(formData) {
    try {
      const absenceData = {
        employee_id: formData.type_absence === 'Fermeture' ? null : parseInt(formData.employee_id),
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || formData.date_debut,
        type_absence: formData.type_absence,
        motif: formData.motif || null,
        heure_debut: (formData.type_absence === 'Rendez-vous' && formData.heure_debut) ? formData.heure_debut : null,
        heure_fin: null
      };

      const { data, error } = await supabase
        .from('absences_logistique_new')
        .insert([absenceData])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur ajout absence:', error);
      return { data: null, error };
    }
  },

  async updateAbsence(absenceId, updates) {
    try {
      const { data, error } = await supabase
        .from('absences_logistique_new')
        .update(updates)
        .eq('id', absenceId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour absence:', error);
      return { data: null, error };
    }
  },

  async deleteAbsence(absenceId) {
    try {
      const { error } = await supabase
        .from('absences_logistique_new')
        .delete()
        .eq('id', absenceId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erreur suppression absence:', error);
      return { success: false, error };
    }
  },

  async getPlanningByWeek(startDate) {
    const weekDates = this._generateWeekDates(startDate);
    
    const { data, error } = await supabase
      .from('planning_logistique_new')
      .select('*')
      .in('date', weekDates);

    return { data: data || [], error };
  },

  async clearDayPlanning(date) {
    try {
      const { error } = await supabase
        .from('planning_logistique_new')
        .delete()
        .eq('date', date);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erreur suppression planning jour:', error);
      return { success: false, error };
    }
  },

  async removeEmployeeFromPlanning(employeeId, vehiculeId, date) {
    try {
      console.log('🗑️ Suppression assignation:', { employeeId, vehiculeId, date });
      
      const { error } = await supabase
        .from('planning_logistique_new')
        .delete()
        .eq('employee_id', employeeId)
        .eq('vehicule_id', vehiculeId)
        .eq('date', date);

      if (error) throw error;
      
      console.log('✅ Assignation supprimée de la base de données');
      return { success: true };
    } catch (error) {
      console.error('Erreur suppression assignation:', error);
      return { success: false, error };
    }
  },

  // ================================
  // 🤖 GÉNÉRATEUR AUTOMATIQUE REFACTORISÉ
  // ================================

  /**
   * ✅ GÉNÉRATEUR AUTOMATIQUE DE PLANNING - VERSION SIMPLIFIÉE
   * Version intégrée sans modules externes pour éviter les erreurs d'import
   */
  async generateWeeklyPlanning(startDate, options = {}) {
    const { replaceExisting = true, fillGapsOnly = false } = options;

    console.log('🚀 GÉNÉRATION PLANNING - Version simplifiée', {
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

      // 2. Utiliser le nouveau moteur refactorisé avec assistants
      console.log('🚀 Génération avec le moteur refactorisé (assistants inclus)...');
      
      // Import dynamique du nouveau moteur
      const { generateWeeklyPlanning } = await import('./logistique/planning-engine/index.js');
      
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

      // 3. Sauvegarder le planning généré
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

  // ================================
  // 🔧 FONCTIONS UTILITAIRES
  // ================================

  /**
   * Utilitaire pour ajouter des jours à une date
   */
  _addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  },

  async _clearWeekPlanning(startDate) {
    const weekDates = this._generateWeekDates(startDate);
    
    const { data, error } = await supabase
      .from('planning_logistique_new')
      .delete()
      .in('date', weekDates);

    return { data, error };
  },

  /**
   * Génère les dates d'une semaine (lundi à vendredi)
   */
  _generateWeekDates(startDate) {
    const dates = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
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
   * ✨ NOUVEAU GÉNÉRATEUR SIMPLIFIÉ V2
   * Logique claire et séquentielle pour respecter toutes les règles métier
   */
  async _generateSimplifiedPlanning(startDate, employees, vehicules, competences, absences, options = {}) {
    console.log('🎯 === GÉNÉRATEUR SIMPLIFIÉ V2 ===');
    
    const weekDates = this._generateWeekDates(startDate);
    const planningEntries = [];
    
    // 🎯 RÈGLE 1 : Définir le groupe spécial
    const GROUPE_SPECIAL = ['Jack', 'Margot', 'Martial', 'Didier'];
    const NEVER_DRIVERS = GROUPE_SPECIAL; // Même groupe
    
    console.log('📋 Groupe spécial défini:', GROUPE_SPECIAL);
    
    // Générer pour chaque jour
    for (const date of weekDates) {
      const dayName = this._getDayName(date);
      console.log(`\n📅 === ${dayName.toUpperCase()} ${date} ===`);
      
      // Vérifier fermeture service
      if (this._isServiceClosed(absences, date)) {
        console.log('🚫 Service fermé - jour ignoré');
        continue;
      }
      
      // Récupérer employés disponibles avec horaires personnalisés
      const availableEmployees = this._getAvailableEmployeesWithSchedule(employees, absences, date, dayName);
      
      if (availableEmployees.length === 0) {
        console.warn(`⚠️ Aucun employé disponible le ${dayName}`);
        continue;
      }
      
      console.log(`👥 Employés disponibles (${availableEmployees.length}):`, 
        availableEmployees.map(e => e.nom).join(', '));
      
      // Générer planning pour matin et après-midi (même équipes)
      const dayPlanning = this._generateDayPlanningV2(
        availableEmployees, 
        vehicules, 
        competences, 
        date, 
        dayName,
        GROUPE_SPECIAL,
        NEVER_DRIVERS
      );
      
      // Ajouter au planning global
      planningEntries.push(...dayPlanning);
    }
    
    console.log(`✅ Génération terminée: ${planningEntries.length} entrées créées`);
    
    return {
      success: true,
      planningEntries,
      validation: { isValid: true, errors: [] },
      summary: {
        totalDays: weekDates.length,
        totalEntries: planningEntries.length,
        employeesUsed: [...new Set(planningEntries.map(e => e.employee_id))].length
      }
    };
  },

  /**
   * Générer le planning pour un jour donné (version simplifiée)
   */
  _generateDayPlanningV2(availableEmployees, vehicules, competences, date, dayName, groupeSpecial, neverDrivers) {
    const planningEntries = [];
    const employeesUsed = new Set();
    
    console.log(`🎯 Génération jour ${dayName}...`);
    
    // 🎯 ÉTAPE 1 : Assignations prioritaires du groupe spécial
    const assignments = this._applySpecialAssignments(
      availableEmployees, 
      vehicules, 
      employeesUsed, 
      dayName,
      groupeSpecial
    );
    
    // 🎯 ÉTAPE 2 : Compléter les véhicules avec autres employés
    this._completeVehicleTeams(
      availableEmployees,
      vehicules,
      competences,
      employeesUsed,
      assignments,
      neverDrivers
    );
    
    // 🎯 ÉTAPE 3 : Créer les entrées de planning (matin + après-midi)
    Object.entries(assignments).forEach(([vehicleId, team]) => {
      team.forEach(member => {
        ['matin', 'apres-midi'].forEach(creneau => {
          planningEntries.push({
            employee_id: member.employee_id,
            vehicule_id: parseInt(vehicleId),
            date: date,
            creneau: creneau,
            role: member.role,
            notes: member.notes || null,
            absent: false
          });
        });
      });
    });
    
    console.log(`✅ Jour ${dayName}: ${planningEntries.length} entrées (${Object.keys(assignments).length} véhicules)`);
    
    return planningEntries;
  },

  /**
   * 🎯 RÈGLE 2 : Appliquer les assignations prioritaires du groupe spécial
   */
  _applySpecialAssignments(availableEmployees, vehicules, employeesUsed, dayName, groupeSpecial) {
    const assignments = {};
    
    // Initialiser tous les véhicules
    vehicules.forEach(vehicle => {
      assignments[vehicle.id] = [];
    });
    
    console.log('🎯 Application des assignations prioritaires...');
    
    // Jack → Transit (priorité absolue)
    const transitVehicle = vehicules.find(v => v.nom === 'Transit');
    if (transitVehicle) {
      this._assignJackToTransit(availableEmployees, employeesUsed, assignments, transitVehicle, dayName);
      
      // Si Jack absent, appliquer cascade
      if (assignments[transitVehicle.id].length === 0) {
        this._applyCascadeTransit(availableEmployees, employeesUsed, assignments, transitVehicle, dayName);
      }
      
      // Compléter Transit avec anciens membres
      this._completeTransit(availableEmployees, employeesUsed, assignments, transitVehicle);
    }
    
    // Elton → Caddy (priorité absolue)
    const caddyVehicle = vehicules.find(v => v.nom === 'Caddy');
    if (caddyVehicle) {
      this._assignEltonToCaddy(availableEmployees, employeesUsed, assignments, caddyVehicle);
    }
    
    // Margot → Crafter 21 (si disponible et pas déjà assignée)
    const crafter21Vehicle = vehicules.find(v => v.nom === 'Crafter 21');
    if (crafter21Vehicle) {
      this._assignMargotToCrafter21(availableEmployees, employeesUsed, assignments, crafter21Vehicle);
    }
    
    // Martial → Ducato (si disponible et pas déjà assigné)
    const ducatoVehicle = vehicules.find(v => v.nom === 'Ducato');
    if (ducatoVehicle) {
      this._assignMartialToDucato(availableEmployees, employeesUsed, assignments, ducatoVehicle);
    }
    
    return assignments;
  },

  /**
   * Assigner Jack au Transit
   */
  _assignJackToTransit(availableEmployees, employeesUsed, assignments, transitVehicle, dayName) {
    const jack = availableEmployees.find(emp => emp.nom === 'Jack' && !employeesUsed.has(emp.id));
    
    if (jack) {
      assignments[transitVehicle.id].push({
        employee_id: jack.id,
        role: 'Équipier', // Jack ne conduit jamais
        notes: `Transit priorité - Jack`
      });
      employeesUsed.add(jack.id);
      console.log('✅ Jack → Transit (priorité absolue)');
      
      // Lundi : ajouter Didier avec Jack
      if (dayName === 'lundi') {
        const didier = availableEmployees.find(emp => emp.nom === 'Didier' && !employeesUsed.has(emp.id));
        if (didier) {
          assignments[transitVehicle.id].push({
            employee_id: didier.id,
            role: 'Équipier', // Didier ne conduit jamais
            notes: `Transit lundi - Didier avec Jack`
          });
          employeesUsed.add(didier.id);
          console.log('✅ Didier → Transit (lundi avec Jack)');
        }
      }
    }
  },

  /**
   * 🎯 RÈGLE 3 : Système de cascade Transit (si Jack absent)
   */
  _applyCascadeTransit(availableEmployees, employeesUsed, assignments, transitVehicle, dayName) {
    console.log('🔄 Jack absent - Application cascade Transit...');
    
    const candidates = dayName === 'lundi' ? ['Didier'] : ['Margot', 'Martial'];
    
    for (const candidateName of candidates) {
      const candidate = availableEmployees.find(emp => 
        emp.nom === candidateName && !employeesUsed.has(emp.id)
      );
      
      if (candidate) {
        assignments[transitVehicle.id].push({
          employee_id: candidate.id,
          role: 'Équipier', // Groupe spécial ne conduit jamais
          notes: `Transit cascade - ${candidateName} (remplace Jack)`
        });
        employeesUsed.add(candidate.id);
        console.log(`✅ ${candidateName} → Transit (cascade)`);
        break; // Un seul du groupe spécial
      }
    }
  },

  /**
   * Compléter Transit avec anciens membres
   */
  _completeTransit(availableEmployees, employeesUsed, assignments, transitVehicle) {
    const anciensMembres = ['Hassene', 'Mejrema', 'Tamara'];
    
    for (const nom of anciensMembres) {
      if (assignments[transitVehicle.id].length >= 4) break; // Max 4 pour Transit
      
      const membre = availableEmployees.find(emp => 
        emp.nom === nom && !employeesUsed.has(emp.id)
      );
      
      if (membre) {
        const needsDriver = assignments[transitVehicle.id].every(m => m.role !== 'Conducteur');
        
        assignments[transitVehicle.id].push({
          employee_id: membre.id,
          role: (membre.permis && needsDriver) ? 'Conducteur' : 'Équipier',
          notes: `Transit ancien - ${nom}`
        });
        employeesUsed.add(membre.id);
        console.log(`✅ ${nom} → Transit (ancien membre)`);
      }
    }
  },

  /**
   * Assigner Elton au Caddy
   */
  _assignEltonToCaddy(availableEmployees, employeesUsed, assignments, caddyVehicle) {
    const elton = availableEmployees.find(emp => emp.nom === 'Elton' && !employeesUsed.has(emp.id));
    
    if (elton) {
      assignments[caddyVehicle.id].push({
        employee_id: elton.id,
        role: 'Équipier', // Pas de conducteur au Caddy
        notes: 'Caddy fixe - Elton'
      });
      employeesUsed.add(elton.id);
      console.log('✅ Elton → Caddy (fixe)');
    }
  },

  /**
   * Assigner Margot au Crafter 21 (si pas déjà assignée)
   */
  _assignMargotToCrafter21(availableEmployees, employeesUsed, assignments, crafter21Vehicle) {
    const margot = availableEmployees.find(emp => emp.nom === 'Margot' && !employeesUsed.has(emp.id));
    
    if (margot) {
      assignments[crafter21Vehicle.id].push({
        employee_id: margot.id,
        role: 'Équipier', // Margot ne conduit jamais
        notes: 'Crafter 21 priorité - Margot'
      });
      employeesUsed.add(margot.id);
      console.log('✅ Margot → Crafter 21 (priorité)');
    }
  },

  /**
   * Assigner Martial au Ducato (si pas déjà assigné)
   */
  _assignMartialToDucato(availableEmployees, employeesUsed, assignments, ducatoVehicle) {
    const martial = availableEmployees.find(emp => emp.nom === 'Martial' && !employeesUsed.has(emp.id));
    
    if (martial) {
      assignments[ducatoVehicle.id].push({
        employee_id: martial.id,
        role: 'Équipier', // Martial ne conduit jamais
        notes: 'Ducato priorité - Martial'
      });
      employeesUsed.add(martial.id);
      console.log('✅ Martial → Ducato (priorité)');
    }
  },

  /**
   * 🎯 RÈGLE 5 : Compléter tous les véhicules avec autres employés
   */
  _completeVehicleTeams(availableEmployees, vehicules, competences, employeesUsed, assignments, neverDrivers) {
    console.log('🎯 Complément des équipes...');
    
    vehicules.forEach(vehicle => {
      const currentTeam = assignments[vehicle.id];
      const slotsNeeded = Math.max(2 - currentTeam.length, 0); // Minimum 2 par véhicule
      
      if (slotsNeeded > 0) {
        this._fillVehicleSlots(
          vehicle, 
          currentTeam, 
          availableEmployees, 
          competences, 
          employeesUsed, 
          slotsNeeded,
          neverDrivers
        );
      }
    });
  },

  /**
   * Remplir les places restantes d'un véhicule
   */
  _fillVehicleSlots(vehicle, currentTeam, availableEmployees, competences, employeesUsed, slotsNeeded, neverDrivers) {
    console.log(`🚐 Complément ${vehicle.nom}: ${slotsNeeded} places à remplir`);
    
    // Trouver employés compétents et disponibles
    const competentEmployees = availableEmployees.filter(emp => {
      if (employeesUsed.has(emp.id)) return false;
      
      const competence = competences.find(c => 
        c.employee_id === emp.id && c.vehicule_id === vehicle.id
      );
      
      return competence && ['en formation', 'XX'].includes(competence.niveau);
    });
    
    // Assigner un conducteur si nécessaire (et pas Caddy)
    if (vehicle.nom !== 'Caddy' && !currentTeam.some(m => m.role === 'Conducteur')) {
      const driver = competentEmployees.find(emp => 
        emp.permis && !neverDrivers.includes(emp.nom)
      );
      
      if (driver) {
        currentTeam.push({
          employee_id: driver.id,
          role: 'Conducteur',
          notes: `Conducteur ${vehicle.nom}`
        });
        employeesUsed.add(driver.id);
        console.log(`✅ ${driver.nom} → ${vehicle.nom} (Conducteur)`);
        slotsNeeded--;
      }
    }
    
    // Compléter avec équipiers
    for (let i = 0; i < slotsNeeded && competentEmployees.length > 0; i++) {
      const employee = competentEmployees.find(emp => !employeesUsed.has(emp.id));
      if (employee) {
        currentTeam.push({
          employee_id: employee.id,
          role: 'Équipier',
          notes: `Équipier ${vehicle.nom}`
        });
        employeesUsed.add(employee.id);
        console.log(`✅ ${employee.nom} → ${vehicle.nom} (Équipier)`);
      }
    }
  },

  /**
   * 🎯 RÈGLE 4 : Filtrer employés selon horaires personnalisés
   */
  _getAvailableEmployeesWithSchedule(employees, absences, date, dayName) {
    const absentIds = absences
      .filter(absence => 
        date >= absence.date_debut && 
        date <= absence.date_fin && 
        absence.type_absence !== 'Rendez-vous'
      )
      .map(absence => absence.employee_id);

    return employees.filter(emp => {
      if (!emp.actif || absentIds.includes(emp.id)) return false;
      
      // Vérifier horaires personnalisés
      const debutField = `${dayName}_debut`;
      const finField = `${dayName}_fin`;
      return emp[debutField] && emp[finField];
    });
  },

  /**
   * Vérifier si le service est fermé
   */
  _isServiceClosed(absences, date) {
    return absences.some(absence => 
      absence.type_absence === 'Fermeture' &&
      absence.employee_id === null &&
      date >= absence.date_debut && 
      date <= absence.date_fin
    );
  },

  /**
   * Obtenir le nom du jour
   */
  _getDayName(date) {
    return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
  }

}; 