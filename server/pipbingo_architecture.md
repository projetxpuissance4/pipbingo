# 🎬 pip bin Go - Architecture Complète

## 📂 Structure des Fichiers

```
pipbingo/
│
├── server/                          # Backend Central (Go)
│   ├── main.go                      # Point d'entrée serveur
│   ├── handlers/
│   │   ├── upload.go               # Gestion upload vidéos
│   │   ├── catalog.go              # API catalogue
│   │   └── health.go               # Health check
│   ├── p2p/
│   │   ├── node.go                 # Nœud libp2p
│   │   ├── protocol.go             # Protocole custom /pipbingo/
│   │   └── seeder.go               # Logique de seeding
│   ├── models/
│   │   └── video.go                # Structures de données
│   ├── storage/
│   │   └── manager.go              # Gestion fichiers
│   ├── uploads/                    # Stockage vidéos
│   └── go.mod
│
├── client/                          # Client P2P Local (Go)
│   ├── daemon.go                   # Daemon principal
│   ├── api/
│   │   ├── server.go               # API locale (port 9090)
│   │   └── handlers.go             # Endpoints locaux
│   ├── p2p/
│   │   ├── downloader.go           # Téléchargement P2P
│   │   ├── seeder.go               # Seeding local
│   │   └── peer_manager.go         # Gestion des peers
│   ├── cache/                      # Cache vidéos téléchargées
│   └── go.mod
│
├── frontend/                        # Interface React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Navigation Netflix-style
│   │   │   ├── HeroHeader.jsx      # Bannière vedette
│   │   │   ├── VideoGrid.jsx       # Grille vidéos
│   │   │   ├── VideoCard.jsx       # Carte vidéo individuelle
│   │   │   ├── VideoPlayer.jsx     # Lecteur custom
│   │   │   ├── P2POverlay.jsx      # Indicateur P2P
│   │   │   ├── UploadZone.jsx      # Zone d'upload
│   │   │   └── Sidebar.jsx         # Navigation latérale
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Page d'accueil
│   │   │   ├── Watch.jsx           # Page lecture vidéo
│   │   │   ├── Upload.jsx          # Page upload créateur
│   │   │   └── Profile.jsx         # Profil utilisateur
│   │   ├── hooks/
│   │   │   ├── useP2PStatus.js     # Hook statut P2P
│   │   │   └── useVideoStream.js   # Hook streaming
│   │   ├── services/
│   │   │   ├── api.js              # Client API backend
│   │   │   └── p2p.js              # Client API daemon local
│   │   ├── styles/
│   │   │   └── globals.css         # Styles Tailwind custom
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   │   └── assets/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── shared/                          # Code partagé
│   └── protocol/
│       └── messages.go             # Structures P2P communes
│
├── docker-compose.yml              # Orchestration
├── README.md
└── .env.example

```

## 🎨 Palette de Couleurs (Tailwind Custom)

```javascript
// tailwind.config.js
colors: {
  'pipbin-dark': '#0f0f0f',      // Fond principal
  'pipbin-surface': '#1a1a1a',   // Surfaces secondaires
  'pipbin-purple': '#a855f7',    // Neon Purple (accent)
  'pipbin-blue': '#3b82f6',      // Electric Blue (accent)
  'pipbin-hover': '#2a2a2a',     // Hover states
}
```

## 🔌 Ports & Endpoints

| Service            | Port  | Description                    |
|--------------------|-------|--------------------------------|
| Backend HTTP       | 8080  | API REST principale            |
| Backend P2P        | 10000 | Nœud libp2p serveur           |
| Client Daemon API  | 9090  | API locale client             |
| Client P2P         | 10001 | Nœud libp2p client            |
| Frontend Dev       | 5173  | Vite dev server               |

## 🌊 Flux de Données

### Upload Vidéo
```
Créateur → Frontend → POST /upload (8080) → Server stocke → Server seede (P2P 10000)
```

### Visionnage Vidéo
```
1. User demande vidéo → Frontend récupère metadata (API 8080)
2. Frontend → Daemon Local (9090) → Daemon télécharge via P2P
3. Daemon (10001) se connecte au Server (10000) + autres peers
4. Téléchargement hybride → Daemon devient seeder
5. Frontend lit le fichier local via Daemon API
```

## 🚀 Protocole P2P Custom

**Protocole:** `/pipbingo/get/1.0.0`

**Message Request:**
```json
{
  "action": "request_file",
  "filename": "video_abc123.mp4",
  "chunk_index": 0
}
```

**Message Response:**
```json
{
  "status": "success",
  "chunk_data": "<base64_encoded_bytes>",
  "chunk_index": 0,
  "total_chunks": 45
}
```

## 📦 Dépendances Principales

### Backend (Go)
- `github.com/libp2p/go-libp2p` - Stack P2P
- `github.com/gorilla/mux` - Routing HTTP
- `github.com/rs/cors` - CORS middleware

### Frontend (React)
- `react` + `react-dom` - Core
- `tailwindcss` - Styling
- `framer-motion` - Animations
- `lucide-react` - Icônes
- `axios` - HTTP client
- `video.js` - Player vidéo

## 🔐 Sécurité & Limites

- ✅ Limite fichier: 300 Mo (10 min max)
- ✅ Validation MIME type (video/*)
- ✅ Sanitization noms fichiers
- ✅ Rate limiting uploads
- ⚠️ Authentification basique (à améliorer prod)

---

**Next Step:** Génération du code Backend (ÉTAPE A)
