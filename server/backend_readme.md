# 🎬 pip bin Go - Backend Central (ÉTAPE A)

## ✅ Ce qui a été implémenté

### 🌐 Serveur HTTP (Port 8080)
- ✅ **POST /upload** - Upload de vidéos (multipart/form-data)
- ✅ **GET /list** - Récupération du catalogue JSON
- ✅ **GET /peer-info** - Informations sur le nœud P2P
- ✅ **GET /health** - Health check
- ✅ Serveur de fichiers statiques pour `/uploads` et `/thumbnails`

### 🔗 Nœud P2P libp2p (Port 10000)
- ✅ Protocole custom: `/pipbingo/get/1.0.0`
- ✅ Seeding automatique de tous les fichiers du dossier `./uploads`
- ✅ Gestion des requêtes par chunks (256 Ko)
- ✅ Support du relay pour traverser les NAT

### 🔐 Sécurité
- ✅ Limite de taille fichier: 300 Mo
- ✅ Validation MIME type (video/*)
- ✅ Sanitization des noms de fichiers
- ✅ CORS configuré pour tous les origins

## 🚀 Installation et Démarrage

### 1️⃣ Installer Go (si non installé)
```bash
# Télécharger depuis https://go.dev/dl/
# Ou via package manager:
# Ubuntu/Debian:
sudo apt install golang-go

# macOS:
brew install go
```

### 2️⃣ Initialiser le projet
```bash
# Créer la structure
mkdir -p pipbingo/server
cd pipbingo/server

# Copier main.go et go.mod (depuis les artifacts)
# Puis initialiser les dépendances:
go mod download
```

### 3️⃣ Démarrer le serveur
```bash
go run main.go
```

**Sortie attendue:**
```
🎬 Démarrage de pip bin Go Server...
✅ Serveur initialisé avec succès
🌐 Nœud P2P démarré
   ID: 12D3KooWAbcDefGhIjKlMnOpQrStUvWxYz...
   Addrs: [/ip4/127.0.0.1/tcp/10000 /ip4/192.168.1.100/tcp/10000]
📚 Catalogue chargé: 0 vidéos
🚀 Serveur HTTP démarré sur http://localhost:8080
🌐 Nœud P2P actif sur le port 10000
📡 Prêt à recevoir des uploads et à seeder des vidéos!
```

## 🧪 Tester le Backend

### Test 1: Health Check
```bash
curl http://localhost:8080/health
# Réponse: OK
```

### Test 2: Infos P2P
```bash
curl http://localhost:8080/peer-info
```
**Réponse JSON:**
```json
{
  "peer_id": "12D3KooW...",
  "addrs": ["/ip4/127.0.0.1/tcp/10000"],
  "peers": 0
}
```

### Test 3: Lister le catalogue (vide au départ)
```bash
curl http://localhost:8080/list
# Réponse: []
```

### Test 4: Upload d'une vidéo
```bash
curl -X POST http://localhost:8080/upload \
  -F "video=@/chemin/vers/video.mp4" \
  -F "title=Ma Première Vidéo" \
  -F "description=Test de la plateforme" \
  -F "creator=Alice"
```

**Réponse JSON:**
```json
{
  "id": "1234567890123456789",
  "title": "Ma Première Vidéo",
  "description": "Test de la plateforme",
  "filename": "video_1234567890.mp4",
  "thumbnail": "/thumbnails/default.jpg",
  "duration": 0,
  "size": 15728640,
  "creator": "Alice",
  "uploaded_at": "2025-11-21T10:30:00Z"
}
```

### Test 5: Vérifier le catalogue après upload
```bash
curl http://localhost:8080/list
```
**Réponse:**
```json
[
  {
    "id": "1234567890123456789",
    "title": "Ma Première Vidéo",
    "filename": "video_1234567890.mp4",
    ...
  }
]
```

### Test 6: Accéder à la vidéo via HTTP
```bash
# Ouvrir dans le navigateur:
http://localhost:8080/uploads/video_1234567890.mp4

# Ou télécharger:
curl -o test.mp4 http://localhost:8080/uploads/video_1234567890.mp4
```

## 🔍 Architecture P2P Expliquée

### Comment fonctionne le seeding ?

1. **Upload** : Quand une vidéo est uploadée, elle est stockée dans `./uploads/`
2. **Auto-seeding** : Le nœud P2P libp2p reste actif et écoute sur le port 10000
3. **Protocole custom** : Autres peers peuvent demander des fichiers via `/pipbingo/get/1.0.0`
4. **Transfert par chunks** : Les fichiers sont envoyés en morceaux de 256 Ko

### Exemple de flux P2P

```
Client Daemon                         Server
      |                                  |
      |--- Connexion P2P (10000) ------->|
      |                                  |
      |--- Request: video_123.mp4 ------>|
      |    (chunk_index: 0)              |
      |                                  |
      |<-- Response: chunk_data ---------|
      |    (256 Ko, chunk 1/45)          |
      |                                  |
      |--- Request: chunk 1 ------------>|
      |                                  |
      |<-- Response: chunk_data ---------|
      |                                  |
      ... (répété jusqu'au dernier chunk)
```

## 📂 Structure des fichiers générés

```
server/
├── main.go              ✅ Code principal
├── go.mod              ✅ Dépendances
├── go.sum              ⚙️ Généré automatiquement
├── uploads/            📁 Vidéos uploadées (auto-créé)
└── thumbnails/         📁 Miniatures (auto-créé)
```

## 🐛 Résolution de problèmes

### Erreur: "address already in use"
```bash
# Tuer le processus sur le port 8080:
lsof -ti:8080 | xargs kill -9

# Ou changer le port dans main.go:
const HTTPPort = ":8081"
```

### Erreur: "permission denied" sur les uploads
```bash
chmod 755 uploads thumbnails
```

### Les vidéos ne s'affichent pas
- Vérifier que le fichier est bien dans `./uploads/`
- Vérifier les permissions: `ls -l uploads/`
- Tester l'accès direct: `http://localhost:8080/uploads/<nom_fichier>`

## ⏭️ Prochaine Étape

**ÉTAPE B:** Développement du Client Daemon P2P (Go)
- Daemon local (port 9090)
- Téléchargement P2P depuis le serveur
- Seeding automatique après téléchargement
- API REST locale pour le frontend

---

**Note:** Ce backend est maintenant **100% fonctionnel** et prêt à seeder des vidéos via P2P ! 🚀
