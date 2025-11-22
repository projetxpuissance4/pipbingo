import { useState, useEffect } from 'react';
import { daemon } from '../services/api';

/**
 * Hook pour surveiller le statut P2P en temps réel
 */
export const useP2PStatus = (filename, enabled = true) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !filename) {
      setLoading(false);
      return;
    }

    let interval;

    const fetchStatus = async () => {
      try {
        const allStatuses = await daemon.getDownloadStatus();
        const fileStatus = allStatuses[filename];
        
        if (fileStatus) {
          setStatus(fileStatus);
          setError(null);
        } else {
          setStatus(null);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    // Fetch initial
    fetchStatus();

    // Poll toutes les 2 secondes
    interval = setInterval(fetchStatus, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [filename, enabled]);

  return { status, loading, error };
};

/**
 * Hook pour les statistiques P2P globales
 */
export const useP2PStats = (refreshInterval = 5000) => {
  const [stats, setStats] = useState({
    peer_id: '',
    connected_peers: 0,
    seeding_files: 0,
    downloading_files: 0,
    cache_files: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;

    const fetchStats = async () => {
      try {
        const data = await daemon.getP2PStats();
        setStats(data);
        setError(null);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    // Fetch initial
    fetchStats();

    // Poll régulier
    if (refreshInterval > 0) {
      interval = setInterval(fetchStats, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshInterval]);

  return { stats, loading, error };
};

/**
 * Hook pour gérer le téléchargement d'une vidéo
 */
export const useVideoDownload = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const startDownload = async (filename) => {
    setDownloading(true);
    setError(null);

    try {
      await daemon.downloadVideo(filename);
      setDownloading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setDownloading(false);
      return false;
    }
  };

  return { startDownload, downloading, error };
};

export default { useP2PStatus, useP2PStats, useVideoDownload };
