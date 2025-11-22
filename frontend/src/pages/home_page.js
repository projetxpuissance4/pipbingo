import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroHeader from '../components/HeroHeader';
import VideoGrid from '../components/VideoGrid';
import { api } from '../services/api';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const data = await api.getVideos();
      setVideos(data);
      setError(null);
    } catch (err) {
      setError('Impossible de charger les vidéos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sélectionner la vidéo en vedette (la plus récente)
  const featuredVideo = videos.length > 0 ? videos[0] : null;
  const otherVideos = videos.slice(1);

  return (
    <div className="min-h-screen bg-pipbin-dark">
      {/* Hero Section */}
      <div className="pt-16">
        <HeroHeader featuredVideo={featuredVideo} />
      </div>

      {/* Grille de vidéos */}
      <div className="relative z-10 -mt-20">
        {error ? (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-center"
            >
              <p className="text-red-400 font-medium">{error}</p>
              <button
                onClick={loadVideos}
                className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Réessayer
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            <VideoGrid
              videos={otherVideos}
              title="Vidéos populaires"
              loading={loading}
            />

            {!loading && videos.length > 0 && (
              <VideoGrid
                videos={videos}
                title="Toutes les vidéos"
                loading={false}
              />
            )}
          </>
        )}
      </div>

      {/* Section P2P expliquée */}
      {!loading && videos.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-7xl mx-auto px-6 py-20"
        >
          <div className="bg-gradient-to-r from-pipbin-purple/10 to-pipbin-blue/10 border border-pipbin-purple/20 rounded-2xl p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold bg-gradient-purple-blue bg-clip-text text-transparent">
              Propulsé par la technologie P2P
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              pip bin Go utilise un réseau peer-to-peer décentralisé pour diffuser les vidéos. 
              Plus il y a d'utilisateurs qui regardent, plus le streaming est rapide et efficace !
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <FeatureCard
                icon="⚡"
                title="Ultra Rapide"
                description="Téléchargement depuis plusieurs sources simultanément"
              />
              <FeatureCard
                icon="🌍"
                title="Décentralisé"
                description="Aucun point de défaillance unique"
              />
              <FeatureCard
                icon="🤝"
                title="Communautaire"
                description="Chaque utilisateur contribue au réseau"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <motion.div
    whileHover={{ y: -5, scale: 1.02 }}
    className="bg-pipbin-surface rounded-xl p-6 space-y-3"
  >
    <div className="text-4xl">{icon}</div>
    <h3 className="text-white font-bold text-xl">{title}</h3>
    <p className="text-gray-400 text-sm">{description}</p>
  </motion.div>
);

export default Home;
