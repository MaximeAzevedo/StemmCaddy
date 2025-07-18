import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ModerationCollectes = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [collectes, setCollectes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [transferLoading, setTransferLoading] = useState(false);
  const [filters, setFilters] = useState({
    statut: 'tous',
    chauffeur: 'tous'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    chargerCollectes();
  }, [filters]);

  const chargerCollectes = async () => {
    setLoading(true);
    try {
      console.log('Début chargement collectes...');
      
      // Requête directe sans test préalable
      let query = supabase
        .from('collectes_chauffeurs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.statut !== 'tous') {
        query = query.eq('statut', filters.statut);
      }

      if (filters.chauffeur !== 'tous') {
        query = query.eq('chauffeur_nom', filters.chauffeur);
      }

      console.log('Exécution requête...');
      const { data, error } = await query;

      if (error) {
        console.error('Erreur SQL:', error);
        throw error;
      }

      console.log('Données reçues:', data);
      setCollectes(data || []);
      
      if (!data || data.length === 0) {
        console.log('Aucune collecte trouvée');
      } else {
        console.log(`${data.length} collecte(s) chargée(s)`);
      }

    } catch (err) {
      console.error('Erreur complète:', err);
      showMessage('error', `Erreur: ${err.message}`);
      setCollectes([]);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const modererCollecte = async (id, nouveauStatut) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));

    try {
      const { error } = await supabase
        .from('collectes_chauffeurs')
        .update({ statut: nouveauStatut })
        .eq('id', id);

      if (error) throw error;

      setCollectes(prev => 
        prev.map(collecte => 
          collecte.id === id 
            ? { ...collecte, statut: nouveauStatut }
            : collecte
        )
      );

      showMessage('success', `Collecte ${nouveauStatut === 'validé' ? 'validée' : 'rejetée'} avec succès`);

    } catch (err) {
      console.error('Erreur modération:', err);
      showMessage('error', 'Erreur lors de la modération');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const transfererCollectesValidees = async () => {
    setTransferLoading(true);

    try {
      // Récupérer toutes les collectes validées
      const { data: collectesValidees, error: selectError } = await supabase
        .from('collectes_chauffeurs')
        .select('*')
        .eq('statut', 'validé');

      if (selectError) throw selectError;

      if (collectesValidees.length === 0) {
        showMessage('info', 'Aucune collecte validée à transférer');
        return;
      }

      // Préparer les données pour denrees_alimentaires_2025
      const donneesTransfert = collectesValidees.map(collecte => {
        const date = new Date(collecte.heure_collecte);
        return {
          fournisseur: collecte.fournisseur,
          mois: date.getMonth() + 1,
          annee: date.getFullYear(),
          quantite: collecte.quantite,
          unite: 'kg',
          notes: `Collecte chauffeur ${collecte.chauffeur_nom} - ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR')}${collecte.notes ? ` - ${collecte.notes}` : ''}`,
          date_creation: new Date().toISOString(),
          date_modification: new Date().toISOString()
        };
      });

      // Insérer dans denrees_alimentaires_2025
      const { error: insertError } = await supabase
        .from('denrees_alimentaires_2025')
        .insert(donneesTransfert);

      if (insertError) throw insertError;

      // Supprimer les collectes transférées
      const { error: deleteError } = await supabase
        .from('collectes_chauffeurs')
        .delete()
        .eq('statut', 'validé');

      if (deleteError) throw deleteError;

      // Recharger la liste
      chargerCollectes();

      showMessage('success', `${collectesValidees.length} collecte(s) transférée(s) avec succès !`);

    } catch (err) {
      console.error('Erreur transfert:', err);
      showMessage('error', 'Erreur lors du transfert : ' + err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'validé': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejeté': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const chauffeurs = [...new Set(collectes.map(c => c.chauffeur_nom))].filter(Boolean);
  const collectesValidees = collectes.filter(c => c.statut === 'validé').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50">
      
      {/* Header avec navigation */}
      <div className="bg-white shadow-sm border-b sticky top-20 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/logistique')}
                className="text-gray-500 hover:text-gray-700 mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Retour à la logistique"
              >
                <span className="text-xl">⬅️</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🔍 Modération des collectes
                </h1>
                <p className="text-gray-600">
                  Validez ou rejetez les collectes des chauffeurs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-6 max-w-7xl mx-auto">

        {/* Message flash */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : message.type === 'error'
              ? 'bg-red-100 text-red-800 border-red-200'
              : 'bg-blue-100 text-blue-800 border-blue-200'
          }`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Actions et statistiques */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Statistiques */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {collectes.filter(c => c.statut === 'en_attente').length}
                </div>
                <div className="text-sm text-gray-600">En attente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {collectesValidees}
                </div>
                <div className="text-sm text-gray-600">Validées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {collectes.filter(c => c.statut === 'rejeté').length}
                </div>
                <div className="text-sm text-gray-600">Rejetées</div>
              </div>
            </div>

            {/* Bouton transfert */}
            {collectesValidees > 0 && (
              <button
                onClick={transfererCollectesValidees}
                disabled={transferLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                {transferLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Transfert...
                  </div>
                ) : (
                  `📤 Transférer ${collectesValidees} collecte(s)`
                )}
              </button>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Filtre statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={filters.statut}
                onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="tous">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="validé">Validées</option>
                <option value="rejeté">Rejetées</option>
              </select>
            </div>

            {/* Filtre chauffeur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chauffeur
              </label>
              <select
                value={filters.chauffeur}
                onChange={(e) => setFilters(prev => ({ ...prev, chauffeur: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="tous">Tous les chauffeurs</option>
                {chauffeurs.map(chauffeur => (
                  <option key={chauffeur} value={chauffeur}>
                    {chauffeur}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Liste des collectes */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Chargement des collectes...</p>
            </div>
          ) : collectes.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">📦</span>
              <p className="text-gray-500 text-lg">Aucune collecte trouvée</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {collectes.map((collecte) => (
                <div key={collecte.id} className="p-6 hover:bg-gray-50 transition-colors">
                  
                  <div className="flex items-start justify-between">
                    
                    {/* Informations principales */}
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="text-3xl">
                        {collecte.fournisseur === 'Auchan' ? '🏪' : '🏛️'}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {collecte.fournisseur}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatutColor(collecte.statut)}`}>
                            {collecte.statut}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium text-blue-600 text-lg">
                              {collecte.quantite}kg
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Chauffeur:</span>
                            <br />
                            {collecte.chauffeur_nom || 'Non renseigné'}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span>
                            <br />
                            {formatDate(collecte.heure_collecte)}
                          </div>
                          <div>
                            <span className="font-medium">Créé le:</span>
                            <br />
                            {formatDate(collecte.created_at)}
                          </div>
                        </div>

                        {collecte.notes && (
                          <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                            <span className="font-medium text-gray-700">Remarques:</span>
                            <p className="text-gray-600 italic">"{collecte.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {collecte.statut === 'en_attente' && (
                      <div className="flex space-x-3 ml-4">
                        <button
                          onClick={() => modererCollecte(collecte.id, 'validé')}
                          disabled={actionLoading[collecte.id]}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          {actionLoading[collecte.id] ? '...' : '✅ Valider'}
                        </button>
                        <button
                          onClick={() => modererCollecte(collecte.id, 'rejeté')}
                          disabled={actionLoading[collecte.id]}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          {actionLoading[collecte.id] ? '...' : '❌ Rejeter'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModerationCollectes; 