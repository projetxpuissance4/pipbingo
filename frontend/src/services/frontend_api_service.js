import axios from 'axios';

// Client pour le serveur backend (port 8080)
const backendAPI = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Client pour le daemon local (port 9090)
const daemonAPI = axios.create({
  baseURL: '/daemon',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// API Backend (Serveur Central)
// ============================================

export const api = {
  // Récupérer le catalogue de vidéos
  getVideos: async () => {
    const response = await backendAPI.get('/list');
    return response.data;
  },

  // Upload une vidéo
  uploadVideo: async (formData, onProgress) => {
    const response = await backendAPI.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  // Infos du peer serveur
  getPeerInfo: async () => {
    const response = await backendAPI.get('/peer-info');
    return response.data;
  },

  // Health check
  checkHealth: async () => {
    const response = await backendAPI.get('/health');
    return response.data;
  },
};

// ============================================
// API Daemon Local (Client P2P)
// ============================================

export const daemon = {
  // Démarrer un téléchargement P2P
  downloadVideo: async (filename) => {
    const response = await daemonAPI.post('/download', { filename });
    return response.data;
  },

  // Récupérer le statut des téléchargements
  getDownloadStatus: async () => {
    const response = await daemonAPI.get('/status');
    return response.data;
  },

  // Récupérer les statistiques P2P
  getP2PStats: async () => {
    const response = await daemonAPI.get('/stats');
    return response.data;
  },

  // URL de streaming depuis le cache local
  getStreamURL: (filename) => {
    return `/daemon/stream/${filename}`;
  },

  // Health check
  checkHealth: async () => {
    const response = await daemonAPI.get('/health');
    return response.data;
  },
};

// ============================================
// Helpers
// ============================================

// Formater la taille de fichier
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Formater la durée
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Formater la date
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  // Moins d'une heure
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `Il y a ${mins} minute${mins > 1 ? 's' : ''}`;
  }
  
  // Moins d'un jour
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  }
  
  // Plus ancien
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export default { api, daemon };
