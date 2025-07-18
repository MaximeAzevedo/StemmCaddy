import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const ChauffeurInterface = ({ userProfile, onLogout }) => {
  const [nouvelleCollecte, setNouvelleCollecte] = useState({
    fournisseur: 'Auchan',
    quantite: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const quantiteNum = parseFloat(nouvelleCollecte.quantite);
      
      if (!quantiteNum || quantiteNum <= 0) {
        throw new Error('Veuillez saisir un poids valide');
      }

      const { error } = await supabase
        .from('collectes_chauffeurs')
        .insert([{
          fournisseur: nouvelleCollecte.fournisseur,
          quantite: quantiteNum,
          chauffeur_nom: userProfile.nom,
          heure_collecte: new Date().toISOString()
        }]);

      if (error) throw error;

      // Réinitialiser le formulaire
      setNouvelleCollecte({
        fournisseur: 'Auchan',
        quantite: ''
      });
      
      showMessage('success', `✅ ${quantiteNum}kg enregistrés !`);

    } catch (err) {
      console.error('Erreur enregistrement:', err);
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header minimaliste */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🚛</span>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Collectes</h1>
              <p className="text-sm text-gray-600">{userProfile.nom}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <span className="text-xl">🚪</span>
          </button>
        </div>
      </div>

      {/* Message flash */}
      {message.text && (
        <div className={`mx-4 mt-4 p-4 rounded-xl text-center font-medium ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Formulaire ultra-simplifié */}
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-md mx-auto">
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Sélection magasin - gros boutons */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4 text-center">
                Magasin
              </label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setNouvelleCollecte(prev => ({ ...prev, fournisseur: 'Auchan' }))}
                  className={`w-full p-6 rounded-2xl border-2 font-semibold text-lg transition-all ${
                    nouvelleCollecte.fournisseur === 'Auchan'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🏪 Auchan
                </button>
                <button
                  type="button"
                  onClick={() => setNouvelleCollecte(prev => ({ ...prev, fournisseur: 'Banque alimentaire' }))}
                  className={`w-full p-6 rounded-2xl border-2 font-semibold text-lg transition-all ${
                    nouvelleCollecte.fournisseur === 'Banque alimentaire'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  🏛️ Banque alimentaire
                </button>
              </div>
            </div>

            {/* Poids - input géant */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4 text-center">
                Poids (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={nouvelleCollecte.quantite}
                onChange={(e) => setNouvelleCollecte(prev => ({ ...prev, quantite: e.target.value }))}
                className="w-full px-6 py-6 border-2 border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl text-center font-bold"
                placeholder="0.0"
                required
                inputMode="decimal"
              />
            </div>

            {/* Bouton enregistrer - très visible */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-6 px-6 rounded-2xl transition-colors text-xl shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Enregistrement...
                </div>
              ) : (
                '📝 Enregistrer'
              )}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
};

export default ChauffeurInterface; 