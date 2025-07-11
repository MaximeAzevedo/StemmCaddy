import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * API Supabase pour le module Secrétariat
 * Gestion des denrées alimentaires récupérées
 */
export const supabaseSecretariat = {
  
  // Exposer le client Supabase pour les tests
  supabase,
  
  // ==================== DENRÉES ALIMENTAIRES ====================
  
  /**
   * Récupérer toutes les denrées alimentaires
   * @param {number} annee - Année à filtrer (optionnel)
   * @returns {Promise} Résultat de la requête
   */
  async getDenreesAlimentaires(annee = null) {
    try {
      let query = supabase
        .from('denrees_alimentaires')
        .select('*')
        .order('annee', { ascending: false })
        .order('mois', { ascending: false })
        .order('fournisseur');

      if (annee) {
        query = query.eq('annee', annee);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Erreur getDenreesAlimentaires:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique getDenreesAlimentaires:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Créer une nouvelle entrée de denrées alimentaires
   * @param {Object} denree - Objet contenant les informations de la denrée
   * @returns {Promise} Résultat de la création
   */
  async createDenreeAlimentaire(denree) {
    try {
      const { data, error } = await supabase
        .from('denrees_alimentaires')
        .insert([{
          fournisseur: denree.fournisseur,
          mois: denree.mois,
          annee: denree.annee,
          quantite: denree.quantite,
          unite: denree.unite || 'kg',
          notes: denree.notes || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Erreur createDenreeAlimentaire:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique createDenreeAlimentaire:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Mettre à jour une denrée alimentaire
   * @param {number} id - ID de la denrée à modifier
   * @param {Object} updates - Modifications à apporter
   * @returns {Promise} Résultat de la modification
   */
  async updateDenreeAlimentaire(id, updates) {
    try {
      const { data, error } = await supabase
        .from('denrees_alimentaires')
        .update({
          fournisseur: updates.fournisseur,
          mois: updates.mois,
          annee: updates.annee,
          quantite: updates.quantite,
          unite: updates.unite,
          notes: updates.notes
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erreur updateDenreeAlimentaire:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      console.error('Erreur technique updateDenreeAlimentaire:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Supprimer une denrée alimentaire
   * @param {number} id - ID de la denrée à supprimer
   * @returns {Promise} Résultat de la suppression
   */
  async deleteDenreeAlimentaire(id) {
    try {
      const { error } = await supabase
        .from('denrees_alimentaires')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur deleteDenreeAlimentaire:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('Erreur technique deleteDenreeAlimentaire:', err);
      return { error: err };
    }
  },

  // ==================== STATISTIQUES ====================

  /**
   * Obtenir les statistiques globales pour une année
   * @param {number} annee - Année cible
   * @returns {Promise} Statistiques calculées
   */
  async getStatistiquesAnnee(annee) {
    try {
      // Utiliser la fonction SQL personnalisée
      const { data, error } = await supabase
        .rpc('get_denrees_stats', { target_year: annee });

      if (error) {
        console.error('Erreur getStatistiquesAnnee:', error);
        
        // Fallback : calcul côté client
        return await this.getStatistiquesFallback(annee);
      }

      const stats = data[0] || { total_kg: 0, moyenne_mensuelle: 0, nombre_fournisseurs: 0, meilleur_mois: 0 };
      
      return { 
        data: {
          totalQuantite: parseFloat(stats.total_kg) || 0,
          moyenneMensuelle: parseFloat(stats.moyenne_mensuelle) || 0,
          nombreFournisseurs: parseInt(stats.nombre_fournisseurs) || 0,
          meilleurMois: parseFloat(stats.meilleur_mois) || 0
        }, 
        error: null 
      };
    } catch (err) {
      console.error('Erreur technique getStatistiquesAnnee:', err);
      return await this.getStatistiquesFallback(annee);
    }
  },

  /**
   * Méthode de fallback pour calculer les statistiques côté client
   * @param {number} annee - Année cible
   * @returns {Promise} Statistiques calculées côté client
   */
  async getStatistiquesFallback(annee) {
    try {
      const { data: denrees, error } = await this.getDenreesAlimentaires(annee);
      
      if (error || !denrees) {
        return { data: { totalQuantite: 0, moyenneMensuelle: 0, nombreFournisseurs: 0, meilleurMois: 0 }, error };
      }

      // Filtrer les données réelles (exclure "Total général")
      const denreesReelles = denrees.filter(d => d.fournisseur !== 'Total général');
      
      const totalQuantite = denreesReelles.reduce((sum, d) => sum + parseFloat(d.quantite), 0);
      const moyenneMensuelle = denreesReelles.length > 0 ? totalQuantite / denreesReelles.length : 0;
      const fournisseursUniques = new Set(denreesReelles.map(d => d.fournisseur));
      const meilleurMois = denreesReelles.length > 0 ? Math.max(...denreesReelles.map(d => parseFloat(d.quantite))) : 0;

      return {
        data: {
          totalQuantite,
          moyenneMensuelle,
          nombreFournisseurs: fournisseursUniques.size,
          meilleurMois
        },
        error: null
      };
    } catch (err) {
      console.error('Erreur getStatistiquesFallback:', err);
      return { data: { totalQuantite: 0, moyenneMensuelle: 0, nombreFournisseurs: 0, meilleurMois: 0 }, error: err };
    }
  },

  /**
   * Obtenir la répartition par fournisseur pour une année
   * @param {number} annee - Année cible
   * @returns {Promise} Répartition par fournisseur
   */
  async getRepartitionFournisseurs(annee) {
    try {
      // Utiliser la fonction SQL personnalisée
      const { data, error } = await supabase
        .rpc('get_denrees_by_fournisseur', { target_year: annee });

      if (error) {
        console.error('Erreur getRepartitionFournisseurs:', error);
        return await this.getRepartitionFallback(annee);
      }

      const repartition = data.reduce((acc, item) => {
        acc[item.fournisseur] = parseFloat(item.total_quantite);
        return acc;
      }, {});

      return { data: repartition, error: null };
    } catch (err) {
      console.error('Erreur technique getRepartitionFournisseurs:', err);
      return await this.getRepartitionFallback(annee);
    }
  },

  /**
   * Méthode de fallback pour la répartition par fournisseur
   * @param {number} annee - Année cible
   * @returns {Promise} Répartition calculée côté client
   */
  async getRepartitionFallback(annee) {
    try {
      const { data: denrees, error } = await this.getDenreesAlimentaires(annee);
      
      if (error || !denrees) {
        return { data: {}, error };
      }

      // Filtrer et regrouper par fournisseur
      const repartition = denrees
        .filter(d => d.fournisseur !== 'Total général')
        .reduce((acc, d) => {
          acc[d.fournisseur] = (acc[d.fournisseur] || 0) + parseFloat(d.quantite);
          return acc;
        }, {});

      return { data: repartition, error: null };
    } catch (err) {
      console.error('Erreur getRepartitionFallback:', err);
      return { data: {}, error: err };
    }
  },

  /**
   * Obtenir l'évolution mensuelle pour une année
   * @param {number} annee - Année cible
   * @returns {Promise} Données mensuelles
   */
  async getEvolutionMensuelle(annee) {
    try {
      const { data: denrees, error } = await this.getDenreesAlimentaires(annee);
      
      if (error || !denrees) {
        return { data: Array(12).fill(0), error };
      }

      // Initialiser un tableau de 12 mois à 0
      const evolution = Array(12).fill(0);
      
      // Remplir avec les données réelles (exclure "Total général")
      denrees
        .filter(d => d.fournisseur !== 'Total général')
        .forEach(d => {
          const moisIndex = d.mois - 1; // Convertir 1-12 en 0-11
          if (moisIndex >= 0 && moisIndex < 12) {
            evolution[moisIndex] += parseFloat(d.quantite);
          }
        });

      return { data: evolution, error: null };
    } catch (err) {
      console.error('Erreur getEvolutionMensuelle:', err);
      return { data: Array(12).fill(0), error: err };
    }
  },

  // ==================== FONCTIONS UTILITAIRES ====================

  /**
   * Obtenir la liste des fournisseurs uniques
   * @returns {Promise} Liste des fournisseurs
   */
  async getFournisseurs() {
    try {
      const { data, error } = await supabase
        .from('denrees_alimentaires')
        .select('fournisseur')
        .neq('fournisseur', 'Total général') // Exclure la ligne de synthèse
        .order('fournisseur');

      if (error) {
        console.error('Erreur getFournisseurs:', error);
        return { data: [], error };
      }

      // Extraire les fournisseurs uniques
      const fournisseursUniques = [...new Set(data.map(item => item.fournisseur))];
      
      return { data: fournisseursUniques, error: null };
    } catch (err) {
      console.error('Erreur technique getFournisseurs:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Obtenir la liste des années disponibles
   * @returns {Promise} Liste des années
   */
  async getAnneesDisponibles() {
    try {
      const { data, error } = await supabase
        .from('denrees_alimentaires')
        .select('annee')
        .order('annee', { ascending: false });

      if (error) {
        console.error('Erreur getAnneesDisponibles:', error);
        return { data: [], error };
      }

      // Extraire les années uniques
      const anneesUniques = [...new Set(data.map(item => item.annee))];
      
      return { data: anneesUniques, error: null };
    } catch (err) {
      console.error('Erreur technique getAnneesDisponibles:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Vérifier si une entrée existe déjà (fournisseur + mois + année)
   * @param {string} fournisseur - Nom du fournisseur
   * @param {number} mois - Mois (1-12)
   * @param {number} annee - Année
   * @param {number} excludeId - ID à exclure (pour les modifications)
   * @returns {Promise} True si existe, false sinon
   */
  async checkDuplicateEntry(fournisseur, mois, annee, excludeId = null) {
    try {
      let query = supabase
        .from('denrees_alimentaires')
        .select('id')
        .eq('fournisseur', fournisseur)
        .eq('mois', mois)
        .eq('annee', annee);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur checkDuplicateEntry:', error);
        return { exists: false, error };
      }

      return { exists: data && data.length > 0, error: null };
    } catch (err) {
      console.error('Erreur technique checkDuplicateEntry:', err);
      return { exists: false, error: err };
    }
  },

  // ==================== EXPORT/IMPORT ====================

  /**
   * Exporter les données au format CSV
   * @param {number} annee - Année à exporter (optionnel)
   * @returns {Promise} Données formatées pour export CSV
   */
  async exportCSV(annee = null) {
    try {
      const { data: denrees, error } = await this.getDenreesAlimentaires(annee);
      
      if (error || !denrees) {
        return { data: null, error };
      }

      // Formater les données pour CSV
      const csvData = denrees.map(d => ({
        Fournisseur: d.fournisseur,
        Mois: d.mois,
        Année: d.annee,
        Quantité: d.quantite,
        Unité: d.unite,
        Notes: d.notes || '',
        'Date création': new Date(d.date_creation).toLocaleDateString('fr-FR')
      }));

      return { data: csvData, error: null };
    } catch (err) {
      console.error('Erreur exportCSV:', err);
      return { data: null, error: err };
    }
  },

  // ==================== GESTION DES ERREURS ====================

  /**
   * Formater les erreurs Supabase pour affichage utilisateur
   * @param {Object} error - Erreur Supabase
   * @returns {string} Message d'erreur formaté
   */
  formatError(error) {
    if (!error) return 'Erreur inconnue';
    
    // Erreurs de contrainte unique
    if (error.code === '23505') {
      return 'Cette combinaison fournisseur/mois/année existe déjà';
    }
    
    // Erreurs de validation
    if (error.code === '23514') {
      return 'Données invalides (vérifiez les valeurs saisies)';
    }
    
    // Erreurs d'authentification
    if (error.message?.includes('auth')) {
      return 'Problème d\'authentification';
    }
    
    // Erreur générique
    return error.message || 'Erreur de connexion à la base de données';
  }
};

export default supabaseSecretariat; 