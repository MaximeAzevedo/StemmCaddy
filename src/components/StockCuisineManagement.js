import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  ArrowLeft,
  Plus,
  Send,
  Calendar,
  Package,
  CheckCircle,
  X,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
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
  
  // États pour l'envoi direct
  const [envoiData, setEnvoiData] = useState({});
  const [sending, setSending] = useState({});
  
  // États pour l'organisation et filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('all');
  const [showZeroStock, setShowZeroStock] = useState(true);
  const [editingStockId, setEditingStockId] = useState(null);
  const [newStockValue, setNewStockValue] = useState('');
  
  // État pour le formulaire d'ajout d'aliment
  const [formAliment, setFormAliment] = useState({
    nom: '',
    categorie: '',
    unite: 'kg',
    stockInitial: '',
    zoneStockage: 'congelateur'
  });
  
  // État pour la navigation semaine
  const [semaineActuelle, setSemaineActuelle] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Configuration des zones de stockage
  const zonesStockage = supabaseStockCuisine.getZonesStockage();
  // const statutsEnvoi = supabaseStockCuisine.getStatutsEnvoi(); // Simplifié - plus de statuts

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

  // Fonction handleAjusterStock supprimée - remplacée par saisie directe

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

  const handleSaveStock = async (alimentId, newValue = null) => {
    // Si newValue n'est pas fourni, utiliser newStockValue du state (pour l'édition inline)
    const stockValue = newValue !== null ? newValue : parseFloat(newStockValue);
    
    if (isNaN(stockValue) || stockValue < 0) {
      toast.error('Veuillez saisir une quantité valide');
      return;
    }

    try {
      const result = await supabaseStockCuisine.ajusterStock(alimentId, stockValue, 'Ajustement manuel');
      
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

  // Ordre prioritaire des catégories (Viande en premier)
  const ordreCategories = ['Viande', 'Plat', 'Sauce', 'Légume'];
  
  // Obtenir les catégories disponibles dans l'ordre prioritaire
  const categories = [...new Set(aliments.map(a => a.categorie))]
    .sort((a, b) => {
      const indexA = ordreCategories.indexOf(a);
      const indexB = ordreCategories.indexOf(b);
      // Si catégorie non trouvée dans ordre prioritaire, mettre à la fin
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  // ==================== GESTION AJOUT ALIMENT ====================

  const handleAjouterAliment = async (e) => {
    e.preventDefault();
    
    if (!formAliment.nom.trim()) {
      toast.error('Veuillez saisir un nom d\'aliment');
      return;
    }
    
    if (!formAliment.categorie) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }
    
    const stockInitial = parseFloat(formAliment.stockInitial);
    if (isNaN(stockInitial) || stockInitial < 0) {
      toast.error('Veuillez saisir un stock initial valide');
      return;
    }

    setLoading(true);

    try {
      const result = await supabaseStockCuisine.createAliment({
        nom: formAliment.nom.trim(),
        categorie: formAliment.categorie,
        unite: formAliment.unite,
        stock_actuel: stockInitial,
        zone_stockage: formAliment.zoneStockage
      });
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(`"${formAliment.nom}" ajouté avec succès`);
      
      // Réinitialiser le formulaire
      setFormAliment({
        nom: '',
        categorie: '',
        unite: 'kg',
        stockInitial: '',
        zoneStockage: 'congelateur'
      });
      
      setShowAddAliment(false);
      loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur ajout aliment:', error);
      toast.error('Erreur technique lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

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

  // Fonction handleValiderEnvoi supprimée - plus de validation manuelle

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
        {ordreCategories
          .filter(categorie => alimentsParCategorie[categorie]?.length > 0)
          .map(categorie => {
            const alimentsCategorie = alimentsParCategorie[categorie];
            return (
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
                      Envoi Direct (Qté, Site, Zone, Date)
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
                        <div className="flex flex-wrap items-center gap-2">
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
                          <input
                            type="date"
                            value={envoiData[aliment.id]?.dateEnvoi || format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                            onChange={(e) => updateEnvoiData(aliment.id, 'dateEnvoi', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={aliment.stock_actuel === 0}
                            min={format(new Date(), 'yyyy-MM-dd')}
                          />
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
        );
        })}
        
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

  // ==================== NAVIGATION SEMAINES ====================
  
  const naviguerSemaine = (direction) => {
    setSemaineActuelle(prev => 
      direction === 'precedente' 
        ? subWeeks(prev, 1) 
        : addWeeks(prev, 1)
    );
  };

  const renderPlanning = () => {
    // Calculer les dates de la semaine courante (lundi à vendredi seulement)
    const debutSemaine = startOfWeek(semaineActuelle, { weekStartsOn: 1 });
    const finSemaine = endOfWeek(semaineActuelle, { weekStartsOn: 1 });
    
    // Générer les dates de la semaine de travail (lundi à vendredi)
    const datesSemaine = [];
    for (let i = 0; i < 5; i++) { // 0-4 = Lun-Ven
      datesSemaine.push(format(addDays(debutSemaine, i), 'yyyy-MM-dd'));
    }
    
    // Filtrer les envois de la semaine courante
    const planningGroupe = planning
      .filter(envoi => {
        const dateEnvoi = envoi.date_envoi;
        return dateEnvoi >= format(debutSemaine, 'yyyy-MM-dd') && 
               dateEnvoi <= format(finSemaine, 'yyyy-MM-dd');
      })
      .reduce((acc, envoi) => {
        const date = envoi.date_envoi;
        if (!acc[date]) acc[date] = {};
        if (!acc[date][envoi.site_nom]) acc[date][envoi.site_nom] = [];
        acc[date][envoi.site_nom].push(envoi);
        return acc;
      }, {});

    const sitesUniques = [...new Set(planning.map(p => p.site_nom))];

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header avec navigation */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Planning Distribution</h3>
            
            {/* Navigation semaines */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => naviguerSemaine('precedente')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={16} />
                Semaine précédente
              </button>
              
              <div className="text-center">
                <div className="font-medium text-gray-900">
                  {format(startOfWeek(semaineActuelle, { weekStartsOn: 1 }), 'dd/MM', { locale: fr })} - {format(endOfWeek(semaineActuelle, { weekStartsOn: 1 }), 'dd/MM/yyyy', { locale: fr })}
                </div>
                <div className="text-xs text-gray-500">
                  Semaine {format(semaineActuelle, 'w', { locale: fr })}
                </div>
              </div>
              
              <button
                onClick={() => naviguerSemaine('suivante')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Semaine suivante
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tableau style amélioré */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <th className="border border-gray-300 px-6 py-4 text-left font-semibold text-gray-800 bg-white shadow-sm">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-blue-600" />
                    Sites
                  </div>
                </th>
                {datesSemaine.map(date => (
                  <th key={date} className="border border-gray-300 px-4 py-4 text-center font-semibold text-gray-800 min-w-[220px] bg-gradient-to-b from-gray-50 to-white">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">
                        {format(new Date(date), 'EEEE', { locale: fr })}
                      </span>
                      <span className="text-xs text-gray-600 mt-1">
                        {format(new Date(date), 'dd/MM', { locale: fr })}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sitesUniques.map((site, index) => (
                <tr key={site} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="border border-gray-300 px-6 py-4 font-semibold text-gray-900 bg-gradient-to-r from-gray-100 to-gray-50 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {site}
                    </div>
                  </td>
                  {datesSemaine.map(date => (
                    <td key={`${site}-${date}`} className="border border-gray-300 px-3 py-3 align-top">
                      <div className="space-y-2">
                        {(planningGroupe[date]?.[site] || []).map(envoi => (
                          <div
                            key={envoi.id}
                            className="flex items-center justify-between p-3 rounded-lg border-l-4 text-sm shadow-sm hover:shadow-md transition-shadow"
                            style={{ 
                              borderLeftColor: envoi.couleur_affichage,
                              backgroundColor: envoi.couleur_affichage + '15'
                            }}
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 flex items-center gap-2">
                                <span className="text-lg">{envoi.emoji_zone}</span>
                                <span>{envoi.quantite}{envoi.unite}</span>
                                <span className="text-gray-700">{envoi.aliment_nom}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              {/* Bouton supprimer stylé */}
                              <button
                                onClick={() => handleSupprimerEnvoi(envoi.id)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"
                                title="Supprimer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {/* Message si aucun envoi */}
                        {(planningGroupe[date]?.[site] || []).length === 0 && (
                          <div className="text-center py-4 text-gray-400 text-xs">
                            Aucun envoi
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Légende améliorée */}
        <div className="px-6 py-4 border-t border-gray-300 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center justify-center gap-8 text-sm">
            <span className="font-semibold text-gray-800">Zones de stockage :</span>
            {Object.entries(zonesStockage).map(([key, zone]) => (
              <div key={key} className="flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm border">
                <span className="text-lg">{zone.emoji}</span>
                <span className="font-medium text-gray-700">{zone.nom}</span>
              </div>
            ))}
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

{/* ==================== MODAL AJOUT ALIMENT ==================== */}
<AnimatePresence>
  {showAddAliment && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowAddAliment(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Nouvel Aliment</h3>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleAjouterAliment} className="p-6 space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'aliment *
            </label>
            <input
              type="text"
              value={formAliment.nom}
              onChange={(e) => setFormAliment(prev => ({ ...prev, nom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Bœuf 1ère qualité"
              required
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie *
            </label>
            <select
              value={formAliment.categorie}
              onChange={(e) => setFormAliment(prev => ({ ...prev, categorie: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner...</option>
              {ordreCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Unité et Stock initial */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unité *
              </label>
              <select
                value={formAliment.unite}
                onChange={(e) => setFormAliment(prev => ({ ...prev, unite: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="kg">kg</option>
                <option value="litres">litres</option>
                <option value="caisses">caisses</option>
                <option value="pièces">pièces</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock initial *
              </label>
              <input
                type="number"
                value={formAliment.stockInitial}
                onChange={(e) => setFormAliment(prev => ({ ...prev, stockInitial: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
                step="0.1"
                required
              />
            </div>
          </div>

          {/* Zone de stockage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zone de stockage *
            </label>
            <select
              value={formAliment.zoneStockage}
              onChange={(e) => setFormAliment(prev => ({ ...prev, zoneStockage: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="congelateur">🔵 Congélateur</option>
              <option value="frigo">🔴 Frigo</option>
              <option value="ambiant">⚫ Ambiant</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddAliment(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
</div>
);
};

export default StockCuisineManagement; 