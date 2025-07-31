import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  ArrowLeft,
  Plus,
  Send,
  Calendar,
  Package,
  Settings,
  CheckCircle,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabaseStockCuisine } from '../lib/supabase-stock-cuisine';

const StockCuisineManagement = ({ user, onLogout }) => {
  const navigate = useNavigate();
  
  // États principaux
  const [activeTab, setActiveTab] = useState('stocks'); // stocks | planning
  const [loading, setLoading] = useState(true);
  const [aliments, setAliments] = useState([]);
  const [sites, setSites] = useState([]);
  const [planning, setPlanning] = useState([]);
  
  // États pour les modals
  const [showAddAliment, setShowAddAliment] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [editingAliment, setEditingAliment] = useState(null);
  
  // États pour l'envoi direct
  const [envoiData, setEnvoiData] = useState({});
  const [sending, setSending] = useState({});
  
  // États pour l'organisation et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('all');
  const [showZeroStock, setShowZeroStock] = useState(true);
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');

  // Configuration des zones de stockage
  const zonesStockage = supabaseStockCuisine.getZonesStockage();
  const statutsEnvoi = supabaseStockCuisine.getStatutsEnvoi();

  // ==================== CHARGEMENT DES DONNÉES ====================

  const loadData = useCallback(async () => {
    setLoading(true);
    
    try {
      const [alimentsResult, sitesResult, planningResult] = await Promise.all([
        supabaseStockCuisine.getStockAliments(),
        supabaseStockCuisine.getSitesLivraison(),
        supabaseStockCuisine.getPlanningComplet(
          format(new Date(), 'yyyy-MM-dd'),
          format(addDays(new Date(), 7), 'yyyy-MM-dd')
        )
      ]);

      if (alimentsResult.error) throw new Error(alimentsResult.error);
      if (sitesResult.error) throw new Error(sitesResult.error);
      if (planningResult.error) throw new Error(planningResult.error);

      setAliments(alimentsResult.data);
      setSites(sitesResult.data);
      setPlanning(planningResult.data);
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      toast.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== GESTION DES STOCKS ====================

  const handleAjusterStock = async (alimentId, nouvelleQuantite) => {
    try {
      const result = await supabaseStockCuisine.ajusterStock(alimentId, nouvelleQuantite);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Stock mis à jour');
      loadData();
    } catch (error) {
      toast.error('Erreur ajustement stock');
    }
  };

    const handleSupprimerAliment = async (alimentId) => {
    const aliment = aliments.find(a => a.id === alimentId);
    
    if (!window.confirm(`Supprimer "${aliment?.nom}" ? Cette action est irréversible.`)) return;

    try {
      const result = await supabaseStockCuisine.deleteAliment(alimentId);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Aliment supprimé');
      loadData();
    } catch (error) {
      toast.error('Erreur suppression aliment');
    }
  };

  // ==================== GESTION ÉDITION STOCK DIRECT ====================

  const handleEditStock = (alimentId, currentStock) => {
    setEditingStockId(alimentId);
    setNewStockValue(currentStock.toString());
  };

  const handleSaveStock = async (alimentId) => {
    const newValue = parseFloat(newStockValue);
    
    if (isNaN(newValue) || newValue < 0) {
      toast.error('Veuillez saisir une quantité valide');
      return;
    }

    try {
      const result = await supabaseStockCuisine.ajusterStock(alimentId, newValue, 'Ajustement manuel');
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Stock mis à jour');
      setEditingStockId(null);
      setNewStockValue('');
      loadData();
    } catch (error) {
      toast.error('Erreur ajustement stock');
    }
  };

  const handleCancelEditStock = () => {
    setEditingStockId(null);
    setNewStockValue('');
  };

  // ==================== FILTRAGE ET ORGANISATION ====================

  const filteredAliments = aliments.filter(aliment => {
    // Filtre par recherche
    const matchesSearch = aliment.nom.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre par catégorie
    const matchesCategorie = selectedCategorie === 'all' || aliment.categorie === selectedCategorie;
    
    // Filtre par stock
    const hasStock = showZeroStock || aliment.stock_actuel > 0;
    
    return matchesSearch && matchesCategorie && hasStock;
  });

  // Grouper par catégorie
  const alimentsParCategorie = filteredAliments.reduce((acc, aliment) => {
    if (!acc[aliment.categorie]) acc[aliment.categorie] = [];
    acc[aliment.categorie].push(aliment);
    return acc;
  }, {});

  // Obtenir les catégories disponibles
  const categories = [...new Set(aliments.map(a => a.categorie))].sort();

  // ==================== ENVOI DIRECT ====================

  const handleEnvoyerStock = async (alimentId) => {
    const envoi = envoiData[alimentId];
    if (!envoi?.quantite || !envoi?.siteId) {
      toast.error('Veuillez saisir une quantité et sélectionner un site');
      return;
    }

    setSending(prev => ({ ...prev, [alimentId]: true }));

    try {
      const dateEnvoi = envoi.dateEnvoi || format(addDays(new Date(), 1), 'yyyy-MM-dd');
      const zoneEnvoi = envoi.zone || aliments.find(a => a.id === alimentId)?.zone_stockage || 'congelateur';
      
      const result = await supabaseStockCuisine.envoyerStock(
        alimentId,
        envoi.siteId,
        parseFloat(envoi.quantite),
        dateEnvoi,
        envoi.notes,
        zoneEnvoi
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const site = sites.find(s => s.id === envoi.siteId);
      toast.success(`✅ ${envoi.quantite}kg → ${site?.nom}`);

      // Réinitialiser le formulaire d'envoi
      setEnvoiData(prev => ({ ...prev, [alimentId]: {} }));
      
      // Recharger les données
      loadData();
      
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(prev => ({ ...prev, [alimentId]: false }));
    }
  };

  const updateEnvoiData = (alimentId, field, value) => {
    setEnvoiData(prev => ({
      ...prev,
      [alimentId]: {
        ...prev[alimentId],
        [field]: value
      }
    }));
  };

  // ==================== GESTION DU PLANNING ====================

  const handleValiderEnvoi = async (envoiId) => {
    try {
      const result = await supabaseStockCuisine.validerEnvoi(envoiId);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Envoi validé');
      loadData();
    } catch (error) {
      toast.error('Erreur validation envoi');
    }
  };

  const handleSupprimerEnvoi = async (envoiId) => {
    if (!window.confirm('Supprimer cet envoi ? Le stock sera restauré.')) return;

    try {
      const result = await supabaseStockCuisine.deleteEnvoi(envoiId);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Envoi supprimé et stock restauré');
      loadData();
    } catch (error) {
      toast.error('Erreur suppression envoi');
    }
  };

  // ==================== RENDU TABLEAU STOCKS ====================

  const renderTableauStocks = () => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Inventaire & Envoi Direct</h3>
          <button
            onClick={() => setShowAddAliment(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nouvel Aliment
          </button>
        </div>
        
        {/* Filtres et recherche */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Recherche */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher un aliment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Filtre catégorie */}
          <select
            value={selectedCategorie}
            onChange={(e) => setSelectedCategorie(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}s</option>
            ))}
          </select>
          
          {/* Toggle stock zéro */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showZeroStock}
              onChange={(e) => setShowZeroStock(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Afficher stock = 0
          </label>
          
          {/* Compteur résultats */}
          <span className="text-sm text-gray-500">
            {filteredAliments.length} article{filteredAliments.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Contenu par catégorie */}
      <div className="divide-y divide-gray-200">
        {Object.entries(alimentsParCategorie).map(([categorie, alimentsCategorie]) => (
          <div key={categorie} className="p-6">
            {/* Header de catégorie */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>{categorie === 'Viande' ? '🥩' : categorie === 'Plat' ? '🍲' : categorie === 'Sauce' ? '🧄' : '🥬'}</span>
                {categorie}s ({alimentsCategorie.length})
              </h4>
              <span className="text-sm text-gray-500">
                {alimentsCategorie.filter(a => a.stock_actuel > 0).length} avec stock
              </span>
            </div>
            
            {/* Tableau pour cette catégorie */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Actuel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Envoi Direct
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alimentsCategorie.map((aliment) => (
                    <tr key={aliment.id} className={`hover:bg-gray-50 ${aliment.stock_actuel === 0 ? 'opacity-60' : ''}`}>
                      {/* Article */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {zonesStockage[aliment.zone_stockage]?.emoji || '🔵'}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">{aliment.nom}</div>
                            <div className="text-xs text-gray-500">{aliment.unite}</div>
                          </div>
                        </div>
                      </td>

                      {/* Stock avec édition directe */}
                      <td className="px-4 py-4">
                        {editingStockId === aliment.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={newStockValue}
                              onChange={(e) => setNewStockValue(e.target.value)}
                              className="w-20 px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              min="0"
                              step="0.1"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveStock(aliment.id)}
                              className="p-1 text-green-600 hover:text-green-800"
                              title="Sauvegarder"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={handleCancelEditStock}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Annuler"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span 
                              className={`font-mono text-lg cursor-pointer hover:bg-blue-50 px-2 py-1 rounded ${
                                aliment.stock_actuel === 0 ? 'text-gray-400' : 'text-gray-900'
                              }`}
                              onClick={() => handleEditStock(aliment.id, aliment.stock_actuel)}
                              title="Cliquer pour modifier"
                            >
                              {aliment.stock_actuel}
                            </span>
                            <span className="text-sm text-gray-500">{aliment.unite}</span>
                          </div>
                        )}
                      </td>

                      {/* Envoi direct amélioré */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Qté"
                            value={envoiData[aliment.id]?.quantite || ''}
                            onChange={(e) => updateEnvoiData(aliment.id, 'quantite', e.target.value)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            max={aliment.stock_actuel}
                            disabled={aliment.stock_actuel === 0}
                          />
                          <select
                            value={envoiData[aliment.id]?.siteId || ''}
                            onChange={(e) => updateEnvoiData(aliment.id, 'siteId', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={aliment.stock_actuel === 0}
                          >
                            <option value="">Site</option>
                            {sites.map(site => (
                              <option key={site.id} value={site.id}>{site.nom}</option>
                            ))}
                          </select>
                          <select
                            value={envoiData[aliment.id]?.zone || aliment.zone_stockage}
                            onChange={(e) => updateEnvoiData(aliment.id, 'zone', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={aliment.stock_actuel === 0}
                          >
                            <option value="congelateur">🔵 Congélateur</option>
                            <option value="frigo">🔴 Frigo</option>
                            <option value="ambiant">⚫ Ambiant</option>
                          </select>
                          <button
                            onClick={() => handleEnvoyerStock(aliment.id)}
                            disabled={sending[aliment.id] || !envoiData[aliment.id]?.quantite || !envoiData[aliment.id]?.siteId || aliment.stock_actuel === 0}
                            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Envoyer"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingAliment(aliment)}
                            className="p-1 text-gray-600 hover:text-gray-900"
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleSupprimerAliment(aliment.id)}
                            className="p-1 text-red-600 hover:text-red-900"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        
        {/* Message si aucun résultat */}
        {Object.keys(alimentsParCategorie).length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucun aliment trouvé</p>
            <p className="text-sm">Essayez de modifier vos filtres de recherche</p>
            {!showZeroStock && (
              <button
                onClick={() => setShowZeroStock(true)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Afficher les articles sans stock
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ==================== RENDU PLANNING ====================

  const renderPlanning = () => {
    // Grouper les envois par date puis par site
    const planningGroupe = planning.reduce((acc, envoi) => {
      const date = envoi.date_envoi;
      if (!acc[date]) acc[date] = {};
      if (!acc[date][envoi.site_nom]) acc[date][envoi.site_nom] = [];
      acc[date][envoi.site_nom].push(envoi);
      return acc;
    }, {});

    const dates = Object.keys(planningGroupe).sort();
    const sitesUniques = [...new Set(planning.map(p => p.site_nom))];

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Planning Distribution</h3>
        </div>

        {/* Tableau style Excel */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-medium text-gray-900">
                  Sites
                </th>
                {dates.map(date => (
                  <th key={date} className="border border-gray-200 px-4 py-3 text-center font-medium text-gray-900 min-w-[200px]">
                    {format(new Date(date), 'EEE dd/MM', { locale: fr })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sitesUniques.map(site => (
                <tr key={site}>
                  <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900 bg-gray-50">
                    {site}
                  </td>
                  {dates.map(date => (
                    <td key={`${site}-${date}`} className="border border-gray-200 px-2 py-2 align-top">
                      <div className="space-y-1">
                        {(planningGroupe[date]?.[site] || []).map(envoi => (
                          <div
                            key={envoi.id}
                            className="flex items-center justify-between p-2 rounded border-l-4 text-sm"
                            style={{ 
                              borderLeftColor: envoi.couleur_affichage,
                              backgroundColor: envoi.couleur_affichage + '10'
                            }}
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {envoi.emoji_zone} {envoi.quantite}{envoi.unite} {envoi.aliment_nom}
                              </div>
                              {envoi.notes && (
                                <div className="text-xs text-gray-500 mt-1">{envoi.notes}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {/* Statut */}
                              <span
                                className="px-2 py-1 text-xs rounded-full"
                                style={{
                                  backgroundColor: statutsEnvoi[envoi.statut]?.couleur + '20',
                                  color: statutsEnvoi[envoi.statut]?.couleur
                                }}
                              >
                                {statutsEnvoi[envoi.statut]?.icon}
                              </span>
                              
                              {/* Actions */}
                              {envoi.statut === 'planifie' && (
                                <>
                                  <button
                                    onClick={() => handleValiderEnvoi(envoi.id)}
                                    className="p-1 text-green-600 hover:text-green-800"
                                    title="Valider"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleSupprimerEnvoi(envoi.id)}
                                    className="p-1 text-red-600 hover:text-red-800"
                                    title="Supprimer"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-900">Zones:</span>
              {Object.entries(zonesStockage).map(([key, zone]) => (
                <div key={key} className="flex items-center gap-1">
                  <span>{zone.emoji}</span>
                  <span className="text-gray-600">{zone.nom}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-900">Statuts:</span>
              {Object.entries(statutsEnvoi).map(([key, statut]) => (
                <div key={key} className="flex items-center gap-1">
                  <span>{statut.icon}</span>
                  <span className="text-gray-600">{statut.nom}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RENDU PRINCIPAL ====================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des stocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/cuisine')}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Gestion des Stocks</h1>
                <p className="text-sm text-gray-500">Inventaire & Distribution</p>
              </div>
            </div>

            {/* Navigation onglets */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('stocks')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'stocks'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Package size={16} className="inline-block mr-2" />
                Stocks
              </button>
              <button
                onClick={() => setActiveTab('planning')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'planning'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar size={16} className="inline-block mr-2" />
                Planning
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'stocks' && renderTableauStocks()}
            {activeTab === 'planning' && renderPlanning()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StockCuisineManagement; 