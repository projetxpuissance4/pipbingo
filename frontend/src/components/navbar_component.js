import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Upload, User, Wifi, WifiOff } from 'lucide-react';
import { useP2PStats } from '../hooks/useP2PStatus';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { stats, error: p2pError } = useP2PStats();

  // Détecter le scroll pour changer le fond
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-pipbin-dark/95 backdrop-blur-md shadow-lg' 
          : 'bg-gradient-to-b from-pipbin-dark/80 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-purple-blue blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <Play className="relative w-10 h-10 text-pipbin-purple" fill="currentColor" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-purple-blue bg-clip-text text-transparent">
              pip bin Go
            </h1>
          </Link>

          {/* Navigation principale */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink to="/" active={isActive('/')}>
              Accueil
            </NavLink>
            <NavLink to="/upload" active={isActive('/upload')}>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </NavLink>
          </div>

          {/* Section droite */}
          <div className="flex items-center space-x-4">
            {/* Indicateur P2P */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full bg-pipbin-surface/50 backdrop-blur-sm border border-pipbin-hover"
            >
              {p2pError ? (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-400">P2P Offline</span>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Wifi className="w-4 h-4 text-pipbin-blue" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-pipbin-blue/30 rounded-full blur-sm"
                    />
                  </div>
                  <span className="text-xs text-gray-300">
                    {stats.connected_peers} peer{stats.connected_peers > 1 ? 's' : ''}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </>
              )}
            </motion.div>

            {/* Avatar utilisateur */}
            <Link to="/profile">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-full bg-gradient-purple-blue flex items-center justify-center shadow-glow-purple"
              >
                <User className="w-6 h-6 text-white" />
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

// Composant NavLink réutilisable
const NavLink = ({ to, active, children }) => (
  <Link to={to}>
    <motion.div
      whileHover={{ y: -2 }}
      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'text-white bg-pipbin-hover'
          : 'text-gray-400 hover:text-white hover:bg-pipbin-hover/50'
      }`}
    >
      {children}
    </motion.div>
  </Link>
);

export default Navbar;
