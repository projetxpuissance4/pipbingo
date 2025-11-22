import { motion } from 'framer-motion';
import { Play, Info, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeroHeader = ({ featuredVideo }) => {
  const navigate = useNavigate();

  if (!featuredVideo) {
    return (
      <div className="relative h-[70vh] bg-gradient-to-b from-pipbin-surface to-pipbin-dark flex items-center justify-center">
        <Sparkles className="w-16 h-16 text-pipbin-purple/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative h-[70vh] overflow-hidden">
      {/* Background avec gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-pipbin-dark via-pipbin-dark/70 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-pipbin-dark via-transparent to-transparent z-10" />
      
      {/* Image de fond (ou placeholder) */}
      <div className="absolute inset-0">
        <img
          src={featuredVideo.thumbnail || 'https://via.placeholder.com/1920x1080/1a1a1a/a855f7?text=pip+bin+Go'}
          alt={featuredVideo.title}
          className="w-full h-full object-cover opacity-40"
        />
      </div>

      {/* Contenu */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-6 flex items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl space-y-6"
        >
          {/* Badge P2P */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-pipbin-purple/20 border border-pipbin-purple/50 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 text-pipbin-purple" />
            <span className="text-sm font-medium text-pipbin-purple">
              Vidéo en vedette
            </span>
          </motion.div>

          {/* Titre */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-6xl font-bold text-white leading-tight"
          >
            {featuredVideo.title}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-gray-300 leading-relaxed"
          >
            {featuredVideo.description || 'Profitez de cette vidéo en streaming P2P ultra-rapide.'}
          </motion.p>

          {/* Métadonnées */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center space-x-4 text-sm text-gray-400"
          >
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>{featuredVideo.creator || 'Créateur'}</span>
            </span>
            <span>•</span>
            <span>Durée: {Math.floor(featuredVideo.duration / 60)}:{(featuredVideo.duration % 60).toString().padStart(2, '0')}</span>
          </motion.div>

          {/* Boutons d'action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center space-x-4 pt-4"
          >
            {/* Bouton Lecture */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/watch/${featuredVideo.id}`)}
              className="flex items-center space-x-3 px-8 py-4 bg-white text-pipbin-dark rounded-lg font-bold text-lg shadow-lg hover:bg-gray-200 transition-colors"
            >
              <Play className="w-6 h-6" fill="currentColor" />
              <span>Lecture</span>
            </motion.button>

            {/* Bouton Info */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-3 px-6 py-4 bg-pipbin-hover/80 text-white rounded-lg font-medium backdrop-blur-sm border border-pipbin-hover hover:bg-pipbin-hover transition-colors"
            >
              <Info className="w-5 h-5" />
              <span>Plus d'infos</span>
            </motion.button>
          </motion.div>

          {/* Badge P2P Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="pt-6 flex items-center space-x-2 text-xs text-pipbin-blue"
          >
            <div className="flex -space-x-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-gradient-purple-blue border-2 border-pipbin-dark"
                />
              ))}
            </div>
            <span>Disponible via 12 peers P2P</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Fade vers le bas */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-pipbin-dark to-transparent z-10" />
    </div>
  );
};

export default HeroHeader;
