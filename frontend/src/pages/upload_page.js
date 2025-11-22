import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, Film, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const UploadPage = () => {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creator, setCreator] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    setError(null);

    if (!selectedFile) return;

    // Vérifier le type
    if (!selectedFile.type.startsWith('video/')) {
      setError('Veuillez sélectionner un fichier vidéo');
      return;
    }

    // Vérifier la taille (300 Mo max)
    const maxSize = 300 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('La vidéo ne doit pas dépasser 300 Mo (10 minutes max)');
      return;
    }

    setFile(selectedFile);
    
    // Remplir automatiquement le titre avec le nom du fichier
    if (!title) {
      const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(fileName);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Veuillez sélectionner une vidéo');
      return;
    }

    if (!title.trim()) {
      setError('Veuillez entrer un titre');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('creator', creator || 'Anonymous');

      await api.uploadVideo(formData, (progressValue) => {
        setProgress(progressValue);
      });

      setSuccess(true);
      
      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      setError('Erreur lors de l\'upload : ' + err.message);
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-pipbin-dark pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-12"
        >
          <h1 className="text-4xl font-bold bg-gradient-purple-blue bg-clip-text text-transparent">
            Uploader une vidéo
          </h1>
          <p className="text-gray-400">
            Partagez vos vidéos avec la communauté P2P (max 10 min / 300 Mo)
          </p>
        </motion.div>

        {/* Formulaire */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* Zone de drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
              dragging
                ? 'border-pipbin-purple bg-pipbin-purple/10 scale-102'
                : file
                ? 'border-green-500 bg-green-500/5'
                : 'border-pipbin-hover bg-pipbin-surface hover:border-pipbin-purple/50'
            }`}
          >
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
              disabled={uploading}
            />

            {!file ? (
              <label htmlFor="file-input" className="cursor-pointer">
                <div className="text-center space-y-4">
                  <motion.div
                    animate={{
                      y: dragging ? [0, -10, 0] : 0,
                    }}
                    transition={{ repeat: dragging ? Infinity : 0, duration: 1 }}
                    className="flex justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-purple-blue flex items-center justify-center shadow-glow-purple">
                      <Upload className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>

                  <div>
                    <p className="text-xl font-bold text-white mb-2">
                      {dragging ? 'Déposez votre vidéo ici' : 'Glissez votre vidéo ici'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      ou cliquez pour parcourir vos fichiers
                    </p>
                  </div>

                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                    <span>MP4, MOV, AVI</span>
                    <span>•</span>
                    <span>Max 300 Mo</span>
                    <span>•</span>
                    <span>10 min max</span>
                  </div>
                </div>
              </label>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-lg bg-gradient-purple-blue flex items-center justify-center">
                    <Film className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} Mo
                    </p>
                  </div>
                </div>

                {!uploading && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Champs du formulaire */}
          <AnimatePresence>
            {file && !success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                {/* Titre */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Titre de la vidéo *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Mon incroyable aventure..."
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-pipbin-surface border border-pipbin-hover rounded-lg text-white placeholder-gray-500 focus:border-pipbin-purple focus:ring-2 focus:ring-pipbin-purple/50 outline-none transition-all disabled:opacity-50"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre vidéo..."
                    disabled={uploading}
                    rows={4}
                    className="w-full px-4 py-3 bg-pipbin-surface border border-pipbin-hover rounded-lg text-white placeholder-gray-500 focus:border-pipbin-purple focus:ring-2 focus:ring-pipbin-purple/50 outline-none transition-all resize-none disabled:opacity-50"
                  />
                </div>

                {/* Créateur */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Nom du créateur
                  </label>
                  <input
                    type="text"
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    placeholder="Votre nom ou pseudo (optionnel)"
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-pipbin-surface border border-pipbin-hover rounded-lg text-white placeholder-gray-500 focus:border-pipbin-purple focus:ring-2 focus:ring-pipbin-purple/50 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                {/* Barre de progression */}
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                  >
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Upload en cours...</span>
                      <span className="text-pipbin-purple font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-pipbin-surface rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-purple-blue"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Bouton submit */}
                <motion.button
                  whileHover={{ scale: uploading ? 1 : 1.02 }}
                  whileTap={{ scale: uploading ? 1 : 0.98 }}
                  type="submit"
                  disabled={uploading}
                  className="w-full py-4 bg-gradient-purple-blue text-white font-bold rounded-lg shadow-glow-purple hover:shadow-glow-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Upload en cours...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Uploader la vidéo</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages d'erreur/succès */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-500/50 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center space-y-4 p-8 bg-green-500/10 border border-green-500/50 rounded-lg text-center"
              >
                <CheckCircle className="w-16 h-16 text-green-500" />
                <div>
                  <p className="text-green-400 font-bold text-lg">Upload réussi !</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Votre vidéo est maintenant disponible sur le réseau P2P
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      </div>
    </div>
  );
};

export default UploadPage;
