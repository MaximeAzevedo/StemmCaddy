import React, { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Context pour gérer les notifications globalement
const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications doit être utilisé dans NotificationProvider');
  }
  return context;
};

// Types de notifications avec leurs configurations
const notificationTypes = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'from-emerald-500 to-green-600',
    borderColor: 'border-emerald-400',
    shadowColor: 'shadow-emerald-500/30'
  },
  error: {
    icon: XCircleIcon,
    bgColor: 'from-red-500 to-rose-600',
    borderColor: 'border-red-400',
    shadowColor: 'shadow-red-500/30'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-400',
    shadowColor: 'shadow-amber-500/30'
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-400',
    shadowColor: 'shadow-blue-500/30'
  },
  ai: {
    icon: SparklesIcon,
    bgColor: 'from-purple-500 to-violet-600',
    borderColor: 'border-purple-400',
    shadowColor: 'shadow-purple-500/30'
  }
};

// Composant individuel de notification
const PremiumNotification = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const config = notificationTypes[notification.type] || notificationTypes.info;
  const Icon = config.icon;

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${
        isRemoving ? 'translate-x-full opacity-0 scale-95' : ''
      }`}
    >
      <div
        className={`
          relative max-w-md w-full bg-gradient-to-r ${config.bgColor}
          rounded-xl shadow-xl ${config.shadowColor} shadow-lg
          border ${config.borderColor} backdrop-blur-sm
          overflow-hidden group hover:scale-105 transition-transform duration-200
        `}
      >
        {/* Effet de brillance animé */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        {/* Contenu principal */}
        <div className="relative p-4 text-white">
          <div className="flex items-start gap-3">
            {/* Icône avec animation */}
            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-5 h-5 text-white animate-pulse" />
            </div>
            
            {/* Contenu du message */}
            <div className="flex-1 min-w-0">
              {notification.title && (
                <h3 className="font-semibold text-sm mb-1 text-white/95">
                  {notification.title}
                </h3>
              )}
              <div className="text-sm text-white/90 leading-relaxed">
                {notification.message.split('\n').map((line, index) => (
                  <div key={index} className={index > 0 ? 'mt-1' : ''}>
                    {line}
                  </div>
                ))}
              </div>
              
              {/* Actions si présentes */}
              {notification.actions && (
                <div className="flex gap-2 mt-3">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors duration-200 backdrop-blur-sm"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Bouton fermer */}
            <button
              onClick={handleRemove}
              className="flex-shrink-0 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200 backdrop-blur-sm"
            >
              <XMarkIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        
        {/* Barre de progression si durée définie */}
        {notification.duration && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-white/60 transition-all linear"
              style={{
                animation: `shrink ${notification.duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Container des notifications
const NotificationContainer = ({ notifications, onRemove }) => {
  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <PremiumNotification
            notification={notification}
            onRemove={onRemove}
          />
        </div>
      ))}
    </div>,
    document.body
  );
};

// Provider principal
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      duration: 4000, // Durée par défaut
      ...notification
    };
    
    setNotifications(prev => [...prev, newNotification]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const removeAll = () => {
    setNotifications([]);
  };

  // API simplifiée similaire à react-hot-toast
  const toast = {
    success: (message, options = {}) => {
      return addNotification({
        type: 'success',
        message,
        title: options.title || 'Succès',
        ...options
      });
    },
    
    error: (message, options = {}) => {
      return addNotification({
        type: 'error',
        message,
        title: options.title || 'Erreur',
        duration: options.duration || 5000,
        ...options
      });
    },
    
    warning: (message, options = {}) => {
      return addNotification({
        type: 'warning',
        message,
        title: options.title || 'Attention',
        ...options
      });
    },
    
    info: (message, options = {}) => {
      return addNotification({
        type: 'info',
        message,
        title: options.title || 'Information',
        ...options
      });
    },
    
    ai: (message, options = {}) => {
      return addNotification({
        type: 'ai',
        message,
        title: options.title || 'Assistant IA',
        duration: options.duration || 6000,
        ...options
      });
    },
    
    loading: (message, options = {}) => {
      return addNotification({
        type: 'info',
        message,
        title: options.title || 'Chargement...',
        duration: null, // Pas de durée par défaut pour les loading
        ...options
      });
    },
    
    dismiss: removeNotification,
    dismissAll: removeAll
  };

  return (
    <NotificationContext.Provider value={{ toast, notifications }}>
      {children}
      <NotificationContainer 
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export default { NotificationProvider, useNotifications }; 