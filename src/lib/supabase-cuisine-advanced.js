/**
 * 🚀 SUPABASE CUISINE ADVANCED - VERSION 2.0
 * API avancée pour la gestion des absences cuisine
 * Basée sur la structure logistique, adaptée pour la cuisine
 */

import { supabase } from './supabase.js';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';

export const supabaseCuisineAdvanced = {
  
  // ================================
  // 👥 GESTION DES EMPLOYÉS (réutilise l'API existante)
  // ================================

  async getEmployeesCuisine() {
    try {
      const { data, error } = await supabase
        .from('employes_cuisine_new')
        .select('*')
        .eq('actif', true)
        .order('prenom');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Erreur récupération employés cuisine:', error);
      return { data: [], error };
    }
  },

  // ================================
  // 🚫 GESTION DES ABSENCES AVANCÉE
  // ================================

  /**
   * Récupérer les absences cuisine avec structure avancée
   */
  async getAbsencesCuisineAdvanced(dateDebut = null, dateFin = null) {
    try {
      let query = supabase
        .from('absences_cuisine_advanced')
        .select(`
          *,
          employe:employes_cuisine_new(id, prenom, photo_url, langue_parlee)
        `)
        .order('date_debut', { ascending: false });

      if (dateDebut && dateFin) {
        query = query
          .gte('date_fin', dateDebut)
          .lte('date_debut', dateFin);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Erreur récupération absences cuisine advanced:', error);
      return { data: [], error };
    }
  },

  /**
   * Ajouter une absence cuisine avancée
   */
  async addAbsenceCuisineAdvanced(formData) {
    try {
      const absenceData = {
        employee_id: formData.type_absence === 'Fermeture' ? null : parseInt(formData.employee_id),
        date_debut: formData.date_debut,
        date_fin: formData.date_fin || formData.date_debut,
        type_absence: formData.type_absence,
        motif: formData.motif || null,
        heure_debut: (formData.type_absence === 'Rendez-vous' && formData.heure_debut) ? formData.heure_debut : null,
        heure_fin: null // Toujours null pour simplifier (comme logistique)
      };

      const { data, error } = await supabase
        .from('absences_cuisine_advanced')
        .insert([absenceData])
        .select(`
          *,
          employe:employes_cuisine_new(id, prenom, photo_url, langue_parlee)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur ajout absence cuisine advanced:', error);
      return { data: null, error };
    }
  },

  /**
   * Mettre à jour une absence cuisine avancée
   */
  async updateAbsenceCuisineAdvanced(absenceId, updates) {
    try {
      const { data, error } = await supabase
        .from('absences_cuisine_advanced')
        .update(updates)
        .eq('id', absenceId)
        .select(`
          *,
          employe:employes_cuisine_new(id, prenom, photo_url, langue_parlee)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Erreur mise à jour absence cuisine advanced:', error);
      return { data: null, error };
    }
  },

  /**
   * Supprimer une absence cuisine avancée
   */
  async deleteAbsenceCuisineAdvanced(absenceId) {
    try {
      const { error } = await supabase
        .from('absences_cuisine_advanced')
        .delete()
        .eq('id', absenceId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Erreur suppression absence cuisine advanced:', error);
      return { success: false, error };
    }
  },

  // ================================
  // 📊 FONCTIONS UTILITAIRES AVANCÉES
  // ================================

  /**
   * Obtenir le statut d'un employé un jour donné (copie logique logistique)
   */
  getEmployeeStatusOnDay(employeeId, day, absences, employees) {
    const dayString = format(day, 'yyyy-MM-dd');
    
    // 🚫 PRIORITÉ 1: Vérifier d'abord s'il y a une fermeture du service ce jour-là
    const fermeture = absences.find(absence => {
      return absence.type_absence === 'Fermeture' &&
             absence.employee_id === null &&
             dayString >= absence.date_debut && 
             dayString <= absence.date_fin;
    });
    
    if (fermeture) {
      return {
        isAbsent: true,
        type: 'Fermeture',
        label: 'Service fermé',
        color: 'bg-gray-600',
        abbreviation: 'FERMÉ'
      };
    }
    
    // ⚠️ PRIORITÉ 2: Chercher une absence individuelle pour cet employé ce jour-là
    const absence = absences.find(absence => {
      if (absence.employee_id !== employeeId) return false;
      if (absence.type_absence === 'Fermeture') return false;
      
      return dayString >= absence.date_debut && dayString <= absence.date_fin;
    });
    
    if (absence) {
      return {
        isAbsent: true,
        type: absence.type_absence,
        label: this.getAbsenceTypeLabel(absence.type_absence),
        color: this.getAbsenceTypeColor(absence.type_absence),
        abbreviation: this.getAbsenceAbbreviation(absence.type_absence, absence.heure_debut)
      };
    } else {
      return {
        isAbsent: false,
        type: 'Présent',
        label: 'Présent',
        color: 'bg-green-500',
        abbreviation: '✓'
      };
    }
  },

  /**
   * Obtenir le label d'un type d'absence
   */
  getAbsenceTypeLabel(type) {
    const labels = {
      'Absent': 'Absent',
      'Congé': 'Congé',
      'Maladie': 'Maladie',
      'Formation': 'Formation',
      'Rendez-vous': 'Rendez-vous',
      'Fermeture': 'Service fermé'
    };
    return labels[type] || 'Absent';
  },

  /**
   * Obtenir la couleur d'un type d'absence
   */
  getAbsenceTypeColor(type) {
    const colors = {
      'Absent': 'bg-red-500',
      'Congé': 'bg-blue-500',
      'Maladie': 'bg-yellow-500',
      'Formation': 'bg-purple-500',
      'Rendez-vous': 'bg-orange-500',
      'Fermeture': 'bg-gray-600'
    };
    return colors[type] || 'bg-red-500';
  },

  /**
   * Obtenir l'abréviation d'un type d'absence
   */
  getAbsenceAbbreviation(type, heure_debut = null) {
    switch(type) {
      case 'Absent': return 'ABS';
      case 'Congé': return 'CONG';
      case 'Maladie': return 'MAL';
      case 'Formation': return 'FORM';
      case 'Rendez-vous': 
        if (heure_debut) {
          const heure = heure_debut.split(':')[0];
          return `RDV ${heure}h`;
        }
        return 'RDV';
      case 'Fermeture': return 'FERMÉ';
      default: return 'ABS';
    }
  },

  /**
   * Obtenir les statistiques d'absence pour aujourd'hui
   */
  getTodayStats(employees, absences) {
    const today = new Date();
    const todayString = format(today, 'yyyy-MM-dd');
    
    // Compter les employés absents aujourd'hui
    const todayAbsentEmployees = new Set();
    
    absences.forEach(absence => {
      if (todayString >= absence.date_debut && todayString <= absence.date_fin) {
        todayAbsentEmployees.add(absence.employee_id);
      }
    });
    
    const totalAbsents = todayAbsentEmployees.size;
    const totalPresents = Math.max(0, employees.length - totalAbsents);
    
    return {
      totalPresents,
      totalAbsents
    };
  },

  /**
   * Types d'absence disponibles pour la cuisine
   */
  getTypeAbsenceOptions() {
    return [
      { value: 'Absent', label: 'Absent', color: 'bg-red-500' },
      { value: 'Congé', label: 'Congé', color: 'bg-blue-500' },
      { value: 'Maladie', label: 'Maladie', color: 'bg-yellow-500' },
      { value: 'Formation', label: 'Formation', color: 'bg-purple-500' },
      { value: 'Rendez-vous', label: 'Rendez-vous', color: 'bg-orange-500' },
      { value: 'Fermeture', label: 'Fermeture service', color: 'bg-gray-600' }
    ];
  },

  /**
   * Motifs prédéfinis pour les fermetures de service cuisine
   */
  getFermetureMotifs() {
    return [
      'Jour férié',
      'Formation collective',
      'Maintenance cuisine',
      'Nettoyage approfondi',
      'Inventaire',
      'Réunion équipe',
      'Audit hygiène',
      'Livraison équipement',
      'Autre raison'
    ];
  },

  /**
   * Générer les dates d'une semaine (lundi à vendredi)
   */
  generateWeekDates(startDate) {
    const dates = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  },

  /**
   * Vérifier si un employé est absent un jour donné
   */
  isEmployeeAbsentOnDay(employeeId, day, absences) {
    return this.getEmployeeStatusOnDay(employeeId, day, absences, []).isAbsent;
  },

  /**
   * Obtenir le nom du jour en français
   */
  getDayName(date) {
    return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
  },

  /**
   * Vérifier si le service cuisine est fermé un jour donné
   */
  isServiceClosed(absences, date) {
    return absences.some(absence => 
      absence.type_absence === 'Fermeture' &&
      absence.employee_id === null &&
      date >= absence.date_debut && 
      date <= absence.date_fin
    );
  }

}; 