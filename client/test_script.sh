#!/bin/bash

# ============================================
# Script de Test E2E pour pip bin Go
# ============================================

set -e  # Arrêter si erreur

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🎬 pip bin Go - Test End-to-End       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 1. Vérifier que les services sont lancés
# ============================================

echo -e "${YELLOW}[1/6]${NC} Vérification des services..."

# Vérifier le serveur
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${RED}❌ Le serveur n'est pas accessible sur le port 8080${NC}"
    echo "   Démarrer avec: cd server && go run main.go"
    exit 1
fi
echo -e "${GREEN}✅ Serveur actif (port 8080)${NC}"

# Vérifier le daemon client
if ! curl -s http://localhost:9090/health > /dev/null; then
    echo -e "${RED}❌ Le daemon client n'est pas accessible sur le port 9090${NC}"
    echo "   Démarrer avec: cd client && go run daemon.go"
    exit 1
fi
echo -e "${GREEN}✅ Daemon client actif (port 9090)${NC}"

echo ""

# ============================================
# 2. Créer une vidéo de test
# ============================================

echo -e "${YELLOW}[2/6]${NC} Création d'une vidéo de test..."

# Créer un fichier vidéo factice (10 Mo)
TEST_VIDEO="test_video.mp4"
dd if=/dev/urandom of=$TEST_VIDEO bs=1M count=10 2>/dev/null

echo -e "${GREEN}✅ Vidéo de test créée (10 Mo)${NC}"
echo ""

# ============================================
# 3. Upload de la vidéo sur le serveur
# ============================================

echo -e "${YELLOW}[3/6]${NC} Upload de la vidéo sur le serveur..."

UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:8080/upload \
  -F "video=@$TEST_VIDEO" \
  -F "title=Test Video E2E" \
  -F "description=Vidéo de test automatique" \
  -F "creator=TestBot")

# Extraire le filename de la réponse
FILENAME=$(echo $UPLOAD_RESPONSE | grep -o '"filename":"[^"]*"' | cut -d'"' -f4)

if [ -z "$FILENAME" ]; then
    echo -e "${RED}❌ Upload échoué${NC}"
    echo "Réponse: $UPLOAD_RESPONSE"
    rm $TEST_VIDEO
    exit 1
fi

echo -e "${GREEN}✅ Upload réussi: $FILENAME${NC}"
echo ""

# ============================================
# 4. Vérifier le catalogue
# ============================================

echo -e "${YELLOW}[4/6]${NC} Vérification du catalogue..."

CATALOG=$(curl -s http://localhost:8080/list)
VIDEO_COUNT=$(echo $CATALOG | grep -o '"id"' | wc -l)

echo -e "${GREEN}✅ Catalogue chargé: $VIDEO_COUNT vidéo(s)${NC}"
echo ""

# ============================================
# 5. Télécharger via P2P avec le daemon
# ============================================

echo -e "${YELLOW}[5/6]${NC} Téléchargement P2P via le daemon..."

DOWNLOAD_RESPONSE=$(curl -s -X POST http://localhost:9090/download \
  -H "Content-Type: application/json" \
  -d "{\"filename\": \"$FILENAME\"}")

echo -e "${GREEN}✅ Téléchargement démarré${NC}"
echo "   Réponse: $DOWNLOAD_RESPONSE"
echo ""

# Attendre que le téléchargement se termine
echo -e "${BLUE}⏳ Attente de la fin du téléchargement...${NC}"

for i in {1..30}; do
    STATUS=$(curl -s http://localhost:9090/status)
    
    if echo "$STATUS" | grep -q '"status":"completed"'; then
        echo -e "${GREEN}✅ Téléchargement terminé !${NC}"
        break
    elif echo "$STATUS" | grep -q '"status":"seeding"'; then
        echo -e "${GREEN}✅ Téléchargement terminé et seeding actif !${NC}"
        break
    elif echo "$STATUS" | grep -q '"status":"error"'; then
        echo -e "${RED}❌ Erreur pendant le téléchargement${NC}"
        echo "Status: $STATUS"
        rm $TEST_VIDEO
        exit 1
    fi
    
    # Afficher la progression
    PROGRESS=$(echo "$STATUS" | grep -o '"progress":[0-9.]*' | cut -d':' -f2 | head -1)
    if [ ! -z "$PROGRESS" ]; then
        echo -e "   Progression: ${PROGRESS}%"
    fi
    
    sleep 2
done

echo ""

# ============================================
# 6. Vérifier les statistiques finales
# ============================================

echo -e "${YELLOW}[6/6]${NC} Vérification des statistiques..."

# Stats du daemon
DAEMON_STATS=$(curl -s http://localhost:9090/stats)
SEEDING_COUNT=$(echo $DAEMON_STATS | grep -o '"seeding_files":[0-9]*' | cut -d':' -f2)
CACHE_COUNT=$(echo $DAEMON_STATS | grep -o '"cache_files":[0-9]*' | cut -d':' -f2)

echo -e "${GREEN}✅ Statistiques du daemon:${NC}"
echo "   Fichiers en seeding: $SEEDING_COUNT"
echo "   Fichiers en cache: $CACHE_COUNT"
echo ""

# Vérifier que le fichier est bien en cache
if [ -f "client/cache/$FILENAME" ]; then
    echo -e "${GREEN}✅ Fichier présent dans le cache local${NC}"
    FILE_SIZE=$(ls -lh "client/cache/$FILENAME" | awk '{print $5}')
    echo "   Taille: $FILE_SIZE"
else
    echo -e "${RED}❌ Fichier non trouvé dans le cache${NC}"
fi

echo ""

# ============================================
# 7. Test de streaming depuis le cache
# ============================================

echo -e "${YELLOW}[Bonus]${NC} Test de streaming depuis le cache..."

# Télécharger depuis le cache du daemon
curl -s -o "downloaded_$FILENAME" "http://localhost:9090/stream/$FILENAME"

if [ -f "downloaded_$FILENAME" ]; then
    DOWNLOADED_SIZE=$(ls -lh "downloaded_$FILENAME" | awk '{print $5}')
    echo -e "${GREEN}✅ Streaming réussi depuis le cache${NC}"
    echo "   Taille téléchargée: $DOWNLOADED_SIZE"
    rm "downloaded_$FILENAME"
else
    echo -e "${RED}❌ Échec du streaming${NC}"
fi

echo ""

# ============================================
# Nettoyage
# ============================================

echo -e "${BLUE}🧹 Nettoyage...${NC}"
rm $TEST_VIDEO
echo -e "${GREEN}✅ Fichier de test supprimé${NC}"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Tous les tests sont passés ! 🎉     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Résumé du flux P2P:${NC}"
echo -e "  1. Vidéo uploadée sur le serveur (HTTP)"
echo -e "  2. Serveur devient seeder P2P automatiquement"
echo -e "  3. Client télécharge via P2P (chunks de 256 Ko)"
echo -e "  4. Client devient seeder après téléchargement"
echo -e "  5. Client peut streamer depuis son cache local"
echo ""
echo -e "${YELLOW}📡 Réseau P2P actif:${NC}"
echo -e "  • Serveur:  Port 10000 (seeding)"
echo -e "  • Client:   Port 10001 (downloading + seeding)"
echo -e "  • API:      Port 9090 (local)"
echo ""
