import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Loader2
} from 'lucide-react';
import P2POverlay from './P2POverlay';
import { daemon } from '../services/api';
import { useP2PStatus, useVideoDownload } from '../hooks/useP2PStatus';

const VideoPlayer = ({ video }) => {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const { startDownload, downloading } = useVideoDownload();
  const { status: p2pStatus } = useP2PStatus(video.filename, true);

  // Démarrer le téléchargement P2P au montage
  useEffect(() => {
    const initDownload = async () => {
      // Vérifier si déjà en cache ou en cours
      if (p2pStatus?.status === 'seeding' || p2pStatus?.status === 'completed') {
        setLoading(false);
        setVideoReady(true);
        return;
      }

      // Démarrer le téléchargement
      setLoading(true);
      const success = await startDownload(video.filename);
      if (success) {
        setLoading(false);
      }
    };

    initDownload();
  }, [video.filename]);

  // Surveiller la progression du téléchargement
  useEffect(() => {
    if (p2pStatus?.status === 'completed' || p2pStatus?.status === 'seeding') {
      setVideoReady(true);
      setLoading(false);
    }
  }, [p2pStatus]);

  // Gestion de la lecture
  const togglePlay = () => {
    if (!videoReady) return;

    if (playing) {
      videoRef.current?.pause();
    } else {
      videoRef.current?.play();
    }
    setPlaying(!playing);
  };

  // Mise à jour de la progression
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress || 0);
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, [videoReady]);

  // Gestion du volume
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // Masquer les contrôles après inactivité
  useEffect(() => {
    let timeout;
    const resetTimeout = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    resetTimeout();
    window.addEventListener('mousemove', resetTimeout);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimeout);
    };
  }, []);

  return (
    <div 
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl group"
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Vidéo */}
      {videoReady && (
        <video
          ref={videoRef}
          src={daemon.getStreamURL(video.filename)}
          className="w-full h-full"
          onClick={togglePlay}
          onEnded={() => setPlaying(false)}
        />
      )}

      {/* État de chargement P2P */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-pipbin-dark flex flex-col items-center justify-center space-y-6"
          >
            <Loader2 className="w-16 h-16 text-pipbin-purple animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-white text-lg font-medium">
                Téléchargement P2P en cours...
              </p>
              {p2pStatus && (
                <div className="space-y-2">
                  <p className="text-pipbin-blue text-sm">
                    {p2pStatus.progress?.toFixed(1)}% - {(p2pStatus.download_speed || 0).toFixed(2)} Ko/s
                  </p>
                  <div className="w-64 h-2 bg-pipbin-surface rounded-full overflow-hidden mx-auto">
                    <motion.div
                      className="h-full bg-gradient-purple-blue"
                      initial={{ width: 0 }}
                      animate={{ width: `${p2pStatus.progress || 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay P2P (pendant la lecture) */}
      {videoReady && <P2POverlay p2pStatus={p2pStatus} video={video} />}

      {/* Contrôles vidéo */}
      <AnimatePresence>
        {showControls && videoReady && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6"
          >
            {/* Barre de progression */}
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => {
                const newTime = (videoRef.current.duration * e.target.value) / 100;
                videoRef.current.currentTime = newTime;
              }}
              className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer mb-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pipbin-purple"
            />

            {/* Contrôles */}
            <div className="flex items-center justify-between">
              {/* Gauche : Play + Volume */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePlay}
                  className="text-white hover:text-pipbin-purple transition-colors"
                >
                  {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" fill="currentColor" />}
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="text-white hover:text-pipbin-purple transition-colors"
                  >
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>

                <span className="text-white text-sm">
                  {Math.floor(videoRef.current?.currentTime || 0 / 60)}:{Math.floor(videoRef.current?.currentTime || 0 % 60).toString().padStart(2, '0')} / {Math.floor(videoRef.current?.duration || 0 / 60)}:{Math.floor(videoRef.current?.duration || 0 % 60).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Droite : Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-pipbin-purple transition-colors"
              >
                {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bouton play central (quand en pause) */}
      {!playing && videoReady && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        >
          <Play className="w-10 h-10 text-pipbin-dark ml-2" fill="currentColor" />
        </motion.button>
      )}
    </div>
  );
};

export default VideoPlayer;
