import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  ScaleIcon,
  BuildingStorefrontIcon,
  TrophyIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { supabaseSecretariat } from '../lib/supabase-secretariat';

// Configuration Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const statsAccueil = [
  {
    label: "Dossiers traités",
    value: 124,
    icon: ChartBarIcon,
    color: "bg-blue-100 text-blue-600"
  },
  {
    label: "Partenaires",
    value: 8,
    icon: BuildingStorefrontIcon,
    color: "bg-green-100 text-green-600"
  },
  {
    label: "Alertes en cours",
    value: 2,
    icon: ExclamationTriangleIcon,
    color: "bg-red-100 text-red-600"
  }
];

const actionsAccueil = [
  {
    title: "Tableau de bord",
    description: "Visualiser les statistiques et l'analyse des données",
    icon: ChartBarIcon,
    color: "from-blue-500 to-indigo-600",
    tab: "dashboard"
  },
  {
    title: "Saisie des données",
    description: "Ajouter ou modifier les données du secrétariat",
    icon: DocumentTextIcon,
    color: "from-purple-500 to-pink-500",
    tab: "saisie"
  }
];

const SecretariatManagement = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('accueil');
  const [denrees, setDenrees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableFournisseurs, setAvailableFournisseurs] = useState([]);
  
  const [formData, setFormData] = useState({
    fournisseur: '',
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
    quantite: '',
    unite: 'kg',
    notes: ''
  });

  const mois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const unites = ['kg', 'tonnes', 'palettes', 'colis'];

  // Charger les données depuis Supabase
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les données en parallèle
      const [denreesRes, anneesRes, fournisseursRes] = await Promise.all([
        supabaseSecretariat.getDenreesAlimentaires(),
        supabaseSecretariat.getAnneesDisponibles(),
        supabaseSecretariat.getFournisseurs()
      ]);

      if (denreesRes.error) {
        console.error('Erreur chargement denrées:', denreesRes.error);
        toast.error(`Erreur de chargement des données: ${denreesRes.error.message || 'Inconnue'}`);
      } else {
        setDenrees(denreesRes.data || []);
      }

      if (anneesRes.error) {
        console.error('Erreur chargement années:', anneesRes.error);
        setAvailableYears([2024, 2025, 2026]); // Fallback
      } else {
        setAvailableYears(anneesRes.data.length > 0 ? anneesRes.data : [2024, 2025, 2026]);
      }

      if (fournisseursRes.error) {
        console.error('Erreur chargement fournisseurs:', fournisseursRes.error);
        setAvailableFournisseurs(['Auchan', 'Banque Alimentaire']); // Fallback
      } else {
        setAvailableFournisseurs(fournisseursRes.data.length > 0 ? fournisseursRes.data : ['Auchan', 'Banque Alimentaire']);
      }

    } catch (error) {
      console.error('Erreur technique loadData:', error);
      toast.error('Erreur technique de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Initialiser le formulaire avec le premier fournisseur disponible
  useEffect(() => {
    if (availableFournisseurs.length > 0 && !formData.fournisseur) {
      setFormData(prev => ({
        ...prev,
        fournisseur: availableFournisseurs[0]
      }));
    }
  }, [availableFournisseurs, formData.fournisseur]);

  // Ajouter/modifier une entrée
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.quantite || formData.quantite <= 0) {
      toast.error('Veuillez saisir une quantité valide');
      return;
    }

    if (!formData.fournisseur) {
      toast.error('Veuillez sélectionner un fournisseur');
      return;
    }

    setSubmitting(true);

    try {
      // Vérifier les doublons (sauf si on modifie)
      if (!editingItem) {
        const duplicateCheck = await supabaseSecretariat.checkDuplicateEntry(
          formData.fournisseur,
          parseInt(formData.mois),
          parseInt(formData.annee)
        );

        if (duplicateCheck.exists) {
          toast.error('Une entrée existe déjà pour ce fournisseur, ce mois et cette année');
          setSubmitting(false);
          return;
        }
      }

      const denreeData = {
        fournisseur: formData.fournisseur,
        mois: parseInt(formData.mois),
        annee: parseInt(formData.annee),
        quantite: parseFloat(formData.quantite),
        unite: formData.unite,
        notes: formData.notes
      };

      let result;
      if (editingItem) {
        result = await supabaseSecretariat.updateDenreeAlimentaire(editingItem.id, denreeData);
        if (!result.error) {
          toast.success('Entrée modifiée avec succès');
        }
      } else {
        result = await supabaseSecretariat.createDenreeAlimentaire(denreeData);
        if (!result.error) {
          toast.success('Nouvelle entrée ajoutée');
        }
      }

      if (result.error) {
        const errorMessage = supabaseSecretariat.formatError(result.error);
        toast.error(errorMessage);
      } else {
        await loadData(); // Recharger les données
        closeModal();
      }

    } catch (error) {
      console.error('Erreur handleSubmit:', error);
      toast.error('Erreur technique lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  // Supprimer une entrée
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      return;
    }

    try {
      const result = await supabaseSecretariat.deleteDenreeAlimentaire(id);
      
      if (result.error) {
        const errorMessage = supabaseSecretariat.formatError(result.error);
        toast.error(errorMessage);
      } else {
        toast.success('Entrée supprimée');
        await loadData(); // Recharger les données
      }
    } catch (error) {
      console.error('Erreur handleDelete:', error);
      toast.error('Erreur technique lors de la suppression');
    }
  };

  // Ouvrir/fermer modal
  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        fournisseur: item.fournisseur,
        mois: item.mois,
        annee: item.annee,
        quantite: item.quantite.toString(),
        unite: item.unite,
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        fournisseur: availableFournisseurs[0] || '',
        mois: new Date().getMonth() + 1,
        annee: new Date().getFullYear(),
        quantite: '',
        unite: 'kg',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  // Calculer les statistiques à partir des données Supabase
  const calculateStats = () => {
    const currentYearData = denrees.filter(item => 
      item.annee === selectedYear && item.fournisseur !== 'Total général'
    );
    
    const totalQuantite = currentYearData.reduce((sum, item) => sum + parseFloat(item.quantite), 0);
    
    const parFournisseur = currentYearData.reduce((acc, item) => {
      acc[item.fournisseur] = (acc[item.fournisseur] || 0) + parseFloat(item.quantite);
      return acc;
    }, {});

    const parMois = Array.from({ length: 12 }, (_, i) => {
      const moisData = currentYearData.filter(item => item.mois === i + 1);
      return moisData.reduce((sum, item) => sum + parseFloat(item.quantite), 0);
    });

    // Calcul correct de la moyenne mensuelle (diviser par 12 mois, pas par nombre d'entrées)
    const moisAvecDonnees = parMois.filter(m => m > 0).length;
    const moyenneMensuelle = moisAvecDonnees > 0 ? totalQuantite / moisAvecDonnees : 0;

    return { totalQuantite, parFournisseur, parMois, moyenneMensuelle };
  };

  const stats = calculateStats();

  // Données pour les graphiques - supprimées car intégrées directement dans les composants

  const exportToCSV = async () => {
    try {
      const result = await supabaseSecretariat.exportCSV(selectedYear);
      
      if (result.error) {
        toast.error('Erreur lors de l\'export');
        return;
      }

      const csvData = result.data.filter(item => item.Fournisseur !== 'Total général');
      
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `denrees_alimentaires_${selectedYear}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export CSV réussi');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur technique lors de l\'export');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'accueil') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 pb-16">
        {/* Header central premium */}
        <div className="flex flex-col items-center pt-12 pb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-xl">
            <ScaleIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 text-center">Gestion Secrétariat</h1>
          <p className="text-gray-500 text-lg text-center max-w-2xl mb-2">
            Gérez les dossiers, partenaires, alertes et la saisie des données du secrétariat.
          </p>
        </div>

        {/* Statistiques premium */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 px-4">
          {statsAccueil.map((stat, i) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${stat.color}`}>
                <stat.icon className="w-7 h-7" />
              </div>
              <p className="text-gray-500 font-medium mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Actions Rapides premium */}
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {actionsAccueil.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.03 }}
                className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer group transition-all duration-300"
                onClick={() => setActiveTab(action.tab)}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:shadow-lg transition-all duration-300`}>
                  <action.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-gray-500 text-sm">{action.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ScaleIcon className="w-8 h-8 text-gray-800 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Gestion Denrées Alimentaires</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">{user?.email}</span>
              <button
                onClick={onLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'dashboard', name: 'Tableau de bord', icon: ChartBarIcon },
              { id: 'saisie', name: 'Saisie des données', icon: DocumentTextIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Sélecteur d'année */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Année de consultation
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Message informatif si pas de données */}
              {!loading && stats.totalQuantite === 0 && (
                <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-amber-800">
                        Aucune donnée trouvée pour {selectedYear}
                      </h3>
                      <p className="text-amber-700 mt-1">
                        Commencez par ajouter des données via l'onglet "Saisie des données" ou vérifiez que la base de données est bien configurée.
                      </p>
                      <button
                        onClick={() => setActiveTab('saisie')}
                        className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                      >
                        Ajouter des données maintenant
                        <ArrowRightOnRectangleIcon className="ml-2 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* KPIs Premium */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <motion.div 
                  className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <ScaleIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Récupéré</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {loading ? '...' : stats.totalQuantite.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">kg récupérés en {selectedYear}</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            🌱 Anti-gaspillage
                          </span>
                        </div>
                        {!loading && stats.totalQuantite > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>≈ {(stats.totalQuantite / 1000).toFixed(1)} tonnes</span>
                              <span className="text-emerald-600 font-medium">📈 Objectif dépassé</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <BuildingStorefrontIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Partenaires</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {loading ? '...' : Object.keys(stats.parFournisseur).length}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Fournisseurs actifs</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            🤝 Réseau solidaire
                          </span>
                        </div>
                        {!loading && Object.keys(stats.parFournisseur).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500">
                              Principaux : {Object.keys(stats.parFournisseur).slice(0, 2).join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <ChartBarIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Moyenne</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {loading ? '...' : Math.round(stats.moyenneMensuelle).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">kg/mois en moyenne</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            📊 Performance
                          </span>
                        </div>
                        {!loading && stats.moyenneMensuelle > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500">
                              ≈ {Math.round(stats.moyenneMensuelle / 30)} kg/jour
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                          <TrophyIcon className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Record</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {loading ? '...' : Math.round(Math.max(...stats.parMois)).toLocaleString()}
          </p>
        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Meilleur mois (kg)</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            🏆 Excellence
                          </span>
                        </div>
                        {!loading && Math.max(...stats.parMois) > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500">
                              {mois[stats.parMois.indexOf(Math.max(...stats.parMois))]} - Performance max
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* En-tête avec titre et export */}
              {stats.totalQuantite > 0 && (
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Analytiques {selectedYear}</h2>
                    <p className="text-gray-600 mt-1">Analyse détaillée des récupérations alimentaires</p>
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span className="font-medium">Exporter CSV</span>
                  </button>
                </div>
              )}

              {/* Graphiques Premium côte à côte */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Répartition par fournisseur */}
                <motion.div 
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Répartition par fournisseur</h3>
                      <p className="text-sm text-gray-500 mt-1">Distribution des volumes récupérés</p>
                    </div>
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  </div>
                  <div className="h-80 flex items-center justify-center">
                    {Object.keys(stats.parFournisseur).length > 0 ? (
                      <Pie 
                        data={{
                          labels: Object.keys(stats.parFournisseur),
                          datasets: [{
                            data: Object.values(stats.parFournisseur),
                            backgroundColor: [
                              '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316'
                            ],
                            borderWidth: 3,
                            borderColor: '#ffffff',
                            hoverBorderWidth: 4
                          }]
                        }}
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: {
                                  size: 12,
                                  weight: '500'
                                }
                              }
                            }
                          }
                        }} 
                      />
                    ) : (
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <ChartBarIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Aucune donnée disponible</p>
                        <p className="text-sm text-gray-400">pour {selectedYear}</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Evolution mensuelle */}
                <motion.div 
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Évolution mensuelle {selectedYear}</h3>
                      <p className="text-sm text-gray-500 mt-1">Tendance des récupérations dans l'année</p>
                    </div>
                    <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                  </div>
                  <div className="h-80">
                    <Bar 
                      data={{
                        labels: mois,
                        datasets: [{
                          label: 'Quantité récupérée (kg)',
                          data: stats.parMois,
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgba(34, 197, 94, 1)',
                          borderWidth: 2,
                          borderRadius: 8,
                          borderSkipped: false,
                        }]
                      }}
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                              font: {
                                size: 11
                              },
                              color: '#6B7280'
                            }
                          },
                          x: {
                            grid: {
                              display: false
                            },
                            ticks: {
                              font: {
                                size: 11
                              },
                              color: '#6B7280'
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </motion.div>
              </div>

              {/* Tableau détaillé Premium */}
              <motion.div 
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Détail par fournisseur ({selectedYear})</h3>
                      <p className="text-sm text-gray-500 mt-1">Analyse mensuelle complète des récupérations</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total année</div>
                      <div className="text-2xl font-bold text-gray-900">{stats.totalQuantite.toLocaleString()} <span className="text-sm font-normal text-gray-500">kg</span></div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Fournisseur
                        </th>
                        {mois.map(m => (
                          <th key={m} className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            {m.slice(0, 3)}
                          </th>
                        ))}
                        <th className="px-8 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Part
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {Object.keys(stats.parFournisseur).length > 0 ? (
                        Object.keys(stats.parFournisseur)
                          .sort((a, b) => stats.parFournisseur[b] - stats.parFournisseur[a])
                          .map((fournisseur, index) => {
                            const totalFournisseur = stats.parFournisseur[fournisseur];
                            const pourcentage = stats.totalQuantite > 0 ? (totalFournisseur / stats.totalQuantite * 100) : 0;
                            
                            return (
                              <tr key={fournisseur} className={`hover:bg-gray-25 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                                <td className="px-8 py-6 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className={`w-4 h-4 rounded-full mr-3 shadow-sm ${
                                      fournisseur === 'Kirchberg' ? 'bg-emerald-500' :
                                      fournisseur === 'Cloche d\'Or' ? 'bg-blue-500' :
                                      fournisseur === 'Dudelange' ? 'bg-red-500' :
                                      fournisseur === 'Opkorn' ? 'bg-amber-500' :
                                      'bg-gray-500'
                                    }`}></div>
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900">{fournisseur}</div>
                                      <div className="text-xs text-gray-500">Partenaire alimentaire</div>
                                    </div>
                                  </div>
                                </td>
                                {mois.map((_, moisIndex) => {
                                  const quantiteMois = denrees
                                    .filter(item => 
                                      item.fournisseur === fournisseur && 
                                      item.mois === moisIndex + 1 && 
                                      item.annee === selectedYear
                                    )
                                    .reduce((sum, item) => sum + parseFloat(item.quantite), 0);
                                  
                                  return (
                                    <td key={moisIndex} className="px-4 py-6 whitespace-nowrap text-center">
                                      {quantiteMois > 0 ? (
                                        <div className="flex flex-col">
                                          <span className="text-sm font-semibold text-gray-900">
                                            {quantiteMois.toLocaleString()}
                                          </span>
                                          <span className="text-xs text-gray-400">kg</span>
                                        </div>
                                      ) : (
                                        <span className="text-gray-300 text-lg">–</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-8 py-6 whitespace-nowrap text-center">
                                  <div className="flex flex-col">
                                    <span className="text-lg font-bold text-gray-900">
                                      {totalFournisseur.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-gray-500">kg</span>
                                  </div>
                                </td>
                                <td className="px-6 py-6 whitespace-nowrap text-center">
                                  <div className="flex flex-col items-center space-y-2">
                                    <span className="text-sm font-semibold text-gray-700">
                                      {pourcentage.toFixed(1)}%
                                    </span>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-gray-600 to-gray-800 h-2 rounded-full transition-all duration-500" 
                                        style={{width: `${pourcentage}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan="15" className="px-8 py-16 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ScaleIcon className="w-10 h-10 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Aucune donnée pour {selectedYear}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Ajoutez des données via l'onglet "Saisie des données"
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* Ligne de total Premium */}
                      {Object.keys(stats.parFournisseur).length > 0 && (
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200">
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-full mr-3 bg-gradient-to-r from-gray-600 to-gray-800"></div>
                              <div>
                                <div className="text-sm font-bold text-gray-900">TOTAL GÉNÉRAL</div>
                                <div className="text-xs text-gray-600">Toutes récupérations</div>
                              </div>
                            </div>
                          </td>
                          {mois.map((_, moisIndex) => {
                            const totalMois = stats.parMois[moisIndex];
                            return (
                              <td key={moisIndex} className="px-4 py-6 whitespace-nowrap text-center">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-gray-900">
                                    {totalMois > 0 ? totalMois.toLocaleString() : '–'}
                                  </span>
                                  {totalMois > 0 && (
                                    <span className="text-xs text-gray-600">kg</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-8 py-6 whitespace-nowrap text-center">
                            <div className="flex flex-col">
                              <span className="text-xl font-bold text-gray-900">
                                {stats.totalQuantite.toLocaleString()}
                              </span>
                              <span className="text-sm font-medium text-gray-600">kg</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap text-center">
                            <span className="text-sm font-bold text-gray-900">100%</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Footer Premium avec insights */}
                {Object.keys(stats.parFournisseur).length > 0 && (
                  <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {Object.keys(stats.parFournisseur)
                            .reduce((a, b) => stats.parFournisseur[a] > stats.parFournisseur[b] ? a : b)
                          }
                        </div>
                        <div className="text-sm text-gray-600 mb-1">🏆 Meilleur fournisseur</div>
                        <div className="text-xs text-gray-500">
                          {Math.max(...Object.values(stats.parFournisseur)).toLocaleString()} kg récupérés
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {stats.moyenneMensuelle.toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">📊 Moyenne mensuelle</div>
                        <div className="text-xs text-gray-500">
                          kg par mois actif
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {(stats.totalQuantite / 1000).toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">🌱 Impact écologique</div>
                        <div className="text-xs text-gray-500">
                          tonnes sauvées du gaspillage
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'saisie' && (
            <motion.div
              key="saisie"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Actions */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Saisie des données</h2>
                  <p className="text-gray-600 mt-1">Gestion et saisie des récupérations alimentaires</p>
                </div>
                <button
                  onClick={() => openModal()}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="font-medium">Nouvelle entrée</span>
                </button>
              </div>

              {/* Liste des entrées Premium */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Fournisseur
                        </th>
                        <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Période
                        </th>
                        <th className="px-8 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Quantité
                        </th>
                        <th className="px-8 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                      {denrees
                        .filter(item => item.fournisseur !== 'Total général')
                        .sort((a, b) => b.annee - a.annee || b.mois - a.mois)
                        .map((item, index) => (
                        <tr key={item.id} className={`hover:bg-gray-25 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full mr-3 shadow-sm ${
                                item.fournisseur === 'Kirchberg' ? 'bg-emerald-500' :
                                item.fournisseur === 'Cloche d\'Or' ? 'bg-blue-500' :
                                item.fournisseur === 'Dudelange' ? 'bg-red-500' :
                                item.fournisseur === 'Opkorn' ? 'bg-amber-500' :
                                'bg-gray-500'
                              }`}></div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{item.fournisseur}</div>
                                <div className="text-xs text-gray-500">Partenaire alimentaire</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {mois[item.mois - 1]} {item.annee}
                            </div>
                            <div className="text-xs text-gray-500">
                              Période de récupération
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {parseFloat(item.quantite).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.unite}
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-3">
                              <button
                                onClick={() => openModal(item)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                                title="Supprimer"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
            </div>
                          </td>
                        </tr>
          ))}
                    </tbody>
                  </table>
        </div>

                {denrees.filter(item => item.fournisseur !== 'Total général').length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ScaleIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune donnée</h3>
                    <p className="text-gray-500">Commencez par ajouter des données de récupération.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de saisie */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingItem ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fournisseur
                  </label>
                  <select
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {availableFournisseurs.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mois
                    </label>
                    <select
                      value={formData.mois}
                      onChange={(e) => setFormData({...formData, mois: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                      required
                    >
                      {mois.map((m, index) => (
                        <option key={index} value={index + 1}>{m}</option>
                      ))}
                    </select>
            </div>

            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Année
                    </label>
                    <input
                      type="number"
                      value={formData.annee}
                      onChange={(e) => setFormData({...formData, annee: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                      min="2020"
                      max="2030"
                      required
                    />
            </div>
          </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantité
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantite}
                      onChange={(e) => setFormData({...formData, quantite: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unité
                    </label>
                    <select
                      value={formData.unite}
                      onChange={(e) => setFormData({...formData, unite: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                      required
                    >
                      {unites.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
        </div>
      </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                    rows="2"
                    placeholder="Remarques ou précisions..."
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Sauvegarde...' : (editingItem ? 'Modifier' : 'Ajouter')}
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

export default SecretariatManagement; 