import React, { useRef, useState } from 'react';
import { Upload, Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabaseCuisine } from '../lib/supabase-cuisine';

const PhotoUploader = ({ 
  employee, 
  onPhotoChange, 
  isCreateMode = false,
  className = "",
  colorScheme = "blue" // "blue" pour modification, "emerald" pour création
}) => {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * Ouvrir le sélecteur de fichier
   */
  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  /**
   * Gérer la sélection de fichier et upload
   */
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!employee) return;

    try {
      setPhotoUploading(true);
      
      // Créer un aperçu immédiat
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);

      // Pour la création, on stocke temporairement la photo sans upload immédiat
      if (isCreateMode) {
        // En mode création, on garde juste l'aperçu et le fichier
        // L'upload se fera lors de la création de l'employé
        const tempUrl = URL.createObjectURL(file);
        onPhotoChange({
          photo_url: tempUrl,
          photoFile: file // Stocker le fichier pour upload plus tard
        });
        toast.success('Photo sélectionnée !');
        return;
      }

      // Pour la modification, upload immédiat
      if (employee?.id) {
        // Supprimer l'ancienne photo si elle existe
        if (employee.photo_url) {
          await supabaseCuisine.deleteEmployeePhoto(employee.photo_url);
        }

        // Upload la nouvelle photo
        const result = await supabaseCuisine.uploadEmployeePhoto(file, employee.id);
        
        if (result.error) {
          throw new Error(result.error.message);
        }

        // Notifier le parent avec la nouvelle URL
        onPhotoChange({
          photo_url: result.data.url
        });

        toast.success('Photo uploadée avec succès !');
      }
      
    } catch (error) {
      console.error('❌ Erreur upload photo:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
      setPhotoPreview(null);
    } finally {
      setPhotoUploading(false);
      // Réinitialiser l'input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Supprimer la photo actuelle
   */
  const handleRemovePhoto = async () => {
    if (!employee?.photo_url) return;

    try {
      setPhotoUploading(true);
      
      // En mode création, supprimer juste l'aperçu
      if (isCreateMode) {
        onPhotoChange({
          photo_url: null,
          photoFile: null
        });
        setPhotoPreview(null);
        toast.success('Photo supprimée');
        return;
      }
      
      // En mode édition, supprimer de Supabase Storage
      if (employee?.photo_url) {
        await supabaseCuisine.deleteEmployeePhoto(employee.photo_url);
        
        onPhotoChange({
          photo_url: null
        });
      }
      
      setPhotoPreview(null);
      toast.success('Photo supprimée');
      
    } catch (error) {
      console.error('❌ Erreur suppression photo:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setPhotoUploading(false);
    }
  };

  const colorClasses = {
    blue: {
      label: "text-blue-700",
      border: "border-blue-200",
      dashed: "border-blue-300",
      bg: "bg-blue-50 hover:bg-blue-100",
      camera: "text-blue-400",
      text: "text-blue-600",
      button: "bg-blue-500 hover:bg-blue-600",
      help: "text-blue-500"
    },
    emerald: {
      label: "text-emerald-700", 
      border: "border-emerald-200",
      dashed: "border-emerald-300",
      bg: "bg-emerald-50 hover:bg-emerald-100",
      camera: "text-emerald-400",
      text: "text-emerald-600",
      button: "bg-emerald-500 hover:bg-emerald-600", 
      help: "text-emerald-500"
    }
  };

  const colors = colorClasses[colorScheme];

  return (
    <div className={className}>
      <label className={`block text-sm font-medium ${colors.label} mb-3`}>Photo de l'employé</label>
      
      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
      />
      
      {/* Zone d'upload/aperçu */}
      <div className="space-y-3">
        {(employee?.photo_url || photoPreview) ? (
          // Aperçu de la photo existante ou nouvelle
          <div className="relative">
            <img 
              src={photoPreview || employee.photo_url}
              alt="Photo employé"
              className={`w-32 h-32 rounded-xl object-cover border-2 ${colors.border} shadow-md`}
              style={{ objectPosition: 'center top' }}
            />
            {photoUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
              </div>
            )}
          </div>
        ) : (
          // Zone d'upload vide
          <div className={`w-32 h-32 border-2 border-dashed ${colors.dashed} rounded-xl flex flex-col items-center justify-center ${colors.bg} transition-colors`}>
            <Camera className={`w-8 h-8 ${colors.camera} mb-2`} />
            <p className={`text-xs ${colors.text} text-center`}>Pas de photo</p>
          </div>
        )}
        
        {/* Boutons d'action */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectPhoto}
            disabled={photoUploading}
            className={`flex items-center gap-2 px-4 py-2 ${colors.button} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm`}
          >
            {photoUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {employee?.photo_url ? 'Changer la photo' : 'Ajouter une photo'}
          </button>
          
          {(employee?.photo_url || photoPreview) && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={photoUploading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          )}
        </div>

        {/* Aide */}
        <p className={`text-xs ${colors.help}`}>
          Formats acceptés : JPG, PNG, WebP (max 5MB)
        </p>
      </div>
    </div>
  );
};

export default PhotoUploader; 