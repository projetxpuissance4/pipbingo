import { motion } from 'framer-motion';
import VideoCard from './VideoCard';

const VideoGrid = ({ videos, title = "Vidéos récentes", loading = false }) => {
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-gray-500 space-y-4"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-pipbin-surface flex items-center justify-center">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg">Aucune vidéo disponible</p>
            <p className="text-sm text-gray-600">Uploadez la première vidéo !</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl font-bold text-white mb-6"
      >
        {title}
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        {videos.map((video, index) => (
          <VideoCard key={video.id} video={video} index={index} />
        ))}
      </motion.div>
    </div>
  );
};

// Skeleton de chargement
const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="aspect-video bg-pipbin-surface rounded-lg mb-3" />
    <div className="h-4 bg-pipbin-surface rounded w-3/4 mb-2" />
    <div className="h-3 bg-pipbin-surface rounded w-1/2" />
  </div>
);

export default VideoGrid;
