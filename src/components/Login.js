import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabaseAPI } from '../lib/supabase';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: 'maxime@caddy.lu',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Tentative de connexion avec Supabase
      const { data, error } = await supabaseAPI.signIn(credentials.email, credentials.password);
      
      if (error) {
        // Fallback sur l'ancien système de démo
        if (credentials.password === 'caddy123' || credentials.password === 'Cristobello54') {
          const userData = {
            id: 1,
            name: credentials.email === 'maxime@caddy.lu' ? 'Maxime' : credentials.email.split('@')[0] || 'Éducateur',
            email: credentials.email,
            role: credentials.email === 'maxime@caddy.lu' ? 'admin' : 'educateur'
          };
          
          toast.success(`Bienvenue ${userData.name} !`);
          onLogin(userData);
        } else {
          toast.error('Identifiants incorrects');
        }
      } else {
        // Connexion Supabase réussie
        const userData = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0],
          email: data.user.email,
          role: data.user.email === 'maxime@caddy.lu' ? 'admin' : 'educateur'
        };
        
        toast.success(`Bienvenue ${userData.name} !`);
        onLogin(userData);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      toast.error('Erreur de connexion');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4">
      {/* Arrière-plan animé */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full opacity-20 floating"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary-200 rounded-full opacity-20 floating" style={{animationDelay: '1s'}}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mb-4 shadow-premium"
          >
            <span className="text-3xl font-bold text-white">C</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Caddy</h1>
          <p className="text-gray-600">Connexion Éducateur</p>
        </div>

        {/* Formulaire */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="card-premium p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="votre.email@caddy.lu"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="Cristobello54"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Bouton de connexion */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Connexion...
                </div>
              ) : (
                'Se connecter'
              )}
            </motion.button>
          </form>

          {/* Aide */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Compte admin: <span className="font-mono bg-gray-100 px-2 py-1 rounded">maxime@caddy.lu</span>
              <br />
              Mot de passe: <span className="font-mono bg-gray-100 px-2 py-1 rounded">Cristobello54</span>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          © 2024 Caddy - Lutte contre le gaspillage alimentaire
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login; 