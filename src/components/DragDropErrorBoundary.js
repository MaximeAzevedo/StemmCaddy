import React from 'react';

class DragDropErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Détecter spécifiquement les erreurs de react-beautiful-dnd
    if (error.message && (
      error.message.includes('Cannot find droppable') ||
      error.message.includes('Draggable') ||
      error.message.includes('react-beautiful-dnd')
    )) {
      return { hasError: true };
    }
    
    // Pour les autres erreurs, laisser passer
    return null;
  }

  componentDidCatch(error, errorInfo) {
    console.warn('🚨 DragDrop Error Boundary:', error, errorInfo);
    
    // Log spécifique pour react-beautiful-dnd
    if (error.message && error.message.includes('Cannot find droppable')) {
      console.warn('⚠️ React Beautiful DND Error detected - Auto-recovery in progress...');
      
      // Auto-recovery après 1 seconde
      setTimeout(() => {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }, 1000);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              Synchronisation du planning en cours...
            </h3>
            <p className="text-yellow-600 mb-4">
              Le système se remet automatiquement en ordre.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                // Forcer un refresh de la page si nécessaire
                if (this.props.onReset) {
                  this.props.onReset();
                }
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              🔄 Actualiser maintenant
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DragDropErrorBoundary; 