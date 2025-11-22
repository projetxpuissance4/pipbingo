import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Upload from './pages/Upload';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-pipbin-dark">
        <Navbar />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>

        {/* Footer */}
        <footer className="border-t border-pipbin-hover py-8 mt-20">
          <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
            <p>
              pip bin Go - Propulsé par la technologie P2P 🚀
            </p>
            <p className="mt-2">
              © 2025 - Streaming décentralisé pour tous
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
