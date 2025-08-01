import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * API Supabase pour la gestion des stocks cuisine
 * Module isolé : stocks + distribution + planning
 */
export const supabaseStockCuisine = {

  // ==================== GESTION DES STOCKS ====================

  /**
   * Récupérer tous les aliments avec stock actuel
   */
  async getStockAliments() {
    try {
      const { data, error } = await supabase
        .from('stock_cuisine')
        .select('*')
        .eq('actif', true)
        .order('categorie')
        .order('nom');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Erreur récupération stocks:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Créer un nouvel aliment
   */
  async createAliment(alimentData) {
    try {
      // Vérifier si l'aliment existe déjà (SEULEMENT parmi les actifs)
      const { data: existing } = await supabase
        .from('stock_cuisine')
        .select('nom')
        .eq('nom', alimentData.nom.trim())
        .eq('actif', true)
        .single();

      if (existing) {
        throw new Error(`L'aliment "${alimentData.nom}" existe déjà`);
      }

      const { data, error } = await supabase
        .from('stock_cuisine')
        .insert([{
          ...alimentData,
          actif: true // S'assurer que l'aliment est actif
        }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur création aliment:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Mettre à jour un aliment
   */
  async updateAliment(id, alimentData) {
    try {
      const { data, error } = await supabase
        .from('stock_cuisine')
        .update(alimentData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur mise à jour aliment:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Ajuster le stock d'un aliment (ajout/retrait manuel)
   */
  async ajusterStock(alimentId, nouvelleQuantite, notes = '') {
    try {
      // 1. Récupérer stock actuel
      const { data: aliment } = await supabase
        .from('stock_cuisine')
        .select('stock_actuel, nom')
        .eq('id', alimentId)
        .single();

      if (!aliment) throw new Error('Aliment non trouvé');

      const stockAvant = parseFloat(aliment.stock_actuel);
      const movement = nouvelleQuantite - stockAvant;

      // 2. Mettre à jour le stock
      const { data, error } = await supabase
        .from('stock_cuisine')
        .update({ stock_actuel: nouvelleQuantite })
        .eq('id', alimentId)
        .select()
        .single();

      if (error) throw error;

      // 3. Créer mouvement historique
      await supabase
        .from('mouvements_stock')
        .insert([{
          aliment_id: alimentId,
          type_mouvement: 'ajustement',
          quantite_avant: stockAvant,
          quantite_mouvement: movement,
          quantite_apres: nouvelleQuantite,
          notes: notes || `Ajustement manuel: ${movement > 0 ? '+' : ''}${movement}`
        }]);

      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur ajustement stock:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Supprimer un aliment
   */
  async deleteAliment(id) {
    try {
      const { error } = await supabase
        .from('stock_cuisine')
        .update({ actif: false })
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ Erreur suppression aliment:', error);
      return { error: error.message };
    }
  },

  // ==================== GESTION DES SITES ====================

  /**
   * Récupérer tous les sites de livraison
   */
  async getSitesLivraison() {
    try {
      const { data, error } = await supabase
        .from('sites_livraison')
        .select('*')
        .eq('actif', true)
        .order('ordre_affichage');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Erreur récupération sites:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Créer un nouveau site
   */
  async createSite(siteData) {
    try {
      const { data, error } = await supabase
        .from('sites_livraison')
        .insert([siteData])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur création site:', error);
      return { data: null, error: error.message };
    }
  },

  // ==================== ENVOIS DIRECTS ====================

  /**
   * Envoyer stock vers un site (action principale de l'interface)
   */
  async envoyerStock(alimentId, siteId, quantite, dateEnvoi, notes = '', zoneEnvoi = null) {
    try {
      // 1. Vérifier stock suffisant
      const { data: aliment } = await supabase
        .from('stock_cuisine')
        .select('stock_actuel, nom, zone_stockage')
        .eq('id', alimentId)
        .single();

      if (!aliment) throw new Error('Aliment non trouvé');
      if (aliment.stock_actuel < quantite) {
        throw new Error(`Stock insuffisant ! Disponible: ${aliment.stock_actuel}`);
      }

      // 2. Déterminer la zone (priorité à zoneEnvoi si fournie)
      const zone = zoneEnvoi || aliment.zone_stockage;

      // 3. Créer l'envoi et déduire le stock manuellement
      const { data, error } = await supabase
        .from('planning_envois')
        .insert([{
          aliment_id: alimentId,
          site_id: siteId,
          quantite: quantite,
          date_envoi: dateEnvoi,
          zone_origine: zone,
          notes: notes
        }])
        .select()
        .single();

      if (error) throw error;

      // 4. Déduire le stock manuellement (puisque pas de trigger complexe)
      const nouveauStock = parseFloat(aliment.stock_actuel) - parseFloat(quantite);
      
      const { error: updateError } = await supabase
        .from('stock_cuisine')
        .update({ stock_actuel: nouveauStock })
        .eq('id', alimentId);

      if (updateError) {
        // En cas d'erreur, supprimer l'envoi créé
        await supabase.from('planning_envois').delete().eq('id', data.id);
        throw updateError;
      }

      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur envoi stock:', error);
      return { data: null, error: error.message };
    }
  },

  // ==================== PLANNING ====================

  /**
   * Récupérer planning complet avec détails (vue enrichie)
   */
  async getPlanningComplet(dateDebut = null, dateFin = null) {
    try {
      let query = supabase.from('v_planning_complet').select('*');
      
      if (dateDebut) {
        query = query.gte('date_envoi', dateDebut);
      }
      if (dateFin) {
        query = query.lte('date_envoi', dateFin);
      }

      const { data, error } = await query.order('date_envoi').order('site_nom');

      if (error) throw error;
      
      // Les couleurs et emojis sont maintenant calculés directement dans la vue
      // Plus besoin de mapping côté frontend
      
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Erreur récupération planning:', error);
      return { data: [], error: error.message };
    }
  },

  /**
   * Modifier un envoi depuis le planning
   */
  async updateEnvoi(envoiId, envoiData) {
    try {
      const { data, error } = await supabase
        .from('planning_envois')
        .update(envoiData)
        .eq('id', envoiId)
        .select(`
          id,
          quantite,
          date_envoi,
          statut,
          notes,
          stock_cuisine:aliment_id(nom, unite, zone_stockage),
          sites_livraison:site_id(nom)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur modification envoi:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Valider un envoi (marquer comme "validé")
   */
  async validerEnvoi(envoiId) {
    try {
      const { data, error } = await supabase
        .from('planning_envois')
        .update({ 
          statut: 'valide',
          date_validation: new Date().toISOString()
        })
        .eq('id', envoiId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('❌ Erreur validation envoi:', error);
      return { data: null, error: error.message };
    }
  },

  /**
   * Supprimer un envoi depuis le planning
   */
  async deleteEnvoi(envoiId) {
    try {
      // Récupérer les détails avant suppression pour restaurer le stock
      const { data: envoi } = await supabase
        .from('planning_envois')
        .select('aliment_id, quantite')
        .eq('id', envoiId)
        .single();

      if (envoi) {
        // Restaurer le stock
        const { data: aliment } = await supabase
          .from('stock_cuisine')
          .select('stock_actuel')
          .eq('id', envoi.aliment_id)
          .single();

        if (aliment) {
          await supabase
            .from('stock_cuisine')
            .update({ 
              stock_actuel: parseFloat(aliment.stock_actuel) + parseFloat(envoi.quantite)
            })
            .eq('id', envoi.aliment_id);
        }
      }

      // Supprimer l'envoi
      const { error } = await supabase
        .from('planning_envois')
        .delete()
        .eq('id', envoiId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('❌ Erreur suppression envoi:', error);
      return { error: error.message };
    }
  },

  // ==================== HISTORIQUE ====================

  /**
   * Récupérer historique des mouvements
   */
  async getHistoriqueStocks(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('v_historique_stocks')
        .select('*')
        .limit(limit);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      return { data: [], error: error.message };
    }
  },

  // ==================== UTILITAIRES ====================

  /**
   * Obtenir les unités disponibles
   */
  getUnitesDisponibles() {
    return ['kg', 'l', 'caisse', 'pièce', 'g', 'ml', 'boîte', 'sac'];
  },

  /**
   * Obtenir les catégories d'aliments
   */
  getCategories() {
    return ['Viande', 'Légume', 'Sauce', 'Plat', 'Boisson', 'Autre'];
  },

  /**
   * Obtenir les zones de stockage avec configuration couleur
   */
  getZonesStockage() {
    return {
      congelateur: { 
        nom: 'Congélateur',
        couleur: '#3B82F6', // Bleu
        emoji: '🔵',
        icon: '❄️'
      },
      frigo: { 
        nom: 'Frigo',
        couleur: '#EF4444', // Rouge  
        emoji: '🔴',
        icon: '🧊'
      },
      ambiant: { 
        nom: 'Température ambiante',
        couleur: '#1F2937', // Noir
        emoji: '⚫',
        icon: '🌡️'
      }
    };
  },

  /**
   * Obtenir les statuts d'envoi
   */
  getStatutsEnvoi() {
    return {
      planifie: { nom: 'Planifié', couleur: '#F59E0B', icon: '📅' },
      valide: { nom: 'Validé', couleur: '#10B981', icon: '✅' },
      livre: { nom: 'Livré', couleur: '#6B7280', icon: '🚚' }
    };
  },

  /**
   * Formater les erreurs pour affichage utilisateur
   */
  formatError(error) {
    if (typeof error === 'string') return error;
    
    // Erreurs communes Supabase
    const errorMap = {
      'unique_violation': 'Cet élément existe déjà',
      'foreign_key_violation': 'Référence invalide',
      'check_violation': 'Valeur non autorisée',
      'not_null_violation': 'Champ obligatoire manquant'
    };

    return errorMap[error.code] || error.message || 'Erreur inconnue';
  }
};

export default supabaseStockCuisine; 