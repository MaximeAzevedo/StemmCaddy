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
   */
  async savePlanningPartage(boardData, selectedDate) {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // 1. Supprimer les anciennes assignations du jour
      await supabase
        .from('planning_cuisine_new')
        .delete()
        .eq('date', dateStr);
      
      // 2. Insérer les nouvelles assignations
      const insertions = [];
      
      Object.entries(boardData).forEach(([cellId, employees]) => {
        if (cellId === 'unassigned') return; // Ignorer les non-assignés
        
        // Parser cellId → poste + créneau
        const [poste, creneau] = cellId.split('-', 2);
        if (!poste || !creneau) return;
        
        // Parser créneau → heures début/fin
        let heure_debut, heure_fin;
        if (creneau.includes('-') && creneau.length > 4) {
          // Format "8h-16h" ou "11h-11h45"
          if (creneau.includes('h-') && creneau.includes('h', creneau.indexOf('h-') + 2)) {
            // Format "11h-11h45"
            const parts = creneau.split('-');
            heure_debut = parts[0].replace('h', ':00');
            heure_fin = parts[1].replace('h', ':');
            if (!heure_fin.includes(':')) heure_fin += '00';
          } else {
            // Format "8h-16h" 
            const parts = creneau.split('-');
            heure_debut = parts[0].replace('h', ':00');
            heure_fin = parts[1].replace('h', ':00');
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
          } else {
            // Format générique "Xh"
            heure_debut = creneau.replace('h', ':00');
            heure_fin = (parseInt(creneau) + 2) + ':00'; // +2h par défaut
          }
        }
        
        // Obtenir config poste
        const posteConfig = POSTES_CUISINE.find(p => p.nom === poste) || {};
        
        employees.forEach(emp => {
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
      
      if (insertions.length > 0) {
        const { error } = await supabase
          .from('planning_cuisine_new')
          .insert(insertions);
        
        if (error) throw error;
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

/**
 * Récupérer les créneaux pour un poste donné
 * ✅ CRÉNEAUX CORRIGÉS selon spécifications réelles
 */
export const getCreneauxForPoste = (posteNom, session = 'matin') => {
  const creneauxParPoste = {
    // Postes standards 8h-16h
    'Cuisine chaude': ['8h-16h'],
    'Sandwichs': ['8h-16h'], 
    'Jus de fruits': ['8h-16h'],
    'Légumerie': ['8h-16h'],
    'Equipe Pina et Saskia': ['8h-16h'],
    
    // Postes spéciaux
    'Pain': ['8h-12h'],
    'Vaisselle': ['8h', '10h', 'midi'],
    'Self Midi': ['11h-11h45', '11h45-12h45']
  };
  
  return creneauxParPoste[posteNom] || ['8h-16h'];
};

export default supabaseCuisine; 