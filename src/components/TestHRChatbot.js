// ========================================
// COMPOSANT TEST - CHATBOT RH AUTONOME
// ========================================
// Test simple du service HR avant intégration complète

import React, { useState } from 'react';
import { hrChatbot } from '../lib/hr-chatbot-service';

const TestHRChatbot = () => {
  const [testMessage, setTestMessage] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [employeesTest, setEmployeesTest] = useState(null);

  // Test direct du service
  const testService = async () => {
    if (!testMessage.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 Test HR Service:', testMessage);
      const response = await hrChatbot.processUserMessage(testMessage);
      setResult(response);
    } catch (error) {
      console.error('❌ Erreur test:', error);
      setResult({
        success: false,
        message: `Erreur: ${error.message}`,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test récupération employés
  const testEmployees = async () => {
    setIsLoading(true);
    try {
      const employees = await hrChatbot.getEmployees();
      setEmployeesTest(employees);
      console.log('👥 Employés récupérés:', employees);
    } catch (error) {
      console.error('❌ Erreur employés:', error);
      setEmployeesTest({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Tests prédéfinis
  const predefinedTests = [
    'Qui est absent aujourd\'hui ?',
    'Carla est malade demain',
    'Fermeture du service vendredi',
    'Montre-moi le planning d\'aujourd\'hui',
    'Chercher remplaçants pour Vaisselle',
    'Mettre Sarah sur Pain demain matin à 8h-12h'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🧪 Test Chatbot RH Autonome
        </h2>
        <p className="text-gray-600">
          Validation du service HR avec Function Calling GPT-4o Mini
        </p>
      </div>

      {/* Test connexion employés */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">📊 Test Connexion Base</h3>
        <button
          onClick={testEmployees}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Chargement...' : 'Tester Récupération Employés'}
        </button>
        
        {employeesTest && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-semibold mb-2">Résultat:</h4>
            {employeesTest.error ? (
              <p className="text-red-600">❌ {employeesTest.error}</p>
            ) : (
              <div>
                <p className="text-green-600">✅ {employeesTest.length} employés trouvés</p>
                <div className="mt-2 text-sm">
                  <strong>Premiers employés:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {employeesTest.slice(0, 5).map(emp => (
                      <li key={emp.id}>
                        {emp.prenom} ({emp.langue_parlee}) - Profil: {emp.profil}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test messages */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">💬 Test Messages IA</h3>
        
        {/* Tests prédéfinis */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Tests Rapides:</h4>
          <div className="grid grid-cols-2 gap-2">
            {predefinedTests.map((test, index) => (
              <button
                key={index}
                onClick={() => setTestMessage(test)}
                className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border text-left"
              >
                {test}
              </button>
            ))}
          </div>
        </div>

        {/* Input personnalisé */}
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Tapez votre message de test..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && testService()}
          />
          <button
            onClick={testService}
            disabled={isLoading || !testMessage.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {isLoading ? 'Test...' : 'Tester'}
          </button>
        </div>
      </div>

      {/* Résultats */}
      {result && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">📋 Résultat du Test</h3>
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
            
            {/* Status */}
            <div className="flex items-center mb-3">
              <span className={`text-sm font-semibold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.success ? '✅ SUCCÈS' : '❌ ÉCHEC'}
              </span>
              {result.functionCalled && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  Fonction: {result.functionCalled}
                </span>
              )}
            </div>

            {/* Message */}
            <div className="mb-3">
              <h4 className="font-semibold mb-1">Réponse IA:</h4>
              <div className="whitespace-pre-line text-gray-800 bg-white p-3 rounded border">
                {result.message}
              </div>
            </div>

            {/* Détails techniques */}
            {result.functionResult && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1">Résultat de la fonction:</h4>
                <div className="bg-gray-100 p-3 rounded text-sm">
                  <pre className="whitespace-pre-wrap overflow-auto">
                    {JSON.stringify(result.functionResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Erreur */}
            {result.error && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1 text-red-700">Erreur technique:</h4>
                <div className="bg-red-100 p-3 rounded text-sm text-red-800">
                  {result.error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">📝 Instructions</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p><strong>1. Configuration requise:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Variable <code>REACT_APP_OPENAI_API_KEY</code> dans .env</li>
            <li>Variables Supabase configurées</li>
            <li>Tables: employes_cuisine_new, absences_cuisine_advanced, planning_cuisine_new</li>
          </ul>
          
          <p><strong>2. Tests recommandés:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Vérifier la connexion base (bouton bleu)</li>
            <li>Tester une lecture: "Qui est absent ?"</li>
            <li>Tester une création: "Carla malade demain"</li>
            <li>Tester le planning: "Planning d'aujourd'hui"</li>
          </ul>

          <p><strong>3. Intégration:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Une fois validé, ajouter <code>&lt;HRChatbotAutonome /&gt;</code> à votre App.js</li>
            <li>Le chatbot sera autonome et indépendant de l'app existante</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TestHRChatbot; 