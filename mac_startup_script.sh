#!/bin/bash

# ============================================
# Script de démarrage pip bin Go pour macOS
# Double-cliquez sur ce fichier pour lancer l'app !
# ============================================

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║     🎬 pip bin Go - Démarrage Auto      ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Trouver le dossier du projet
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${YELLOW}📁 Dossier du projet : $PROJECT_DIR${NC}"
echo ""

# ============================================
# 1. Vérifier Go
# ============================================
echo -e "${BLUE}[1/5] Vérification de Go...${NC}"

if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go n'est pas installé !${NC}"
    echo ""
    echo "📥 Pour installer Go sur Mac :"
    echo "   1. Ouvrir Safari et aller sur : https://go.dev/dl/"
    echo "   2. Télécharger 'go1.21.X.darwin-amd64.pkg'"
    echo "   3. Double-cliquer sur le fichier téléchargé"
    echo "   4. Suivre l'assistant d'installation"
    echo ""
    echo "Appuyez sur ENTRÉE pour fermer..."
    read
    exit 1
fi

GO_VERSION=$(go version)
echo -e "${GREEN}✅ Go installé : $GO_VERSION${NC}"
echo ""

# ============================================
# 2. Vérifier Node.js
# ============================================
echo -e "${BLUE}[2/5] Vérification de Node.js...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé !${NC}"
    echo ""
    echo "📥 Pour installer Node.js sur Mac :"
    echo "   1. Ouvrir Safari et aller sur : https://nodejs.org/"
    echo "   2. Télécharger la version LTS (recommandée)"
    echo "   3. Double-cliquer sur le fichier .pkg téléchargé"
    echo "   4. Suivre l'assistant d'installation"
    echo ""
    echo "Appuyez sur ENTRÉE pour fermer..."
    read
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js installé : $NODE_VERSION${NC}"
echo ""

# ============================================
# 3. Installer les dépendances (première fois)
# ============================================
echo -e "${BLUE}[3/5] Installation des dépendances...${NC}"

# Backend Go
if [ ! -d "server/vendor" ] && [ ! -f "server/go.sum" ]; then
    echo "📦 Installation dépendances backend..."
    cd server
    go mod download
    cd ..
fi

# Client Go
if [ ! -d "client/vendor" ] && [ ! -f "client/go.sum" ]; then
    echo "📦 Installation dépendances client..."
    cd client
    go mod download
    cd ..
fi

# Frontend npm
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installation dépendances frontend (peut prendre 2-3 min)..."
    cd frontend
    npm install
    cd ..
fi

echo -e "${GREEN}✅ Toutes les dépendances sont installées${NC}"
echo ""

# ============================================
# 4. Créer les dossiers nécessaires
# ============================================
echo -e "${BLUE}[4/5] Création des dossiers...${NC}"

mkdir -p server/uploads server/thumbnails
mkdir -p client/cache

echo -e "${GREEN}✅ Dossiers créés${NC}"
echo ""

# ============================================
# 5. Lancer les 3 services
# ============================================
echo -e "${BLUE}[5/5] Démarrage des services...${NC}"
echo ""

# Fichier pour stocker les PIDs
PID_FILE="$PROJECT_DIR/.pipbingo_pids"
rm -f "$PID_FILE"

# Fonction pour tuer les processus à la fermeture
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Arrêt de pip bin Go...${NC}"
    
    if [ -f "$PID_FILE" ]; then
        while read pid; do
            kill "$pid" 2>/dev/null
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    echo -e "${GREEN}✅ Tous les services sont arrêtés${NC}"
    exit 0
}

trap cleanup EXIT INT TERM

# Lancer le serveur backend
echo -e "${GREEN}🚀 Démarrage du serveur backend (port 8080)...${NC}"
cd server
go run main.go > "$PROJECT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> "$PID_FILE"
cd ..

# Attendre que le backend démarre
sleep 3

# Lancer le daemon client
echo -e "${GREEN}🚀 Démarrage du daemon P2P (port 9090)...${NC}"
cd client
go run daemon.go > "$PROJECT_DIR/client.log" 2>&1 &
CLIENT_PID=$!
echo $CLIENT_PID >> "$PID_FILE"
cd ..

# Attendre que le daemon démarre
sleep 3

# Lancer le frontend
echo -e "${GREEN}🚀 Démarrage du frontend (port 5173)...${NC}"
cd frontend
npm run dev > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> "$PID_FILE"
cd ..

# Attendre que tout démarre
sleep 5

# ============================================
# Afficher le résumé
# ============================================
clear
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ pip bin Go est DÉMARRÉ !            ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}📡 Services actifs :${NC}"
echo -e "   ${GREEN}✅ Backend${NC}      → http://localhost:8080"
echo -e "   ${GREEN}✅ Daemon P2P${NC}   → http://localhost:9090"
echo -e "   ${GREEN}✅ Frontend${NC}     → http://localhost:5173"
echo ""
echo -e "${YELLOW}🌐 Ouvre ton navigateur et va sur :${NC}"
echo -e "   ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}📋 Pour voir les logs :${NC}"
echo "   - backend.log"
echo "   - client.log"
echo "   - frontend.log"
echo ""
echo -e "${RED}⚠️  Pour ARRÊTER l'application :${NC}"
echo "   Appuie sur ${YELLOW}Ctrl+C${NC} dans cette fenêtre"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Ouvrir automatiquement le navigateur
sleep 2
open http://localhost:5173

# Garder le script actif
echo -e "${BLUE}Attente... (Ctrl+C pour arrêter)${NC}"
echo ""

# Afficher les logs en temps réel
tail -f frontend.log
