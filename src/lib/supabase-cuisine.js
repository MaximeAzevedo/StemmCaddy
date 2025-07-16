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
  { id: 8, nom: 'Equipe Pina et Saskia', couleur: '#ec4899', icone: '👥' }
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
   * Récupérer les compétences cuisine - VERSION SIMPLIFIÉE
   * Utilise les colonnes booléennes de la table employes_cuisine_new
   */
  async getCompetencesCuisineSimple() {
    try {
      console.log('📊 getCompetencesCuisineSimple - Chargement compétences...');
      
      const { data: employeesData, error } = await supabase
        .from('employes_cuisine_new')
        .select('id, prenom, cuisine_chaude, cuisine_froide, chef_sandwichs, sandwichs, vaisselle, legumerie, equipe_pina_saskia')
        .eq('actif', true);
      
      if (error) throw error;
      
      // Convertir les colonnes booléennes en compétences
      const competences = [];
      employeesData.forEach(emp => {
        const competencesEmp = [];
        
        if (emp.cuisine_chaude) competencesEmp.push({ employee_id: emp.id, poste_id: 1, niveau: 'Expert' });
        if (emp.sandwichs) competencesEmp.push({ employee_id: emp.id, poste_id: 2, niveau: 'Expert' });
        if (emp.vaisselle) competencesEmp.push({ employee_id: emp.id, poste_id: 5, niveau: 'Expert' });
        if (emp.legumerie) competencesEmp.push({ employee_id: emp.id, poste_id: 6, niveau: 'Expert' });
        if (emp.equipe_pina_saskia) competencesEmp.push({ employee_id: emp.id, poste_id: 8, niveau: 'Expert' });
        
        competences.push(...competencesEmp);
      });
      
      console.log('✅ Compétences cuisine chargées:', competences.length);
      return { data: competences, error: null };
      
    } catch (error) {
      console.error('💥 Erreur critique getCompetencesCuisineSimple:', error);
      return { data: [], error };
    }
  },

  /**
   * Mettre à jour une compétence cuisine
   */
  async updateCompetenceCuisine(employeeId, posteId, competenceData) {
    try {
      // Mise à jour des colonnes booléennes selon le poste
      const updates = {};
      
      switch (posteId) {
        case 1: updates.cuisine_chaude = true; break;
        case 2: updates.sandwichs = true; break;
        case 5: updates.vaisselle = true; break;
        case 6: updates.legumerie = true; break;
        case 8: updates.equipe_pina_saskia = true; break;
        default: console.warn('Poste non reconnu:', posteId);
      }
      
      if (Object.keys(updates).length > 0) {
        const { data, error } = await supabase
          .from('employes_cuisine_new')
          .update(updates)
          .eq('id', employeeId)
          .select();
        
        if (error) throw error;
        
        console.log('✅ Compétence cuisine mise à jour:', data);
        return { data, error: null };
      }
      
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
   * 🔧 CORRECTION : Gestion des contraintes uniques
   */
  async savePlanningPartage(boardData, selectedDate) {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // 1. Supprimer les anciennes assignations du jour
      await supabase
        .from('planning_cuisine_new')
        .delete()
        .eq('date', dateStr);
      
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
          
          // Parser créneau → heures début/fin (robuste contre troncatures)
          let heure_debut, heure_fin;
          
          try {
            if (creneau.includes('-') && creneau.length > 3) {
              // Format "8h-16h" ou "11h-11h45" ou "11h45-12h45"
              const parts = creneau.split('-');
              
              // Parser heure de début
              if (parts[0].includes('h')) {
                const hourMinutes = parts[0].split('h');
                const hours = hourMinutes[0] || '8';
                const minutes = hourMinutes[1] || '00';
                heure_debut = hours.padStart(2, '0') + ':' + minutes.padStart(2, '0');
              } else {
                heure_debut = '08:00'; // fallback
              }
              
              // Parser heure de fin
              if (parts[1] && parts[1].includes('h')) {
                const hourMinutes = parts[1].split('h');
                const hours = hourMinutes[0] || '16';
                const minutes = hourMinutes[1] || '00';
                heure_fin = hours.padStart(2, '0') + ':' + minutes.padStart(2, '0');
              } else if (parts[1]) {
                // Fallback pour heure de fin sans 'h'
                const endHour = parseInt(parts[1]) || 16;
                heure_fin = endHour.toString().padStart(2, '0') + ':00';
              } else {
                heure_fin = '16:00'; // fallback
              }
            } else {
              // Créneaux spéciaux simples (8h, 10h, midi)
              if (creneau === 'midi') {
                heure_debut = '12:00';
                heure_fin = '16:00';
              } else if (creneau === '8h') {
                heure_debut = '08:00';
                heure_fin = '10:00';
              } else if (creneau === '10h') {
                heure_debut = '10:00';
                heure_fin = '12:00';
              } else if (creneau.endsWith('h')) {
                // Format générique "Xh"
                const hour = parseInt(creneau.replace('h', '')) || 8;
                heure_debut = hour.toString().padStart(2, '0') + ':00';
                heure_fin = (hour + 2).toString().padStart(2, '0') + ':00';
              } else {
                // Fallback total
                console.warn(`⚠️ Créneau non reconnu: "${creneau}", utilisation fallback`);
                heure_debut = '08:00';
                heure_fin = '10:00';
              }
            }
            
            // 🔍 DEBUG : Vérifier le résultat du parsing
            console.log(`⏰ Parsing "${creneau}" → ${heure_debut} - ${heure_fin}`);
            
          } catch (error) {
            console.error(`❌ Erreur parsing créneau "${creneau}":`, error);
            heure_debut = '08:00';
            heure_fin = '10:00';
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