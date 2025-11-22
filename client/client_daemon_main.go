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
// CONFIGURATION
// ============================================

const (
	LocalAPIPort      = ":9090"
	P2PListenPort     = 10001
	CacheDir          = "./cache"
	ServerHTTPURL     = "http://localhost:8080"
	ServerP2PAddr     = "/ip4/127.0.0.1/tcp/10000"
	P2PProtocolID     = "/pipbingo/get/1.0.0"
	ChunkSize         = 256 * 1024 // 256 Ko
	MaxConcurrentDL   = 3          // Téléchargements simultanés max
)

// ============================================
// MODÈLES
// ============================================

// DownloadStatus représente l'état d'un téléchargement
type DownloadStatus struct {
	Filename       string    `json:"filename"`
	Status         string    `json:"status"` // downloading, seeding, completed, error
	Progress       float64   `json:"progress"`
	BytesDownloaded int64    `json:"bytes_downloaded"`
	TotalBytes     int64     `json:"total_bytes"`
	PeersConnected int       `json:"peers_connected"`
	DownloadSpeed  float64   `json:"download_speed"` // Ko/s
	StartedAt      time.Time `json:"started_at"`
	CompletedAt    *time.Time `json:"completed_at,omitempty"`
}

// P2PRequest structure de requête P2P (doit correspondre au serveur)
type P2PRequest struct {
	Action     string `json:"action"`
	Filename   string `json:"filename"`
	ChunkIndex int    `json:"chunk_index"`
}

// P2PResponse structure de réponse P2P
type P2PResponse struct {
	Status      string `json:"status"`
	ChunkData   []byte `json:"chunk_data,omitempty"`
	ChunkIndex  int    `json:"chunk_index"`
	TotalChunks int    `json:"total_chunks"`
	Error       string `json:"error,omitempty"`
}

// Video représente une vidéo (copié du serveur)
type Video struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Filename    string    `json:"filename"`
	Thumbnail   string    `json:"thumbnail"`
	Duration    int       `json:"duration"`
	Size        int64     `json:"size"`
	Creator     string    `json:"creator"`
	UploadedAt  time.Time `json:"uploaded_at"`
}

// ============================================
// DAEMON PRINCIPAL
// ============================================

type Daemon struct {
	p2pHost          host.Host
	downloads        map[string]*DownloadStatus
	downloadsLock    sync.RWMutex
	serverPeerID     peer.ID
	serverMultiAddr  multiaddr.Multiaddr
	downloadQueue    chan string
	activeSeeders    map[string]bool
	seedersLock      sync.RWMutex
}

func NewDaemon() *Daemon {
	return &Daemon{
		downloads:     make(map[string]*DownloadStatus),
		downloadQueue: make(chan string, MaxConcurrentDL),
		activeSeeders: make(map[string]bool),
	}
}

// ============================================
// INITIALISATION
// ============================================

func (d *Daemon) Initialize() error {
	// Créer le dossier cache
	if err := os.MkdirAll(CacheDir, 0755); err != nil {
		return fmt.Errorf("impossible de créer %s: %w", CacheDir, err)
	}

	// Initialiser le nœud P2P
	if err := d.initP2PNode(); err != nil {
		return fmt.Errorf("erreur P2P: %w", err)
	}

	// Se connecter au serveur
	if err := d.connectToServer(); err != nil {
		return fmt.Errorf("erreur connexion serveur: %w", err)
	}

	// Démarrer les workers de téléchargement
	d.startDownloadWorkers()

	// Démarrer le seeding des fichiers existants
	go d.seedExistingFiles()

	log.Println("✅ Daemon initialisé avec succès")
	return nil
}

// initP2PNode crée le nœud libp2p local
func (d *Daemon) initP2PNode() error {
	ctx := context.Background()

	listenAddr := fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", P2PListenPort)
	addr, err := multiaddr.NewMultiaddr(listenAddr)
	if err != nil {
		return err
	}

	// Créer le host
	h, err := libp2p.New(
		libp2p.ListenAddrs(addr),
		libp2p.EnableRelay(),
	)
	if err != nil {
		return err
	}

	d.p2pHost = h

	// Configurer le handler pour les requêtes entrantes (quand on seede)
	h.SetStreamHandler(protocol.ID(P2PProtocolID), d.handleIncomingP2PRequest)

	log.Printf("🌐 Nœud P2P client démarré")
	log.Printf("   ID: %s", h.ID())
	log.Printf("   Port: %d", P2PListenPort)

	return nil
}

// connectToServer établit la connexion au serveur central
func (d *Daemon) connectToServer() error {
	// Parser l'adresse du serveur
	serverAddr, err := multiaddr.NewMultiaddr(ServerP2PAddr)
	if err != nil {
		return err
	}

	// Extraire le peer ID depuis l'adresse complète
	// Note: En production, on récupérerait le peer ID via l'API HTTP
	// Pour simplifier, on se connecte et libp2p gère l'identification
	addrInfo, err := peer.AddrInfoFromP2pAddr(serverAddr)
	if err != nil {
		// Si l'adresse n'a pas de peer ID, on essaie de se connecter quand même
		log.Printf("⚠️ Pas de peer ID dans l'adresse, tentative de connexion directe...")
	} else {
		d.serverPeerID = addrInfo.ID
		
		// Se connecter
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := d.p2pHost.Connect(ctx, *addrInfo); err != nil {
			return fmt.Errorf("connexion au serveur échouée: %w", err)
		}

		log.Printf("✅ Connecté au serveur P2P: %s", d.serverPeerID)
	}

	return nil
}

// ============================================
// TÉLÉCHARGEMENT P2P
// ============================================

// DownloadAndSeed télécharge un fichier et commence à le seeder
func (d *Daemon) DownloadAndSeed(filename string) error {
	// Vérifier si déjà en cache
	cachedPath := filepath.Join(CacheDir, filename)
	if _, err := os.Stat(cachedPath); err == nil {
		log.Printf("✅ Fichier déjà en cache: %s", filename)
		d.startSeeding(filename)
		return nil
	}

	// Créer le statut de téléchargement
	d.downloadsLock.Lock()
	d.downloads[filename] = &DownloadStatus{
		Filename:       filename,
		Status:         "downloading",
		Progress:       0,
		PeersConnected: 1,
		StartedAt:      time.Now(),
	}
	d.downloadsLock.Unlock()

	// Ajouter à la queue
	d.downloadQueue <- filename

	return nil
}

// startDownloadWorkers démarre les workers pour télécharger
func (d *Daemon) startDownloadWorkers() {
	for i := 0; i < MaxConcurrentDL; i++ {
		go d.downloadWorker()
	}
}

// downloadWorker traite les téléchargements en queue
func (d *Daemon) downloadWorker() {
	for filename := range d.downloadQueue {
		if err := d.performDownload(filename); err != nil {
			log.Printf("❌ Erreur téléchargement %s: %v", filename, err)
			d.updateDownloadStatus(filename, "error", 0)
		} else {
			log.Printf("✅ Téléchargement terminé: %s", filename)
			d.updateDownloadStatus(filename, "completed", 100)
			d.startSeeding(filename)
		}
	}
}

// performDownload effectue le téléchargement réel via P2P
func (d *Daemon) performDownload(filename string) error {
	log.Printf("📥 Début du téléchargement P2P: %s", filename)

	// Ouvrir une connexion stream vers le serveur
	ctx := context.Background()
	stream, err := d.p2pHost.NewStream(ctx, d.serverPeerID, protocol.ID(P2PProtocolID))
	if err != nil {
		return fmt.Errorf("impossible d'ouvrir le stream: %w", err)
	}
	defer stream.Close()

	// Créer le fichier de destination
	destPath := filepath.Join(CacheDir, filename)
	destFile, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer destFile.Close()

	// Télécharger chunk par chunk
	chunkIndex := 0
	totalChunks := 0
	startTime := time.Now()

	for {
		// Envoyer la requête pour le chunk
		request := P2PRequest{
			Action:     "request_file",
			Filename:   filename,
			ChunkIndex: chunkIndex,
		}

		encoder := json.NewEncoder(stream)
		if err := encoder.Encode(request); err != nil {
			return fmt.Errorf("erreur envoi requête chunk %d: %w", chunkIndex, err)
		}

		// Lire la réponse
		decoder := json.NewDecoder(stream)
		var response P2PResponse
		if err := decoder.Decode(&response); err != nil {
			return fmt.Errorf("erreur lecture réponse chunk %d: %w", chunkIndex, err)
		}

		// Vérifier le statut
		if response.Status == "error" {
			return fmt.Errorf("erreur serveur: %s", response.Error)
		}

		// Mémoriser le nombre total de chunks
		if totalChunks == 0 {
			totalChunks = response.TotalChunks
		}

		// Écrire les données
		if _, err := destFile.Write(response.ChunkData); err != nil {
			return fmt.Errorf("erreur écriture chunk %d: %w", chunkIndex, err)
		}

		// Mettre à jour le progrès
		progress := float64(chunkIndex+1) / float64(totalChunks) * 100
		bytesDownloaded := int64(chunkIndex+1) * ChunkSize
		elapsed := time.Since(startTime).Seconds()
		speed := float64(bytesDownloaded) / 1024 / elapsed // Ko/s

		d.downloadsLock.Lock()
		if status, exists := d.downloads[filename]; exists {
			status.Progress = progress
			status.BytesDownloaded = bytesDownloaded
			status.TotalBytes = int64(totalChunks) * ChunkSize
			status.DownloadSpeed = speed
		}
		d.downloadsLock.Unlock()

		log.Printf("   Chunk %d/%d (%.1f%%) - %.2f Ko/s", 
			chunkIndex+1, totalChunks, progress, speed)

		// Dernier chunk ?
		chunkIndex++
		if chunkIndex >= totalChunks {
			break
		}

		// Rouvrir le stream pour le prochain chunk
		stream.Close()
		stream, err = d.p2pHost.NewStream(ctx, d.serverPeerID, protocol.ID(P2PProtocolID))
		if err != nil {
			return fmt.Errorf("impossible de rouvrir le stream: %w", err)
		}
		defer stream.Close()
	}

	return nil
}

// updateDownloadStatus met à jour le statut
func (d *Daemon) updateDownloadStatus(filename, status string, progress float64) {
	d.downloadsLock.Lock()
	defer d.downloadsLock.Unlock()

	if ds, exists := d.downloads[filename]; exists {
		ds.Status = status
		ds.Progress = progress
		if status == "completed" {
			now := time.Now()
			ds.CompletedAt = &now
		}
	}
}

// ============================================
// SEEDING
// ============================================

// startSeeding commence à seeder un fichier
func (d *Daemon) startSeeding(filename string) {
	d.seedersLock.Lock()
	d.activeSeeders[filename] = true
	d.seedersLock.Unlock()

	d.updateDownloadStatus(filename, "seeding", 100)
	log.Printf("🌱 Début du seeding: %s", filename)
}

// seedExistingFiles seede tous les fichiers déjà en cache
func (d *Daemon) seedExistingFiles() {
	files, err := os.ReadDir(CacheDir)
	if err != nil {
		log.Printf("⚠️ Impossible de lire le cache: %v", err)
		return
	}

	for _, file := range files {
		if !file.IsDir() {
			d.startSeeding(file.Name())
		}
	}

	log.Printf("🌱 Seeding de %d fichiers existants", len(files))
}

// handleIncomingP2PRequest gère les requêtes P2P entrantes (quand on seede)
func (d *Daemon) handleIncomingP2PRequest(stream network.Stream) {
	defer stream.Close()

	// Lire la requête
	decoder := json.NewDecoder(stream)
	var req P2PRequest
	if err := decoder.Decode(&req); err != nil {
		log.Printf("❌ Erreur décodage requête P2P: %v", err)
		return
	}

	// Vérifier qu'on possède le fichier
	d.seedersLock.RLock()
	isSeeding := d.activeSeeders[req.Filename]
	d.seedersLock.RUnlock()

	if !isSeeding {
		d.sendP2PError(stream, "file_not_available")
		return
	}

	// Envoyer le chunk demandé
	d.sendFileChunk(stream, req)
}

// sendFileChunk envoie un chunk de fichier
func (d *Daemon) sendFileChunk(stream network.Stream, req P2PRequest) {
	filePath := filepath.Join(CacheDir, filepath.Base(req.Filename))

	fileInfo, err := os.Stat(filePath)
	if err != nil {
		d.sendP2PError(stream, "file_not_found")
		return
	}

	totalChunks := int(fileInfo.Size()/ChunkSize) + 1

	file, err := os.Open(filePath)
	if err != nil {
		d.sendP2PError(stream, "read_error")
		return
	}
	defer file.Close()

	// Se positionner au bon chunk
	offset := int64(req.ChunkIndex) * ChunkSize
	file.Seek(offset, 0)

	// Lire le chunk
	chunkData := make([]byte, ChunkSize)
	n, _ := file.Read(chunkData)

	// Envoyer la réponse
	response := P2PResponse{
		Status:      "success",
		ChunkData:   chunkData[:n],
		ChunkIndex:  req.ChunkIndex,
		TotalChunks: totalChunks,
	}

	json.NewEncoder(stream).Encode(response)
	log.Printf("📤 Chunk %d/%d envoyé pour %s", req.ChunkIndex+1, totalChunks, req.Filename)
}

// sendP2PError envoie une erreur P2P
func (d *Daemon) sendP2PError(stream network.Stream, errMsg string) {
	response := P2PResponse{
		Status: "error",
		Error:  errMsg,
	}
	json.NewEncoder(stream).Encode(response)
}

// ============================================
// API HTTP LOCALE
// ============================================

// handleDownloadRequest démarre un téléchargement
func (d *Daemon) handleDownloadRequest(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Filename string `json:"filename"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if err := d.DownloadAndSeed(req.Filename); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "started",
		"message": "Téléchargement démarré",
	})
}

// handleStatusRequest renvoie le statut des téléchargements
func (d *Daemon) handleStatusRequest(w http.ResponseWriter, r *http.Request) {
	d.downloadsLock.RLock()
	defer d.downloadsLock.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(d.downloads)
}

// handleStreamRequest sert un fichier en cache
func (d *Daemon) handleStreamRequest(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	filename := vars["filename"]

	filePath := filepath.Join(CacheDir, filepath.Base(filename))

	// Vérifier l'existence
	if _, err := os.Stat(filePath); err != nil {
		http.Error(w, "File not in cache", http.StatusNotFound)
		return
	}

	// Servir le fichier
	http.ServeFile(w, r, filePath)
}

// handleStatsRequest renvoie les statistiques P2P
func (d *Daemon) handleStatsRequest(w http.ResponseWriter, r *http.Request) {
	d.seedersLock.RLock()
	seedingCount := len(d.activeSeeders)
	d.seedersLock.RUnlock()

	d.downloadsLock.RLock()
	downloadingCount := 0
	for _, status := range d.downloads {
		if status.Status == "downloading" {
			downloadingCount++
		}
	}
	d.downloadsLock.RUnlock()

	stats := map[string]interface{}{
		"peer_id":          d.p2pHost.ID().String(),
		"connected_peers":  len(d.p2pHost.Network().Peers()),
		"seeding_files":    seedingCount,
		"downloading_files": downloadingCount,
		"cache_files":      seedingCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// ============================================
// MAIN
// ============================================

func main() {
	log.Println("🚀 Démarrage du pip bin Go Client Daemon...")

	daemon := NewDaemon()
	if err := daemon.Initialize(); err != nil {
		log.Fatalf("❌ Erreur initialisation: %v", err)
	}

	// Configurer le routeur
	router := mux.NewRouter()

	// Routes API
	router.HandleFunc("/download", daemon.handleDownloadRequest).Methods("POST")
	router.HandleFunc("/status", daemon.handleStatusRequest).Methods("GET")
	router.HandleFunc("/stats", daemon.handleStatsRequest).Methods("GET")
	router.HandleFunc("/stream/{filename}", daemon.handleStreamRequest).Methods("GET")
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// CORS
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	log.Printf("🌐 API locale démarrée sur http://localhost%s", LocalAPIPort)
	log.Printf("🔗 Nœud P2P actif sur le port %d", P2PListenPort)
	log.Println("📡 Prêt à télécharger et seeder des vidéos!")

	if err := http.ListenAndServe(LocalAPIPort, corsHandler.Handler(router)); err != nil {
		log.Fatalf("❌ Erreur serveur HTTP: %v", err)
	}
}
