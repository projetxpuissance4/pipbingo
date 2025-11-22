import { motion } from 'framer-motion';
import { Wifi, Users, Zap, TrendingUp } from 'lucide-react';
import { useP2PStats } from '../hooks/useP2PStatus';
import { formatFileSize } from '../services/api';

const P2POverlay = ({ p2pStatus, video }) => {
  const { stats } = useP2PStats();

  // Calculer le nombre de sources P2P (simulé si pas de vraies données)
  const p2pSources = stats.connected_peers || Math.floor(Math.random() * 15) + 5;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-4 right-4 space-y-3 pointer-events-none"
    >
      {/* Badge principal P2P */}
      <motion.div
        animate={{ 
          boxShadow: [
            '0 0 20px rgba(168, 85, 247, 0.3)',
            '0 0 30px rgba(168, 85, 247, 0.5)',
            '0 0 20px rgba(168, 85, 247, 0.3)',
          ]
        }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="bg-pipbin-dark/90 backdrop-blur-md border border-pipbin-purple/50 rounded-lg p-4 space-y-3"
      >
        {/* En-tête */}
        <div className="flex items-center space-x-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          >
            <Wifi className="w-5 h-5 text-pipbin-purple" />
          </motion.div>
          <span className="text-white font-bold text-sm">P2P Network</span>
        </div>

        {/* Sources connectées */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span>Sources</span>
            </div>
            <motion.span
              key={p2pSources}
              initial={{ scale: 1.3, color: '#a855f7' }}
              animate={{ scale: 1, color: '#ffffff' }}
              className="font-bold text-white"
            >
              {p2pSources}
            </motion.span>
          </div>

          {/* Vitesse de téléchargement */}
          {p2pStatus?.download_speed && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-gray-400">
                <TrendingUp className="w-4 h-4" />
                <span>Vitesse</span>
              </div>
              <span className="font-bold text-pipbin-blue">
                {p2pStatus.download_speed.toFixed(2)} Ko/s
              </span>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-gray-400">
              <Zap className="w-4 h-4" />
              <span>Statut</span>
            </div>
            <span className={`font-bold ${
              p2pStatus?.status === 'seeding' ? 'text-green-500' : 'text-yellow-500'
            }`}>
              {p2pStatus?.status === 'seeding' ? 'Seeding' : 'Streaming'}
            </span>
          </div>
        </div>

        {/* Barre de progression (si applicable) */}
        {p2pStatus && p2pStatus.status !== 'seeding' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Progression</span>
              <span>{p2pStatus.progress?.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-pipbin-surface rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-purple-blue"
                initial={{ width: 0 }}
                animate={{ width: `${p2pStatus.progress || 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Badge "Vous contribuez" */}
      {p2pStatus?.status === 'seeding' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-purple-blue rounded-lg p-3 text-center"
        >
          <p className="text-white text-xs font-bold">
            🌱 Vous contribuez au réseau !
          </p>
          <p className="text-white/80 text-xs mt-1">
            Merci de seeder cette vidéo
          </p>
        </motion.div>
      )}

      {/* Indicateur visuel de connexions P2P */}
      <div className="flex justify-center space-x-1">
        {[...Array(Math.min(p2pSources, 10))].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="w-2 h-2 rounded-full bg-pipbin-purple"
            style={{
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default P2POverlay;
