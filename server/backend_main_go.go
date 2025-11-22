package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/protocol"
	"github.com/multiformats/go-multiaddr"
	"github.com/rs/cors"
)

// ============================================
// MODÈLES DE DONNÉES
// ============================================

// Video représente une vidéo dans le catalogue
type Video struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Filename    string    `json:"filename"`
	Thumbnail   string    `json:"thumbnail"`
	Duration    int       `json:"duration"`    // en secondes
	Size        int64     `json:"size"`        // en octets
	Creator     string    `json:"creator"`
	UploadedAt  time.Time `json:"uploaded_at"`
}

// P2PRequest représente une demande de fichier P2P
type P2PRequest struct {
	Action     string `json:"action"`
	Filename   string `json:"filename"`
	ChunkIndex int    `json:"chunk_index"`
}

// P2PResponse représente la réponse P2P
type P2PResponse struct {
	Status      string `json:"status"`
	ChunkData   []byte `json:"chunk_data,omitempty"`
	ChunkIndex  int    `json:"chunk_index"`
	TotalChunks int    `json:"total_chunks"`
	Error       string `json:"error,omitempty"`
}

// ============================================
// CONFIGURATION GLOBALE
// ============================================

const (
	HTTPPort           = ":8080"
	P2PPort            = 10000
	UploadDir          = "./uploads"
	ThumbnailDir       = "./thumbnails"
	MaxFileSize        = 300 * 1024 * 1024 // 300 Mo
	MaxVideoDuration   = 10 * 60           // 10 minutes
	P2PProtocolID      = "/pipbingo/get/1.0.0"
	ChunkSize          = 256 * 1024 // 256 Ko par chunk
)

// ============================================
// SERVEUR PRINCIPAL
// ============================================

type Server struct {
	catalog     map[string]*Video
	catalogLock sync.RWMutex
	p2pHost     host.Host
}

func NewServer() *Server {
	return &Server{
		catalog: make(map[string]*Video),
	}
}

// ============================================
// INITIALISATION
// ============================================

func (s *Server) Initialize() error {
	// Créer les dossiers nécessaires
	dirs := []string{UploadDir, ThumbnailDir}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("impossible de créer %s: %w", dir, err)
		}
	}

	// Initialiser le nœud P2P
	if err := s.initP2PNode(); err != nil {
		return fmt.Errorf("erreur P2P: %w", err)
	}

	// Charger le catalogue existant
	s.loadCatalog()

	log.Println("✅ Serveur initialisé avec succès")
	return nil
}

// initP2PNode démarre le nœud libp2p
func (s *Server) initP2PNode() error {
	ctx := context.Background()

	// Configuration du nœud
	listenAddr := fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", P2PPort)
	addr, err := multiaddr.NewMultiaddr(listenAddr)
	if err != nil {
		return err
	}

	// Créer le host libp2p
	h, err := libp2p.New(
		libp2p.ListenAddrs(addr),
		libp2p.EnableRelay(), // Permet le relaying pour traverser les NAT
	)
	if err != nil {
		return err
	}

	s.p2pHost = h

	// Configurer le protocole custom
	h.SetStreamHandler(protocol.ID(P2PProtocolID), s.handleP2PStream)

	log.Printf("🌐 Nœud P2P démarré")
	log.Printf("   ID: %s", h.ID())
	log.Printf("   Addrs: %v", h.Addrs())

	return nil
}

// handleP2PStream gère les demandes de fichiers P2P
func (s *Server) handleP2PStream(stream network.Stream) {
	defer stream.Close()

	// Lire la requête
	decoder := json.NewDecoder(stream)
	var req P2PRequest
	if err := decoder.Decode(&req); err != nil {
		log.Printf("❌ Erreur décodage requête P2P: %v", err)
		s.sendP2PError(stream, "invalid_request")
		return
	}

	log.Printf("📥 Requête P2P reçue: %s (chunk %d)", req.Filename, req.ChunkIndex)

	// Traiter selon l'action
	switch req.Action {
	case "request_file":
		s.handleFileRequest(stream, req)
	default:
		s.sendP2PError(stream, "unknown_action")
	}
}

// handleFileRequest envoie un chunk de fichier
func (s *Server) handleFileRequest(stream network.Stream, req P2PRequest) {
	filePath := filepath.Join(UploadDir, filepath.Base(req.Filename))

	// Vérifier l'existence du fichier
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		log.Printf("❌ Fichier introuvable: %s", req.Filename)
		s.sendP2PError(stream, "file_not_found")
		return
	}

	// Calculer le nombre total de chunks
	totalChunks := int(fileInfo.Size()/ChunkSize) + 1

	// Ouvrir le fichier
	file, err := os.Open(filePath)
	if err != nil {
		s.sendP2PError(stream, "read_error")
		return
	}
	defer file.Close()

	// Se positionner au bon chunk
	offset := int64(req.ChunkIndex) * ChunkSize
	if _, err := file.Seek(offset, 0); err != nil {
		s.sendP2PError(stream, "seek_error")
		return
	}

	// Lire le chunk
	chunkData := make([]byte, ChunkSize)
	n, err := file.Read(chunkData)
	if err != nil && err != io.EOF {
		s.sendP2PError(stream, "read_error")
		return
	}

	// Préparer la réponse
	response := P2PResponse{
		Status:      "success",
		ChunkData:   chunkData[:n],
		ChunkIndex:  req.ChunkIndex,
		TotalChunks: totalChunks,
	}

	// Envoyer la réponse
	encoder := json.NewEncoder(stream)
	if err := encoder.Encode(response); err != nil {
		log.Printf("❌ Erreur envoi réponse: %v", err)
	}

	log.Printf("✅ Chunk %d/%d envoyé pour %s", req.ChunkIndex+1, totalChunks, req.Filename)
}

// sendP2PError envoie une erreur P2P
func (s *Server) sendP2PError(stream network.Stream, errMsg string) {
	response := P2PResponse{
		Status: "error",
		Error:  errMsg,
	}
	json.NewEncoder(stream).Encode(response)
}

// ============================================
// HANDLERS HTTP
// ============================================

// handleUpload gère l'upload de vidéos
func (s *Server) handleUpload(w http.ResponseWriter, r *http.Request) {
	// Parser le multipart form (limite 300 Mo)
	if err := r.ParseMultipartForm(MaxFileSize); err != nil {
		http.Error(w, "Fichier trop volumineux (max 300 Mo)", http.StatusBadRequest)
		return
	}

	// Récupérer le fichier
	file, header, err := r.FormFile("video")
	if err != nil {
		http.Error(w, "Aucun fichier fourni", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Valider le type MIME
	if !strings.HasPrefix(header.Header.Get("Content-Type"), "video/") {
		http.Error(w, "Le fichier doit être une vidéo", http.StatusBadRequest)
		return
	}

	// Générer un nom de fichier sécurisé
	filename := fmt.Sprintf("video_%d%s", time.Now().Unix(), filepath.Ext(header.Filename))
	destPath := filepath.Join(UploadDir, filename)

	// Sauvegarder le fichier
	dest, err := os.Create(destPath)
	if err != nil {
		http.Error(w, "Erreur de sauvegarde", http.StatusInternalServerError)
		return
	}
	defer dest.Close()

	size, err := io.Copy(dest, file)
	if err != nil {
		http.Error(w, "Erreur de copie", http.StatusInternalServerError)
		return
	}

	// Créer l'entrée vidéo
	video := &Video{
		ID:          generateID(),
		Title:       r.FormValue("title"),
		Description: r.FormValue("description"),
		Filename:    filename,
		Size:        size,
		Creator:     r.FormValue("creator"),
		UploadedAt:  time.Now(),
		Thumbnail:   "/thumbnails/default.jpg", // À implémenter: génération miniature
	}

	// Ajouter au catalogue
	s.catalogLock.Lock()
	s.catalog[video.ID] = video
	s.catalogLock.Unlock()

	log.Printf("✅ Vidéo uploadée: %s (%s)", video.Title, filename)

	// Répondre avec les infos
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(video)
}

// handleList renvoie le catalogue
func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	s.catalogLock.RLock()
	defer s.catalogLock.RUnlock()

	// Convertir la map en slice
	videos := make([]*Video, 0, len(s.catalog))
	for _, video := range s.catalog {
		videos = append(videos, video)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(videos)
}

// handlePeerInfo renvoie les infos du nœud P2P
func (s *Server) handlePeerInfo(w http.ResponseWriter, r *http.Request) {
	info := map[string]interface{}{
		"peer_id": s.p2pHost.ID().String(),
		"addrs":   s.p2pHost.Addrs(),
		"peers":   len(s.p2pHost.Network().Peers()),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

// ============================================
// UTILITAIRES
// ============================================

// loadCatalog charge le catalogue depuis le disque
func (s *Server) loadCatalog() {
	files, err := os.ReadDir(UploadDir)
	if err != nil {
		log.Printf("⚠️ Impossible de lire %s: %v", UploadDir, err)
		return
	}

	for _, file := range files {
		if !file.IsDir() && strings.HasPrefix(file.Name(), "video_") {
			info, _ := file.Info()
			video := &Video{
				ID:         generateID(),
				Title:      strings.TrimSuffix(file.Name(), filepath.Ext(file.Name())),
				Filename:   file.Name(),
				Size:       info.Size(),
				UploadedAt: info.ModTime(),
				Creator:    "Anonymous",
				Thumbnail:  "/thumbnails/default.jpg",
			}
			s.catalog[video.ID] = video
		}
	}

	log.Printf("📚 Catalogue chargé: %d vidéos", len(s.catalog))
}

// generateID génère un ID unique
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// ============================================
// MAIN
// ============================================

func main() {
	log.Println("🎬 Démarrage de pip bin Go Server...")

	// Créer le serveur
	server := NewServer()
	if err := server.Initialize(); err != nil {
		log.Fatalf("❌ Erreur initialisation: %v", err)
	}

	// Configurer le routeur HTTP
	router := mux.NewRouter()

	// Routes API
	router.HandleFunc("/upload", server.handleUpload).Methods("POST")
	router.HandleFunc("/list", server.handleList).Methods("GET")
	router.HandleFunc("/peer-info", server.handlePeerInfo).Methods("GET")
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Servir les fichiers statiques (uploads, thumbnails)
	router.PathPrefix("/uploads/").Handler(
		http.StripPrefix("/uploads/", http.FileServer(http.Dir(UploadDir))),
	)
	router.PathPrefix("/thumbnails/").Handler(
		http.StripPrefix("/thumbnails/", http.FileServer(http.Dir(ThumbnailDir))),
	)

	// Configuration CORS
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	// Démarrer le serveur HTTP
	log.Printf("🚀 Serveur HTTP démarré sur http://localhost%s", HTTPPort)
	log.Printf("🌐 Nœud P2P actif sur le port %d", P2PPort)
	log.Println("📡 Prêt à recevoir des uploads et à seeder des vidéos!")

	if err := http.ListenAndServe(HTTPPort, corsHandler.Handler(router)); err != nil {
		log.Fatalf("❌ Erreur serveur HTTP: %v", err)
	}
}
