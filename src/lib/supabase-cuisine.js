import { supabase } from './supabase';
import { format } from 'date-fns';

/**
 * ========================================
 * API CUISINE SUPABASE
 * ========================================
 * 
 * API spécialisée pour la gestion de l'équipe cuisine
 * Utilise les nouvelles tables : employes_cuisine_new, planning_cuisine_new, absences_cuisine_new
 */

// 🔧 POSTES CUISINE EN DUR (car table postes_cuisine n'existe pas encore)
const POSTES_CUISINE = [
  { id: 1, nom: 'Cuisine chaude', couleur: '#ef4444', icone: '🔥' },
  { id: 2, nom: 'Sandwichs', couleur: '#f59e0b', icone: '🥪' },
  { id: 3, nom: 'Pain', couleur: '#eab308', icone: '🍞' },
  { id: 4, nom: 'Jus de fruits', couleur: '#22c55e', icone: '🧃' },
  { id: 5, nom: 'Vaisselle', couleur: '#3b82f6', icone: '🍽️' },
  { id: 6, nom: 'Légumerie', couleur: '#10b981', icone: '🥬' },
  { id: 7, nom: 'Self Midi', couleur: '#8b5cf6', icone: '🍽️' },
  { id: 8, nom: 'Equipe Pina et Saskia', couleur: '#ec4899', icone: '👥' },
  { id: 9, nom: 'Cuisine froide', couleur: '#06b6d4', icone: '❄️' },
  { id: 10, nom: 'Chef sandwichs', couleur: '#f97316', icone: '👨‍🍳' }
];

export const supabaseCuisine = {
  
  // ==================== EMPLOYÉS CUISINE ====================
  
  /**
   * Récupérer tous les employés de cuisine ACTIFS
   * NOUVELLE STRUCTURE DIRECTE - pas d'imbrication employee
   */
  async getEmployeesCuisine() {
    try {
      console.log('📊 getEmployeesCuisine - Chargement employés cuisine...');
      
      const { data, error } = await supabase
        .from('employes_cuisine_new')
        .select('*')
        .eq('actif', true)
        .order('prenom');
      
      if (error) {
        console.error('❌ Erreur getEmployeesCuisine:', error);
        throw error;
    }

      console.log('✅ Employés cuisine chargés:', data?.length || 0);
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getEmployeesCuisine:', error);
      return { data: [], error };
    }
  },

  // ==================== POSTES CUISINE ====================
  
  /**
   * Récupérer tous les postes de cuisine
   * TEMPORAIRE : utilise des données en dur
   */
  async getPostes() {
    try {
      console.log('📊 getPostes - Chargement postes cuisine...');
      
      // TEMPORAIRE : utiliser les postes en dur car table n'existe pas
      console.log('✅ Postes cuisine chargés (en dur):', POSTES_CUISINE.length);
      return { data: POSTES_CUISINE, error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getPostes:', error);
      return { data: POSTES_CUISINE, error };
    }
  },

  // ==================== PLANNING CUISINE ====================
  
  /**
   * Récupérer le planning cuisine avec jointure employés
   */
  async getPlanningCuisine(dateDebut = null, dateFin = null) {
    try {
      console.log('📊 getPlanningCuisine - Chargement planning...');
      
      let query = supabase
        .from('planning_cuisine_new')
          .select(`
            *,
          employe:employes_cuisine_new(id, prenom, photo_url)
        `);
        
      if (dateDebut) {
        if (dateFin) {
          query = query.gte('date', dateDebut).lte('date', dateFin);
      } else {
          query = query.eq('date', dateDebut);
        }
      }
      
      const { data, error } = await query.order('date').order('heure_debut');
      
      if (error) {
        console.error('❌ Erreur getPlanningCuisine:', error);
        throw error;
      }

      console.log('✅ Planning cuisine chargé:', data?.length || 0);
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getPlanningCuisine:', error);
      return { data: [], error };
    }
  },

  /**
   * Créer une affectation planning cuisine
   */
  async createPlanningCuisine(planningData) {
    try {
      const { data, error } = await supabase
        .from('planning_cuisine_new')
        .insert(planningData)
        .select();
      
      if (error) throw error;
      
      console.log('✅ Planning cuisine créé:', data);
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ Erreur createPlanningCuisine:', error);
      return { data: null, error };
    }
  },

  // ==================== ABSENCES CUISINE ====================
  
  /**
   * Récupérer les absences cuisine avec jointure employés
   */
  async getAbsencesCuisine(dateDebut = null, dateFin = null) {
    try {
      console.log('📊 getAbsencesCuisine - Chargement absences...');
      
      let query = supabase
        .from('absences_cuisine_new')
        .select(`
          *,
          employe:employes_cuisine_new(id, prenom, photo_url)
        `);
      
      if (dateDebut && dateFin) {
        query = query.or(`date_debut.lte.${dateFin},date_fin.gte.${dateDebut}`);
      } else if (dateDebut) {
        query = query.lte('date_debut', dateDebut).gte('date_fin', dateDebut);
      }
      
      const { data, error } = await query.order('date_debut');
      
      if (error) {
        console.error('❌ Erreur getAbsencesCuisine:', error);
        throw error;
    }
      
      console.log('✅ Absences cuisine chargées:', data?.length || 0);
      return { data: data || [], error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getAbsencesCuisine:', error);
      return { data: [], error };
    }
  },

  /**
   * Créer une absence cuisine
   * STRUCTURE CORRIGÉE : pas de colonne statut
   */
  async createAbsenceCuisine(absenceData) {
    try {
      console.log('📝 createAbsenceCuisine - Données:', absenceData);
      
      // 🔧 STRUCTURE CORRIGÉE : supprimer les champs qui n'existent pas
      const cleanData = {
        employee_id: absenceData.employee_id,
        date_debut: absenceData.date_debut,
        date_fin: absenceData.date_fin,
        type_absence: absenceData.type_absence || 'Absent',
        motif: absenceData.motif || null
        // ❌ Supprimé : statut (colonne n'existe pas)
      };
      
      const { data, error } = await supabase
        .from('absences_cuisine_new')
        .insert(cleanData)
        .select(`
          *,
          employe:employes_cuisine_new(id, prenom, photo_url)
        `);
      
      if (error) {
        console.error('❌ Erreur createAbsenceCuisine:', error);
        throw error;
      }
      
      console.log('✅ Absence cuisine créée:', data);
      return { data, error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique createAbsenceCuisine:', error);
      return { data: null, error };
    }
  },

  /**
   * Mettre à jour une absence cuisine
   */
  async updateAbsenceCuisine(id, updates) {
    try {
      // 🔧 STRUCTURE CORRIGÉE : supprimer les champs qui n'existent pas
      const cleanUpdates = {
        date_debut: updates.date_debut,
        date_fin: updates.date_fin,
        type_absence: updates.type_absence,
        motif: updates.motif
        // ❌ Supprimé : statut (colonne n'existe pas)
      };
      
      const { data, error } = await supabase
        .from('absences_cuisine_new')
        .update(cleanUpdates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      console.log('✅ Absence cuisine mise à jour:', data);
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ Erreur updateAbsenceCuisine:', error);
      return { data: null, error };
    }
  },

  /**
   * Supprimer une absence cuisine
   */
  async deleteAbsenceCuisine(id) {
    try {
      const { data, error } = await supabase
        .from('absences_cuisine_new')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('✅ Absence cuisine supprimée');
      return { data, error: null };
      
    } catch (error) {
      console.error('❌ Erreur deleteAbsenceCuisine:', error);
      return { data: null, error };
    }
  },

  // ==================== COMPÉTENCES CUISINE ====================
  
  /**
   * Récupérer les compétences cuisine COMPLÈTES - VERSION SIMPLIFIÉE
   * ✅ COMPATIBLE AVEC LA NOUVELLE STRUCTURE DB (sans cuisine_froide)
   */
  async getCompetencesCuisineSimple() {
    try {
      console.log('📊 getCompetencesCuisineSimple - Chargement compétences...');
      
      const { data: employeesData, error } = await supabase
        .from('employes_cuisine_new')
        .select('id, prenom, cuisine_chaude, chef_sandwichs, sandwichs, vaisselle, legumerie, equipe_pina_saskia, pain, jus_de_fruits, self_midi')
        .eq('actif', true);
      
      if (error) throw error;
      
      // Convertir les colonnes booléennes en compétences
      const competences = [];
      employeesData.forEach(emp => {
        const competencesEmp = [];

        // Mapping complet des postes vers les colonnes (SANS cuisine_froide)
        if (emp.cuisine_chaude) competencesEmp.push({ employee_id: emp.id, poste_id: 1, niveau: 'Expert' });
        if (emp.sandwichs) competencesEmp.push({ employee_id: emp.id, poste_id: 2, niveau: 'Expert' });
        if (emp.pain) competencesEmp.push({ employee_id: emp.id, poste_id: 3, niveau: 'Expert' });
        if (emp.jus_de_fruits) competencesEmp.push({ employee_id: emp.id, poste_id: 4, niveau: 'Expert' });
        if (emp.vaisselle) competencesEmp.push({ employee_id: emp.id, poste_id: 5, niveau: 'Expert' });
        if (emp.legumerie) competencesEmp.push({ employee_id: emp.id, poste_id: 6, niveau: 'Expert' });
        if (emp.self_midi) competencesEmp.push({ employee_id: emp.id, poste_id: 7, niveau: 'Expert' });
        if (emp.equipe_pina_saskia) competencesEmp.push({ employee_id: emp.id, poste_id: 8, niveau: 'Expert' });
        // ✅ SUPPRIMÉ : cuisine_froide n'existe plus
        if (emp.chef_sandwichs) competencesEmp.push({ employee_id: emp.id, poste_id: 10, niveau: 'Expert' });
        
        competences.push(...competencesEmp);
      });
      
      console.log('✅ Compétences cuisine chargées (NOUVELLE STRUCTURE):', competences.length);
      return { data: competences, error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getCompetencesCuisineSimple:', error);
      return { data: [], error };
    }
  },

  /**
   * Mettre à jour une compétence cuisine - VERSION COMPLÈTE + DEBUG
   * Gère l'ajout ET la suppression des compétences avec validation stricte (TOUS LES POSTES)
   */
  async updateCompetenceCuisine(employeeId, posteId, competenceData) {
    try {
      console.log('🔧 updateCompetenceCuisine - Données reçues:', {
        employeeId,
        posteId,
        competenceData
      });
      
      // Validation des paramètres
      if (!employeeId || !posteId) {
        console.error('❌ Paramètres manquants:', { employeeId, posteId });
        return { data: null, error: { message: 'Paramètres employeeId et posteId requis' } };
      }
      
      // Déterminer si c'est une validation ou une suppression
      // Gestion robuste des différents formats de niveau
      let isValidation = false;
      
      if (competenceData.niveau) {
        const niveau = competenceData.niveau.toString().toLowerCase();
        // Accepter "expert", "intermédiaire", ou toute valeur non-vide sauf "nv", "", "non validé"
        isValidation = niveau !== '' && 
                      niveau !== 'nv' && 
                      niveau !== 'non validé' && 
                      niveau !== 'false' && 
                      niveau !== '0';
      }
      
      console.log(`🎯 Validation déterminée: ${isValidation} (niveau: "${competenceData.niveau}")`);
      
      // Mise à jour des colonnes booléennes selon le poste (MAPPING COMPLET)
      const updates = {};
      
      switch (parseInt(posteId)) {
        case 1: 
          updates.cuisine_chaude = isValidation; 
          console.log('🔥 Mise à jour cuisine_chaude:', isValidation);
          break;
        case 2: 
          updates.sandwichs = isValidation; 
          console.log('🥪 Mise à jour sandwichs:', isValidation);
          break;
        case 3: 
          updates.pain = isValidation; 
          console.log('🍞 Mise à jour pain:', isValidation);
          break;
        case 4: 
          updates.jus_de_fruits = isValidation; 
          console.log('🧃 Mise à jour jus_de_fruits:', isValidation);
          break;
        case 5: 
          updates.vaisselle = isValidation; 
          console.log('🍽️ Mise à jour vaisselle:', isValidation);
          break;
        case 6: 
          updates.legumerie = isValidation; 
          console.log('🥬 Mise à jour légumerie:', isValidation);
          break;
        case 7: 
          updates.self_midi = isValidation; 
          console.log('🍽️ Mise à jour self_midi:', isValidation);
          break;
        case 8: 
          updates.equipe_pina_saskia = isValidation; 
          console.log('👥 Mise à jour equipe_pina_saskia:', isValidation);
          break;
        case 9: 
          updates.cuisine_froide = isValidation; 
          console.log('❄️ Mise à jour cuisine_froide:', isValidation);
          break;
        case 10: 
          updates.chef_sandwichs = isValidation; 
          console.log('👨‍🍳 Mise à jour chef_sandwichs:', isValidation);
          break;
        default: 
          console.warn('⚠️ Poste non reconnu:', posteId);
          return { data: null, error: { message: `Poste ${posteId} non reconnu` } };
      }
      
      console.log('💾 Updates à appliquer:', updates);
      
      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabase
          .from('employes_cuisine_new')
          .update(updates)
          .eq('id', employeeId)
          .select();
        
        if (error) {
          console.error('❌ Erreur Supabase updateCompetenceCuisine:', error);
          throw error;
        }
        
        const action = isValidation ? 'validée' : 'supprimée';
        console.log(`✅ Compétence cuisine ${action} (employé ${employeeId}, poste ${posteId}):`, data);
        return { data, error: null };
      }
      
      console.log('⚠️ Aucune mise à jour nécessaire');
      return { data: [], error: null };
      
    } catch (error) {
      console.error('❌ Erreur updateCompetenceCuisine:', error);
      return { data: null, error };
    }
  },

  // ==================== PLANNING PARTAGÉ (remplace localStorage) ====================
  
  /**
   * Sauvegarder le planning complet en base de données
   * Remplace localStorage pour partage multi-utilisateurs
   * 🔧 CORRECTION : Nettoyage complet des anciennes données
   */
  async savePlanningPartage(boardData, selectedDate) {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // ✅ CORRECTION : Supprimer TOUTES les anciennes données de planning (pas seulement la date courante)
      console.log('🧹 Nettoyage complet des anciennes données de planning...');
      
      // Option 1 : Supprimer toutes les données (table planning réinitialisée)
      const { data: existingData, error: selectError } = await supabase
        .from('planning_cuisine_new')
        .select('date')
        .limit(1);
      
      if (!selectError && existingData?.length > 0) {
        // Il y a des données existantes, les supprimer toutes
        const { error: deleteError } = await supabase
          .from('planning_cuisine_new')
          .delete()
          .gte('date', '2020-01-01'); // Supprime tout depuis 2020 (pratiquement tout)
        
        if (deleteError) {
          console.warn('⚠️ Erreur suppression complète, fallback suppression date courante:', deleteError);
          // Fallback : supprimer seulement la date courante
      await supabase
        .from('planning_cuisine_new')
        .delete()
        .eq('date', dateStr);
        } else {
          console.log('✅ Toutes les anciennes données supprimées');
        }
      } else {
        console.log('✅ Aucune donnée existante à supprimer');
      }
      
      // 2. Préparer les nouvelles assignations (ASSIGNATIONS MULTIPLES AUTORISÉES)
      const insertions = [];
      
      Object.entries(boardData).forEach(([cellId, employees]) => {
        if (cellId === 'unassigned') return; // Ignorer les non-assignés
        
        // Parser cellId → poste + créneau
        const [poste, creneau] = cellId.split('-', 2);
        if (!poste || !creneau) return;
        
        // Obtenir config poste
        const posteConfig = POSTES_CUISINE.find(p => p.nom === poste) || {};
        
        employees.forEach(emp => {
          // 🔧 DEBUG : Vérifier le créneau reçu
          console.log(`🔍 DEBUG Créneau: "${creneau}" pour ${poste}`);
          
          // ✅ CORRECTION : Parser créneau → heures début/fin (logique robuste)
          let heure_debut, heure_fin;
          
          try {
            // Créneaux spéciaux prédéfinis
            if (creneau === 'midi') {
              heure_debut = '12:00:00';
              heure_fin = '16:00:00';
            } else if (creneau === '8h') {
              heure_debut = '08:00:00';
              heure_fin = '10:00:00';
            } else if (creneau === '10h') {
              heure_debut = '10:00:00';
              heure_fin = '12:00:00';
            } else if (creneau.includes('-')) {
              // Format "8h-16h" ou "11h-11h45" ou "11h45-12h45"
              const parts = creneau.split('-');
              
              // Parser heure de début
              if (parts[0] && parts[0].includes('h')) {
                const startParts = parts[0].split('h');
                const hours = parseInt(startParts[0]) || 8;
                const minutes = parseInt(startParts[1]) || 0;
                heure_debut = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':00';
      } else {
                heure_debut = '08:00:00'; // fallback
              }
              
              // Parser heure de fin
              if (parts[1] && parts[1].includes('h')) {
                const endParts = parts[1].split('h');
                const hours = parseInt(endParts[0]) || 16;
                const minutes = parseInt(endParts[1]) || 0;
                heure_fin = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':00';
              } else {
                heure_fin = '16:00:00'; // fallback
    }
            } else if (creneau.endsWith('h')) {
              // Format générique "Xh" (ex: "14h")
              const hour = parseInt(creneau.replace('h', '')) || 8;
              heure_debut = hour.toString().padStart(2, '0') + ':00:00';
              heure_fin = (hour + 2).toString().padStart(2, '0') + ':00:00';
            } else {
              // Fallback total pour créneaux non reconnus
                console.warn(`⚠️ Créneau non reconnu: "${creneau}", utilisation fallback`);
              heure_debut = '08:00:00';
              heure_fin = '10:00:00';
            }
            
            // 🔍 DEBUG : Vérifier le résultat du parsing
            console.log(`⏰ Parsing "${creneau}" → ${heure_debut} - ${heure_fin}`);

    } catch (error) {
            console.error(`❌ Erreur parsing créneau "${creneau}":`, error);
            heure_debut = '08:00:00';
            heure_fin = '10:00:00';
    }
          
          insertions.push({
            employee_id: emp.employeeId,
            date: dateStr,
            poste: poste,
            creneau: creneau,
            heure_debut: heure_debut,
            heure_fin: heure_fin,
            role: emp.role || 'Équipier',
            poste_couleur: posteConfig.couleur || '#6b7280',
            poste_icone: posteConfig.icone || '👨‍🍳',
            notes: emp.notes || null
          });
        });
      });
      
      console.log(`💾 Préparation sauvegarde: ${insertions.length} assignations (assignations multiples autorisées)`);
      
      // 3. Insérer toutes les assignations (plus de limitation UNIQUE)
      if (insertions.length > 0) {
        const { error } = await supabase
          .from('planning_cuisine_new')
          .insert(insertions)
          .select('id');
        
        if (error) {
          console.error('❌ Erreur insertion planning:', error);
          return { success: false, error };
        }
      }
      
      console.log(`💾 Planning partagé sauvegardé: ${insertions.length} assignations`);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur sauvegarde planning partagé:', error);
      return { success: false, error };
    }
  },

  /**
   * Charger le planning complet depuis la base de données
   * Remplace localStorage pour partage multi-utilisateurs
   */
  async loadPlanningPartage(selectedDate) {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('planning_cuisine_new')
        .select(`
          *,
          employe:employes_cuisine_new(id, prenom, photo_url, langue_parlee)
        `)
        .eq('date', dateStr)
        .order('heure_debut');
      
      if (error) throw error;
      
      // Convertir en format board compatible
      const board = {};
      
      data.forEach(entry => {
        const cellId = `${entry.poste}-${entry.creneau}`;
        
        if (!board[cellId]) {
          board[cellId] = [];
    }
        
        board[cellId].push({
          draggableId: `db-${entry.id}`,
          employeeId: entry.employee_id,
          planningId: entry.id,
          employee: {
            id: entry.employe.id,
            nom: entry.employe.prenom,
            profil: entry.employe.langue_parlee || 'Standard'
          },
          photo_url: entry.employe.photo_url,
          nom: entry.employe.prenom,
          prenom: entry.employe.prenom,
          role: entry.role,
          notes: entry.notes,
          isLocal: false
        });
      });
      
      console.log(`📥 Planning partagé chargé: ${data.length} assignations`);
      return { data: board, error: null };
      
    } catch (error) {
      console.error('❌ Erreur chargement planning partagé:', error);
      return { data: {}, error };
    }
  },

  /**
   * Vérifier s'il y a eu des changements depuis la dernière sync
   * Pour polling automatique
   */
  async checkPlanningChanges(selectedDate, lastSync) {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('planning_cuisine_new')
        .select('id, created_at, employee_id, poste, creneau')
        .eq('date', dateStr)
        .gte('created_at', lastSync.toISOString());
      
      if (error) throw error;
      
      return {
        hasChanges: data && data.length > 0,
        changes: data || [],
        error: null
      };
      
    } catch (error) {
      console.error('❌ Erreur vérification changements:', error);
      return { hasChanges: false, changes: [], error };
    }
  }

};

// ==================== UTILITAIRES POSTES ====================

export default supabaseCuisine; 