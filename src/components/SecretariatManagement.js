import React, { useState, useEffect, useCallback } from 'react';
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

// Composant de visualisation 2024 - Données réelles vs simulées
const ComparisonSection = ({ selectedFournisseurs, loadComparisonData, mois, getFournisseurColor }) => {
  const [comparisonData, setComparisonData] = useState({ data2024: [], data2025: [] });
  const [loadingComparison, setLoadingComparison] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoadingComparison(true);
      const data = await loadComparisonData();
      setComparisonData(data);
      setLoadingComparison(false);
    };
    loadData();
  }, [selectedFournisseurs, loadComparisonData]);

  // Calculer la tendance basée sur les 6 premiers mois de 2024
  const data2024Real = comparisonData.data2024.slice(0, 6); // Jan-Juin (réel)
  const moyenneReelle = data2024Real.reduce((sum, val) => sum + val, 0) / 6;
  
  // Calculer la tendance de croissance mensuelle
  const tendanceCroissance = data2024Real.length >= 2 ? 
    ((data2024Real[data2024Real.length - 1] - data2024Real[0]) / data2024Real.length) : 0;
  
  // Simuler les 6 derniers mois avec la tendance
  const data2024Simulated = Array.from({ length: 6 }, (_, i) => {
    const baseValue = moyenneReelle + (tendanceCroissance * (i + 6));
    return Math.max(0, baseValue); // Éviter les valeurs négatives
  });
  
  const totalReel = data2024Real.reduce((sum, val) => sum + val, 0);
  const totalSimule = data2024Simulated.reduce((sum, val) => sum + val, 0);
  const croissanceAnnuelle = totalReel > 0 ? ((totalSimule / totalReel - 1) * 100) : 0;
  const isPositive = croissanceAnnuelle >= 0;

  return (
    <motion.div 
      className="mt-12 mb-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
    >
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 overflow-hidden">
        {/* Header Premium avec gradient */}
        <div className="bg-gradient-to-r from-slate-50/90 to-blue-50/90 backdrop-blur-xl px-8 py-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-lg">📊</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Année 2024 Complète</h2>
                <p className="text-sm text-gray-600">Données réelles (Jan-Juin) • Simulation (Jul-Déc)</p>
              </div>
            </div>
            
            {/* Métrique principale */}
            <div className="text-right">
              <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Tendance 2nd Semestre</div>
              <div className={`flex items-center justify-end space-x-2 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                <span className="text-2xl">{isPositive ? '📈' : '📉'}</span>
                <div>
                  <div className="text-2xl font-bold">
                    {Math.abs(croissanceAnnuelle).toFixed(1)}%
                  </div>
                  <div className="text-xs font-medium opacity-80">
                    {isPositive ? 'Croissance' : 'Décroissance'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Graphique de comparaison */}
          <div className="mb-8">
            <div className="h-80 bg-white/50 backdrop-blur rounded-xl p-5 shadow-lg border border-white/20">
              {loadingComparison ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-pulse flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-4 h-4 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-4 h-4 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <span className="text-gray-600 ml-3 text-base">Chargement de la comparaison...</span>
                  </div>
                </div>
              ) : (
                <Bar 
                  data={{
                    labels: mois, // Afficher toute l'année
                    datasets: [
                      {
                        label: 'Données Réelles (Jan-Juin)',
                        data: [...data2024Real, ...Array(6).fill(null)], // Données réelles seulement pour les 6 premiers mois
                        backgroundColor: 'rgba(34, 197, 94, 0.9)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false,
                      },
                      {
                        label: 'Simulation Tendance (Jul-Déc)',
                        data: [...Array(6).fill(null), ...data2024Simulated], // Simulation seulement pour les 6 derniers mois
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        borderRadius: 6,
                        borderSkipped: false,
                        borderDash: [5, 5], // Ligne pointillée pour différencier la simulation
                      }
                    ]
                  }}
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index',
                      intersect: false,
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                          font: {
                            size: 13,
                            weight: '600'
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        cornerRadius: 10,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                          label: function(context) {
                            const type = context.datasetIndex === 0 ? '(Réel)' : '(Simulé)';
                            return `${context.dataset.label}: ${context.formattedValue} kg ${type}`;
                          },
                          afterLabel: function(context) {
                            if (context.datasetIndex === 1 && moyenneReelle > 0) {
                              const diff = context.parsed.y - moyenneReelle;
                              const pct = (diff / moyenneReelle * 100);
                              return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs moyenne 1er semestre`;
                            }
                            return '';
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.08)'
                        },
                        ticks: {
                          font: { size: 11 },
                          color: '#6B7280',
                          callback: function(value) {
                            return value.toLocaleString() + ' kg';
                          }
                        }
                      },
                      x: {
                        grid: { display: false },
                        ticks: {
                          font: { size: 11 },
                          color: '#6B7280'
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>
          </div>

          {/* Statistiques détaillées Premium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-50/70 to-emerald-100/70 backdrop-blur rounded-xl p-6 text-center border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-lg">📊</span>
              </div>
              <div className="text-xl font-bold text-emerald-700 mb-1">
                {totalReel.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-emerald-600 mb-1">Données Réelles</div>
              <div className="text-xs text-emerald-500">
                Jan-Juin 2024
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50/70 to-blue-100/70 backdrop-blur rounded-xl p-6 text-center border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-lg">🔮</span>
              </div>
              <div className="text-xl font-bold text-blue-700 mb-1">
                {totalSimule.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-blue-600 mb-1">Simulation Tendance</div>
              <div className="text-xs text-blue-500">
                Jul-Déc 2024
              </div>
            </div>
            
            <div className={`backdrop-blur rounded-xl p-6 text-center border border-white/20 shadow-lg ${isPositive ? 'bg-gradient-to-br from-emerald-50/70 to-emerald-100/70' : 'bg-gradient-to-br from-red-50/70 to-red-100/70'}`}>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-lg ${isPositive ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-red-400 to-red-600'}`}>
                <span className="text-lg">{isPositive ? '📈' : '📉'}</span>
              </div>
              <div className={`text-xl font-bold mb-1 ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                {(totalReel + totalSimule).toLocaleString()}
              </div>
              <div className={`text-sm font-semibold mb-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                Projection Annuelle
              </div>
              <div className={`text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                Total 2024 estimé
              </div>
            </div>
          </div>

          {/* Note explicative */}
          <div className="mt-6 p-4 bg-blue-50/50 border border-blue-200/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500 text-sm">💡</span>
              <div className="text-xs text-blue-700">
                <strong>Méthodologie :</strong> Les données Jan-Juin sont réelles. La simulation Jul-Déc est basée sur la tendance de croissance calculée du 1er semestre. 
                Moyenne mensuelle réelle : <strong>{moyenneReelle.toFixed(0)} kg</strong> • Tendance : <strong>{tendanceCroissance > 0 ? '+' : ''}{tendanceCroissance.toFixed(0)} kg/mois</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

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
  const [selectedFournisseurs, setSelectedFournisseurs] = useState([]); // Nouveau filtre fournisseur
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

  // Système de couleurs premium par fournisseur
  const fournisseurColors = {
    'Auchan': { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    'Delhaize': { bg: 'from-red-500 to-red-600', light: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    'Aldi': { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    'Provençale': { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    'Kirchberg': { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    'Cloche d\'Or': { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
    'Dudelange': { bg: 'from-red-500 to-red-600', light: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    'Opkorn': { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
    'Banque Alimentaire': { bg: 'from-purple-500 to-purple-600', light: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' }
  };

  const getFournisseurColor = (fournisseur) => {
    return fournisseurColors[fournisseur] || { bg: 'from-gray-500 to-gray-600', light: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' };
  };

  // Charger les données depuis Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger les données en parallèle
      const [denreesRes, anneesRes, fournisseursRes] = await Promise.all([
        supabaseSecretariat.getDenreesAlimentaires(selectedYear),
        supabaseSecretariat.getAnneesDisponibles(),
        supabaseSecretariat.getFournisseurs(selectedYear)
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
  }, [selectedYear, selectedFournisseurs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        result = await supabaseSecretariat.updateDenreeAlimentaire(editingItem.id, denreeData, denreeData.annee);
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
      const result = await supabaseSecretariat.deleteDenreeAlimentaire(id, selectedYear);
      
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
      item.annee === selectedYear && 
      item.fournisseur !== 'Total général' &&
      (selectedFournisseurs.length === 0 || selectedFournisseurs.includes(item.fournisseur))
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

  // Charger les données de comparaison 2024/2025
  const loadComparisonData = async () => {
    try {
      const [data2024, data2025] = await Promise.all([
        supabaseSecretariat.getDenreesAlimentaires(2024),
        supabaseSecretariat.getDenreesAlimentaires(2025)
      ]);

      const processData = (data, year) => {
        if (!data.data) return Array(12).fill(0);
        
        const filteredData = data.data.filter(item => 
          item.fournisseur !== 'Total général' &&
          (selectedFournisseurs.length === 0 || selectedFournisseurs.includes(item.fournisseur))
        );
        
        return Array.from({ length: 12 }, (_, i) => {
          const moisData = filteredData.filter(item => item.mois === i + 1);
          return moisData.reduce((sum, item) => sum + parseFloat(item.quantite), 0);
        });
      };

      return {
        data2024: processData(data2024, 2024),
        data2025: processData(data2025, 2025)
      };
    } catch (error) {
      console.error('Erreur loadComparisonData:', error);
      return { data2024: Array(12).fill(0), data2025: Array(12).fill(0) };
    }
  };

  // Toggle fournisseur dans le filtre
  const toggleFournisseur = (fournisseur) => {
    setSelectedFournisseurs(prev => 
      prev.includes(fournisseur) 
        ? prev.filter(f => f !== fournisseur)
        : [...prev, fournisseur]
    );
  };

  // Reset tous les fournisseurs
  const resetFournisseurs = () => {
    setSelectedFournisseurs([]);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Gestion Secrétariat</h1>
          <p className="text-base text-gray-500 text-center max-w-2xl mb-2">
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
              <p className="text-sm text-gray-500 font-medium mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Actions Rapides premium */}
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {actionsAccueil.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0.8, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer group transition-all duration-300"
                onClick={() => setActiveTab(action.tab)}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:shadow-lg transition-all duration-300`}>
                  <action.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-500">{action.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-amber-200/20 to-orange-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ScaleIcon className="w-8 h-8 text-gray-800 mr-3" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Gestion Denrées Alimentaires</h1>
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
      <div className="relative bg-white/70 backdrop-blur-lg border-b border-white/20">
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
                      ? 'border-gray-900 text-gray-900 bg-white/30 backdrop-blur'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-white/20'
                  } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200 rounded-t-lg`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Filtres Premium */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                {/* Filtre Année */}
                <motion.div 
                  className="bg-white/70 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-200 group"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg transition-shadow">
                          <span className="text-xl">📅</span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Année de consultation</p>
                          <p className="text-base font-semibold text-gray-900">Période d'analyse</p>
                        </div>
                      </div>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full border-0 bg-white/80 backdrop-blur rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-200 text-lg font-semibold text-gray-900"
                      >
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>

                {/* Filtre Fournisseurs */}
                <motion.div 
                  className="bg-white/70 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-200 group"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transition-shadow">
                            <span className="text-xl">🏪</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Fournisseurs</p>
                            <p className="text-base font-semibold text-gray-900">Sélection multiple</p>
                          </div>
                        </div>
                        {selectedFournisseurs.length > 0 && (
                          <button
                            onClick={resetFournisseurs}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors bg-blue-50/50 backdrop-blur px-2 py-1 rounded-lg"
                          >
                            Réinitialiser
                          </button>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {availableFournisseurs.map(fournisseur => {
                          const isSelected = selectedFournisseurs.includes(fournisseur);
                          const colors = getFournisseurColor(fournisseur);
                          
                          return (
                            <button
                              key={fournisseur}
                              onClick={() => toggleFournisseur(fournisseur)}
                              className={`
                                flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105
                                ${isSelected 
                                  ? `bg-gradient-to-r ${colors.bg} text-white shadow-lg`
                                  : 'bg-white/80 text-gray-700 border border-gray-200 hover:bg-gray-50'
                                }
                              `}
                            >
                              <div className={`w-2 h-2 rounded-full ${colors.dot} ${isSelected ? 'bg-white/80' : ''}`}></div>
                              <span>{fournisseur}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
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
                      <p className="text-sm text-amber-700 mt-1">
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

              {/* KPIs Premium avec Glassmorphism */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <motion.div 
                  className="bg-white/70 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 group"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                          <ScaleIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Récupéré</p>
                          <p className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            {loading ? '...' : stats.totalQuantite.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">kg récupérés en {selectedYear}</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100/80 text-emerald-800 backdrop-blur">
                            🌱 Anti-gaspillage
                          </span>
                        </div>
                        {!loading && stats.totalQuantite > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200/50">
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>≈ {(stats.totalQuantite / 1000).toFixed(1)} tonnes</span>
                              <span className="text-emerald-600 font-medium">📈 Impact positif</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white/70 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 group"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                          <BuildingStorefrontIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Partenaires</p>
                          <p className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            {loading ? '...' : Object.keys(stats.parFournisseur).length}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Fournisseurs actifs</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100/80 text-blue-800 backdrop-blur">
                            🤝 Réseau solidaire
                          </span>
                        </div>
                        {!loading && Object.keys(stats.parFournisseur).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200/50">
                            <div className="text-xs text-gray-500">
                              Top : {Object.keys(stats.parFournisseur).slice(0, 2).join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white/70 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 group"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                          <ChartBarIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Moyenne</p>
                          <p className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            {loading ? '...' : Math.round(stats.moyenneMensuelle).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">kg/mois en moyenne</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100/80 text-purple-800 backdrop-blur">
                            📊 Performance
                          </span>
                        </div>
                        {!loading && stats.moyenneMensuelle > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200/50">
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
                  className="bg-white/70 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 group"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                          <TrophyIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Record</p>
                          <p className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                            {loading ? '...' : Math.round(Math.max(...stats.parMois)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Meilleur mois (kg)</p>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100/80 text-amber-800 backdrop-blur">
                            🏆 Excellence
                          </span>
                        </div>
                        {!loading && Math.max(...stats.parMois) > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200/50">
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
                    <h2 className="text-xl font-bold text-gray-900">Analytiques {selectedYear}</h2>
                    <p className="text-sm text-gray-600 mt-1">Analyse détaillée des récupérations alimentaires</p>
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
                  className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Répartition par fournisseur</h3>
                      <p className="text-xs text-gray-500 mt-1">Distribution des volumes récupérés</p>
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
                            backgroundColor: Object.keys(stats.parFournisseur).map(fournisseur => {
                              const colors = getFournisseurColor(fournisseur);
                              return colors.dot.replace('bg-', '').replace('-500', '') === 'blue' ? '#3B82F6' :
                                     colors.dot.replace('bg-', '').replace('-500', '') === 'red' ? '#EF4444' :
                                     colors.dot.replace('bg-', '').replace('-500', '') === 'emerald' ? '#10B981' :
                                     colors.dot.replace('bg-', '').replace('-500', '') === 'amber' ? '#F59E0B' :
                                     colors.dot.replace('bg-', '').replace('-500', '') === 'purple' ? '#8B5CF6' : '#6B7280';
                            }),
                            borderWidth: 3,
                            borderColor: '#ffffff',
                            hoverBorderWidth: 4,
                            hoverBackgroundColor: Object.keys(stats.parFournisseur).map(fournisseur => {
                              const colors = getFournisseurColor(fournisseur);
                              return colors.dot.replace('bg-', '').replace('-500', '') === 'blue' ? '#2563EB' :
                                     colors.dot.replace('bg-', '').replace('-500', '') === 'red' ? '#DC2626' :
                                     colors.dot.replace('bg-', '').replace('-500', '') === 'emerald' ? '#059669' :
                                     colors.dot.replace('bg-', '').replace('-500', '') === 'amber' ? '#D97706' :
                                     colors.dot.replace('bg-', '').replace('-500', '') === 'purple' ? '#7C3AED' : '#4B5563';
                            })
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
                                },
                                generateLabels: function(chart) {
                                  const data = chart.data;
                                  if (data.labels.length && data.datasets.length) {
                                    const dataset = data.datasets[0];
                                    return data.labels.map((label, i) => {
                                      const colors = getFournisseurColor(label);
                                      return {
                                        text: label,
                                        fillStyle: dataset.backgroundColor[i],
                                        strokeStyle: dataset.borderColor,
                                        lineWidth: dataset.borderWidth,
                                        hidden: false,
                                        index: i,
                                        pointStyle: 'circle'
                                      };
                                    });
                                  }
                                  return [];
                                }
                              }
                            },
                            tooltip: {
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              titleFont: { size: 14, weight: 'bold' },
                              bodyFont: { size: 13 },
                              cornerRadius: 12,
                              callbacks: {
                                label: function(context) {
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                                  return `${context.label}: ${context.formattedValue} kg (${percentage}%)`;
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
                        <p className="text-xs text-gray-400">pour {selectedYear}</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Evolution mensuelle */}
                <motion.div 
                  className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Évolution mensuelle {selectedYear}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedYear === 2025 ? 'Données réelles (Jan-Juin) • Estimation (Jul-Déc)' : 'Tendance des récupérations dans l\'année'}
                      </p>
                    </div>
                    <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                  </div>
                  <div className="h-80">
                    <Bar 
                      data={{
                        labels: mois,
                        datasets: (() => {
                          if (selectedYear === 2025) {
                            // Pour 2025, séparer données réelles (Jan-Juin) et estimation (Jul-Déc)
                            const donneesReelles = stats.parMois.slice(0, 6); // Jan-Juin
                            const donneesNonNulles = donneesReelles.filter(val => val > 0);
                            
                            // Calculer la tendance/moyenne pour l'estimation
                            const moyenneReelle = donneesNonNulles.length > 0 ? 
                              donneesNonNulles.reduce((sum, val) => sum + val, 0) / donneesNonNulles.length : 0;
                            
                            // Calculer la tendance de croissance
                            const tendanceCroissance = donneesNonNulles.length >= 2 ? 
                              ((donneesNonNulles[donneesNonNulles.length - 1] - donneesNonNulles[0]) / donneesNonNulles.length) : 0;
                            
                            // Générer l'estimation pour Jul-Déc
                            const estimationSecondSemestre = Array.from({ length: 6 }, (_, i) => {
                              const baseValue = moyenneReelle + (tendanceCroissance * (i + 6));
                              return Math.max(0, baseValue);
                            });

                            return [
                              {
                                label: 'Données Réelles (Jan-Juin)',
                                data: [...donneesReelles, ...Array(6).fill(null)],
                                backgroundColor: donneesReelles.map((value, index) => {
                                  if (value === 0) return 'rgba(156, 163, 175, 0.3)';
                                  const maxValue = Math.max(...donneesReelles.filter(v => v > 0));
                                  const intensity = value / maxValue;
                                  const opacity = 0.4 + (intensity * 0.5);
                                  return `rgba(34, 197, 94, ${opacity})`;
                                }),
                                borderColor: 'rgba(34, 197, 94, 1)',
                                borderWidth: 2,
                                borderRadius: 8,
                                borderSkipped: false,
                                hoverBackgroundColor: donneesReelles.map(() => 'rgba(34, 197, 94, 0.9)'),
                                hoverBorderColor: 'rgba(34, 197, 94, 1)',
                                hoverBorderWidth: 3
                              },
                              {
                                label: 'Estimation Tendance (Jul-Déc)',
                                data: [...Array(6).fill(null), ...estimationSecondSemestre],
                                backgroundColor: estimationSecondSemestre.map((value, index) => {
                                  const maxValue = Math.max(...estimationSecondSemestre);
                                  const intensity = value / maxValue;
                                  const opacity = 0.3 + (intensity * 0.4);
                                  return `rgba(59, 130, 246, ${opacity})`;
                                }),
                                borderColor: 'rgba(59, 130, 246, 1)',
                                borderWidth: 2,
                                borderRadius: 8,
                                borderSkipped: false,
                                borderDash: [5, 5], // Ligne pointillée pour l'estimation
                                hoverBackgroundColor: estimationSecondSemestre.map(() => 'rgba(59, 130, 246, 0.7)'),
                                hoverBorderColor: 'rgba(59, 130, 246, 1)',
                                hoverBorderWidth: 3
                              }
                            ];
                          } else {
                            // Pour les autres années, affichage normal
                            return [{
                              label: 'Quantité récupérée (kg)',
                              data: stats.parMois,
                              backgroundColor: stats.parMois.map((value, index) => {
                                if (value === 0) return 'rgba(156, 163, 175, 0.3)';
                                const maxValue = Math.max(...stats.parMois.filter(v => v > 0));
                                const intensity = value / maxValue;
                                const opacity = 0.3 + (intensity * 0.5);
                                return `rgba(34, 197, 94, ${opacity})`;
                              }),
                              borderColor: 'rgba(34, 197, 94, 1)',
                              borderWidth: 2,
                              borderRadius: 8,
                              borderSkipped: false,
                              hoverBackgroundColor: stats.parMois.map(() => 'rgba(34, 197, 94, 0.9)'),
                              hoverBorderColor: 'rgba(34, 197, 94, 1)',
                              hoverBorderWidth: 3
                            }];
                          }
                        })()
                      }}
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false,
                        interaction: {
                          mode: 'index',
                          intersect: false,
                        },
                        plugins: {
                          legend: {
                            display: selectedYear === 2025,
                            position: 'top',
                            labels: {
                              usePointStyle: true,
                              padding: 20,
                              font: {
                                size: 12,
                                weight: '600'
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
                            cornerRadius: 12,
                            callbacks: {
                              label: function(context) {
                                const type = selectedYear === 2025 && context.datasetIndex === 1 ? ' (Estimé)' : 
                                           selectedYear === 2025 && context.datasetIndex === 0 ? ' (Réel)' : '';
                                return `${context.dataset.label}: ${context.formattedValue} kg${type}`;
                              },
                              afterLabel: function(context) {
                                if (selectedYear !== 2025) {
                                  const monthlyAvg = stats.moyenneMensuelle;
                                  const diff = context.parsed.y - monthlyAvg;
                                  const pct = monthlyAvg > 0 ? (diff / monthlyAvg * 100) : 0;
                                  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs moyenne`;
                                } else if (context.datasetIndex === 1) {
                                  // Pour les estimations 2025
                                  const donneesReelles = stats.parMois.slice(0, 6).filter(v => v > 0);
                                  const moyenneReelle = donneesReelles.reduce((sum, val) => sum + val, 0) / donneesReelles.length;
                                  const diff = context.parsed.y - moyenneReelle;
                                  const pct = (diff / moyenneReelle * 100);
                                  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs moyenne 1er semestre`;
                                }
                                return '';
                              }
                            }
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
                              color: '#6B7280',
                              callback: function(value) {
                                return value.toLocaleString() + ' kg';
                              }
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
                  
                  {/* Note explicative pour 2025 */}
                  {selectedYear === 2025 && (
                    <div className="mt-4 p-3 bg-blue-50/50 border border-blue-200/50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-500 text-sm">💡</span>
                        <div className="text-xs text-blue-700">
                          <strong>Estimation :</strong> Les données Jul-Déc sont calculées à partir de la tendance du 1er semestre 2025.
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Tableau détaillé Premium */}
              <motion.div 
                className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="px-8 py-6 border-b border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-gray-50/50 backdrop-blur">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Détail par fournisseur ({selectedYear})</h3>
                      <p className="text-xs text-gray-500 mt-1">Analyse mensuelle complète des récupérations</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total année</div>
                      <div className="text-xl font-bold text-gray-900">{stats.totalQuantite.toLocaleString()} <span className="text-xs font-normal text-gray-500">kg</span></div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100/50">
                    <thead className="bg-gray-50/50 backdrop-blur">
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
                    <tbody className="bg-white/30 backdrop-blur divide-y divide-gray-50/50">
                      {Object.keys(stats.parFournisseur).length > 0 ? (
                        Object.keys(stats.parFournisseur)
                          .sort((a, b) => stats.parFournisseur[b] - stats.parFournisseur[a])
                          .map((fournisseur, index) => {
                            const totalFournisseur = stats.parFournisseur[fournisseur];
                            const pourcentage = stats.totalQuantite > 0 ? (totalFournisseur / stats.totalQuantite * 100) : 0;
                            const colors = getFournisseurColor(fournisseur);
                            
                            return (
                              <tr key={fournisseur} className={`hover:bg-white/40 transition-all duration-200 ${index % 2 === 0 ? 'bg-white/20' : 'bg-white/10'}`}>
                                <td className="px-8 py-6 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className={`w-4 h-4 rounded-full mr-3 shadow-sm ${colors.dot}`}></div>
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
                                    <span className="text-base font-bold text-gray-900">
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
                                    <div className="w-full bg-gray-100/50 backdrop-blur rounded-full h-2">
                                      <div 
                                        className={`bg-gradient-to-r ${colors.bg} h-2 rounded-full transition-all duration-500 shadow-sm`}
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
                              <div className="w-20 h-20 bg-gray-100/50 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
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
                        <tr className="bg-gradient-to-r from-gray-50/70 to-gray-100/70 backdrop-blur border-t-2 border-gray-200/50">
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-4 h-4 rounded-full mr-3 bg-gradient-to-r from-gray-600 to-gray-800 shadow-sm"></div>
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
                              <span className="text-lg font-bold text-gray-900">
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
                  <div className="px-8 py-6 bg-gradient-to-r from-gray-50/50 to-gray-50/50 backdrop-blur border-t border-gray-100/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 mb-1">
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
                        <div className="text-lg font-bold text-gray-900 mb-1">
                          {stats.moyenneMensuelle.toFixed(0)}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">📊 Moyenne mensuelle</div>
                        <div className="text-xs text-gray-500">
                          kg par mois actif
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 mb-1">
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

              {/* Comparaison 2024/2025 Premium - Placée en bas */}
              <ComparisonSection 
                selectedFournisseurs={selectedFournisseurs}
                loadComparisonData={loadComparisonData}
                mois={mois}
                getFournisseurColor={getFournisseurColor}
              />
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
                  <h2 className="text-xl font-bold text-gray-900">Saisie des données</h2>
                  <p className="text-sm text-gray-600 mt-1">Gestion et saisie des récupérations alimentaires</p>
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
              <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100/50">
                    <thead className="bg-gray-50/50 backdrop-blur">
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
                    <tbody className="bg-white/30 backdrop-blur divide-y divide-gray-50/50">
                      {denrees
                        .filter(item => item.fournisseur !== 'Total général')
                        .sort((a, b) => b.annee - a.annee || b.mois - a.mois)
                        .map((item, index) => {
                          const colors = getFournisseurColor(item.fournisseur);
                          return (
                        <tr key={item.id} className={`hover:bg-white/40 transition-all duration-200 ${index % 2 === 0 ? 'bg-white/20' : 'bg-white/10'}`}>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full mr-3 shadow-sm ${colors.dot}`}></div>
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
                            <div className="text-sm font-bold text-gray-900">
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
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur rounded-lg transition-all duration-200"
                                title="Modifier"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50/50 backdrop-blur rounded-lg transition-all duration-200"
                                title="Supprimer"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {denrees.filter(item => item.fournisseur !== 'Total général').length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100/50 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
                      <ScaleIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune donnée</h3>
                    <p className="text-sm text-gray-500">Commencez par ajouter des données de récupération.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal de saisie Premium */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-6">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🏪 Fournisseur
                  </label>
                  <select
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
                    className="w-full border-0 bg-white/70 backdrop-blur rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-200"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📅 Mois
                    </label>
                    <select
                      value={formData.mois}
                      onChange={(e) => setFormData({...formData, mois: e.target.value})}
                      className="w-full border-0 bg-white/70 backdrop-blur rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-200"
                      required
                    >
                      {mois.map((m, index) => (
                        <option key={index} value={index + 1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📆 Année
                    </label>
                    <input
                      type="number"
                      value={formData.annee}
                      onChange={(e) => setFormData({...formData, annee: e.target.value})}
                      className="w-full border-0 bg-white/70 backdrop-blur rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-200"
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ⚖️ Quantité
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantite}
                      onChange={(e) => setFormData({...formData, quantite: e.target.value})}
                      className="w-full border-0 bg-white/70 backdrop-blur rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-200"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📦 Unité
                    </label>
                    <select
                      value={formData.unite}
                      onChange={(e) => setFormData({...formData, unite: e.target.value})}
                      className="w-full border-0 bg-white/70 backdrop-blur rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-200"
                      required
                    >
                      {unites.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📝 Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full border-0 bg-white/70 backdrop-blur rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-200 resize-none"
                    rows="3"
                    placeholder="Remarques ou précisions..."
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200/50">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 text-gray-700 bg-white/70 backdrop-blur border border-gray-200 rounded-xl hover:bg-white transition-all duration-200"
                    disabled={submitting}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sauvegarde...</span>
                      </div>
                    ) : (
                      editingItem ? 'Modifier' : 'Ajouter'
                    )}
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